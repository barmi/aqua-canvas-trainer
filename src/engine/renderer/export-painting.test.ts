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
