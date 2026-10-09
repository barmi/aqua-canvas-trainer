// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from './App'
import { createPracticeRepository } from '../platform/storage/practice-repository'

// Live browser access is separate. This is an isolated component workflow test.
vi.mock('../engine/renderer/WatercolorRenderer',()=>({WatercolorRenderer:class{setHistory(){}showStroke(){}destroy(){}}}))
vi.mock('../engine/renderer/export-painting',()=>({renderPractice:()=>Promise.reject(new Error('No raster assets in DOM test')),canvasBlob:vi.fn(),downloadBlob:vi.fn()}))
let root:Root|null=null
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=null;document.body.innerHTML='';vi.unstubAllGlobals()})
const click=async(element:Element|null)=>{expect(element).not.toBeNull();await act(async()=>{(element as HTMLElement).click()})}
const findButton=(text:string)=>[...document.querySelectorAll('button')].find(button=>button.textContent?.includes(text))??null
async function mount(){
  const host=document.createElement('div');document.body.append(host);root=createRoot(host)
  await act(async()=>root!.render(<StrictMode><App/></StrictMode>))
  for(let i=0;i<40&&!document.querySelector('.scene-grid');i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,25))})
  expect(document.querySelector('.scene-grid')).not.toBeNull()
}
test('draw, change lighting, and remount restores the original practice without losing strokes',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1000,bottom:760,width:1000,height:760,toJSON:()=>({})})
  HTMLElement.prototype.setPointerCapture=()=>{}
  HTMLElement.prototype.hasPointerCapture=()=>false
  HTMLElement.prototype.releasePointerCapture=()=>{}
  await mount()
  expect(document.querySelectorAll('.scene-card:not(:disabled)')).toHaveLength(6)
  await click(document.querySelector('.scene-card:not(:disabled)'))
  const stage=document.querySelector('.canvas-stage')!
  await act(async()=>{
    for(const type of ['pointerdown','pointerup']){
      const event=new Event(type,{bubbles:true,cancelable:true})
      Object.assign(event,{pointerId:1,pointerType:'pen',clientX:400,clientY:300,button:0,pressure:.6,tiltX:0,tiltY:0})
      stage.dispatchEvent(event)
    }
  })
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('1번의 붓질')
  const select=document.querySelector('.lighting-controls select') as HTMLSelectElement
  await act(async()=>{select.value='night';select.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('0번의 붓질')
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,500))})
  const repository=createPracticeRepository()
  expect((await repository.list()).some(value=>(value as {strokes:unknown[]}).strokes.length===1)).toBe(true)
  await act(async()=>root!.unmount());root=null
  document.body.innerHTML=''
  await mount()
  await click(findButton('나의 연습'))
  await click(document.querySelector('.practice-library .scene-card'))
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('1번의 붓질')
},10000)
