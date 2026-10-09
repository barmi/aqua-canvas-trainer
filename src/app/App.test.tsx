// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from './App'
import { createPracticeRepository } from '../platform/storage/practice-repository'
import { readyScenes } from '../content/scenes.catalog'
import { defaultGuide } from '../content/guides/resolve-guide'
import { presetBrushVersion } from '../features/painting-workspace/PaintingWorkspace'
import { brushNames } from '../features/guide-panel/GuidePanel'

// Live browser access is separate. This is an isolated component workflow test.
vi.mock('../engine/renderer/WatercolorRenderer',()=>({WatercolorRenderer:class{setHistory(){}showStroke(){}destroy(){}}}))
vi.mock('../engine/renderer/export-painting',()=>({renderPractice:()=>Promise.reject(new Error('No raster assets in DOM test')),canvasBlob:vi.fn(),downloadBlob:vi.fn()}))
vi.mock('../engine/renderer/example-composite',()=>({renderExample:()=>Promise.resolve({toDataURL:()=>'data:image/png;base64,x'})}))
let root:Root|null=null
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=null;document.body.innerHTML='';vi.unstubAllGlobals()})
const click=async(element:Element|null)=>{expect(element).not.toBeNull();await act(async()=>{(element as HTMLElement).click()})}
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
const findButton=(text:string)=>[...document.querySelectorAll('button')].find(button=>button.textContent?.includes(text))??null
const sizeSlider=()=>document.querySelector('input[aria-label="붓 크기"]') as HTMLInputElement
const pressedBrushType=()=>document.querySelector('.brush-type button[aria-pressed="true"]')?.textContent
const pressedTool=()=>document.querySelector('.tool-buttons:not(.brush-type) button[aria-pressed="true"]')?.textContent
const hintColor=()=>(document.querySelector('.guide-overlay') as HTMLElement|null)?.style.backgroundColor
/** jsdom normalises inline hex colours to rgb(); compare through the same normalisation. */
const rgb=(hex:string)=>{const probe=document.createElement('div');probe.style.backgroundColor=hex;return probe.style.backgroundColor}
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
  await settle()
  // Opening a step applies its whole brush preset, and the guide shows the step's example.
  const scene=readyScenes.find(value=>value.title===document.querySelector('.workspace-heading h1')?.textContent)!
  const guide=defaultGuide(scene),steps=guide.steps
  expect(sizeSlider().value).toBe(String(steps[0].suggestedBrush.size))
  expect(pressedBrushType()).toBe(brushNames[steps[0].suggestedBrush.brushId])
  expect(document.querySelector('.brush-applied')).not.toBeNull()
  expect(document.querySelector('.step-example img')?.getAttribute('src')).toBe('data:image/png;base64,x')
  // Panel layout: every step dot keeps its 44px grid cell (no narrowing `many` variant), the auto-brush
  // setting lives with the tools, view settings fold away, and the step actions sit in the sticky footer.
  expect(document.querySelector('.step-dots.many')).toBeNull()
  expect(document.querySelectorAll('.step-dots button')).toHaveLength(steps.length)
  expect(document.querySelector('.tools-panel .auto-brush input[type="checkbox"]')).not.toBeNull()
  expect(document.querySelector('.guide-panel .auto-brush')).toBeNull()
  expect(document.querySelector('.guide-panel .view-options summary')?.textContent).toBe('보기 설정')
  expect(document.querySelector('.guide-panel .step-footer .step-actions .primary-button')).not.toBeNull()
  const stage=document.querySelector('.canvas-stage')!
  await act(async()=>{
    for(const type of ['pointerdown','pointerup']){
      const event=new Event(type,{bubbles:true,cancelable:true})
      Object.assign(event,{pointerId:1,pointerType:'pen',clientX:400,clientY:300,button:0,pressure:.6,tiltX:0,tiltY:0})
      stage.dispatchEvent(event)
    }
  })
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('1번의 붓질')
  await click(document.querySelector('.step-dots button[aria-label^="2단계"]'))
  expect(sizeSlider().value).toBe(String(steps[1].suggestedBrush.size))
  expect(pressedBrushType()).toBe(brushNames[steps[1].suggestedBrush.brushId])
  // The region hint takes each step's own colour; only the highlight overlay is tinted with the light.
  await click(document.querySelector('.step-dots button[aria-label^="5단계"]'))
  expect(hintColor()).toBe(rgb(steps[4].palette[0].color))
  expect(pressedTool()).toBe('붓')
  const light=steps.findIndex(step=>step.overlayUrl?.endsWith('-highlight.svg'))
  expect(light).toBeGreaterThan(0)
  await click(document.querySelector(`.step-dots button[aria-label^="${light+1}단계"]`))
  expect(hintColor()).toBe(rgb(guide.lighting.primary.color))
  // A lifting step opens with the eraser, since the multiply brush cannot lighten anything.
  expect(steps[light].technique).toBe('lifting')
  expect(pressedTool()).toBe('지우개')
  const select=document.querySelector('.lighting-controls select') as HTMLSelectElement
  await act(async()=>{select.value='night';select.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('0번의 붓질')
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,500))})
  const repository=createPracticeRepository()
  const painted=(await repository.list()).find(value=>(value as {strokes:unknown[]}).strokes.length===1) as {strokes:{brush:{brushId:string;brushVersion:number;size:number}}[]}|undefined
  expect(painted?.strokes[0].brush.brushId).toBe(steps[0].suggestedBrush.brushId)
  expect(painted?.strokes[0].brush.brushVersion).toBe(presetBrushVersion(steps[0].suggestedBrush.brushId))
  expect(painted?.strokes[0].brush.size).toBe(steps[0].suggestedBrush.size)
  await act(async()=>root!.unmount());root=null
  document.body.innerHTML=''
  await mount()
  await click(findButton('나의 연습'))
  await click(document.querySelector('.practice-library .scene-card'))
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('1번의 붓질')
},10000)
