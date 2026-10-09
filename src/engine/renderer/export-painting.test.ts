import { afterEach, expect, test, vi } from 'vitest'
import { createCanvas, Image as NativeImage } from '@napi-rs/canvas'
import { readFileSync } from 'node:fs'
import { renderPractice } from './export-painting'
import { readyScenes } from '../../content/scenes.catalog'
import { defaultGuide } from '../../content/guides/resolve-guide'
import { createPractice } from '../../features/practice-library/create-practice'

afterEach(()=>vi.unstubAllGlobals())
test('PNG composition keeps paper opaque, uses only active strokes, and never loads guide overlays',async()=>{
  const urls:string[]=[]
  class AssetImage {
    constructor(){
      const image=new NativeImage()
      const descriptor=Object.getOwnPropertyDescriptor(NativeImage.prototype,'src')!
      Object.defineProperty(image,'src',{set(value:string){urls.push(value);descriptor.set!.call(image,readFileSync(`public${value}`))}})
      return image
    }
  }
  vi.stubGlobal('Image',AssetImage)
  vi.stubGlobal('document',{createElement:()=>createCanvas(1000,760)})
  const scene=readyScenes[0],session=createPractice(scene,defaultGuide(scene))
  const paint={id:'a',layerId:'paint',tool:'brush' as const,seed:2,brush:{brushId:'watercolor-round' as const,brushVersion:1,color:'#f00000',size:30,opacity:1,water:.3,pigment:1},samples:[{x:.5,y:.5,pressure:1,tiltX:0,tiltY:0,elapsedMs:0}]}
  const base=await renderPractice(session,scene)
  const undone=await renderPractice({...session,strokes:[paint],historyCursor:0},scene)
  expect(undone.toDataURL()).toBe(base.toDataURL())
  const drawn=await renderPractice({...session,strokes:[paint],historyCursor:1},scene)
  expect(drawn.toDataURL()).not.toBe(base.toDataURL())
  const erased=await renderPractice({...session,strokes:[paint,{...paint,id:'b',tool:'eraser'}],historyCursor:2},scene)
  expect(erased.getContext('2d')!.getImageData(500,380,1,1).data[3]).toBe(255)
  expect(urls.some(url=>url.includes('/guides/'))).toBe(false)
})
test('a wet wash exports at the single-stroke density where its strokes overlap',async()=>{
  class AssetImage {
    constructor(){
      const image=new NativeImage()
      const descriptor=Object.getOwnPropertyDescriptor(NativeImage.prototype,'src')!
      Object.defineProperty(image,'src',{set(value:string){descriptor.set!.call(image,readFileSync(`public${value}`))}})
      return image
    }
  }
  vi.stubGlobal('Image',AssetImage)
  vi.stubGlobal('document',{createElement:()=>createCanvas(1000,760)})
  const scene=readyScenes[0],session={...createPractice(scene,defaultGuide(scene)),baseWashVisible:false}
  // Width 60 runs along y=300 and y=336: cores overlap near y=318; y=288 and y=348 lie inside only one.
  const run=(id:string,y:number,washId?:string)=>({id,layerId:'paint',tool:'brush' as const,seed:0,brush:{brushId:'flat-wash' as const,brushVersion:1,color:'#D9B65D',size:60,opacity:.5,water:.5,pigment:.4},samples:[100,500,900].map((x,i)=>({x:x/1000,y:y/760,pressure:.5,tiltX:0,tiltY:0,elapsedMs:i*20})),...(washId===undefined?{}:{washId})})
  const pixel=(canvas:HTMLCanvasElement,x:number,y:number)=>[...canvas.getContext('2d')!.getImageData(x,y,1,1).data]
  const base=await renderPractice(session,scene)
  const paper=[252,250,243,255]
  // Line art crosses the runs here and there; measure at a column where the paper is bare on all three rows.
  const x=Array.from({length:70},(_,i)=>150+i*10).find(x=>[288,318,348].every(y=>pixel(base,x,y).every((value,i)=>value===paper[i])))!
  expect(x).toBeDefined()
  const wet=await renderPractice({...session,strokes:[run('a',300,'wash-1'),run('b',336,'wash-1')],historyCursor:2},scene)
  const single=pixel(wet,x,288),overlap=pixel(wet,x,318)
  expect(single).not.toEqual(paper)
  for(let i=0;i<3;i++){expect(Math.abs(overlap[i]-single[i])).toBeLessThanOrEqual(1);expect(Math.abs(pixel(wet,x,348)[i]-single[i])).toBeLessThanOrEqual(1)}
  const dried=await renderPractice({...session,strokes:[run('a',300),run('b',336)],historyCursor:2},scene)
  expect(pixel(dried,x,318)[2]).toBeLessThan(pixel(dried,x,288)[2]-10)
})
