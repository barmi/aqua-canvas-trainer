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
import { presetBrushVersion, wetCountdownMs, wetWashMs } from '../features/painting-workspace/PaintingWorkspace'
import { brushNames } from '../features/guide-panel/GuidePanel'

// Live browser access is separate. This is an isolated component workflow test.
// The stubbed renderer records the history it is handed, which is how the test reads the strokes' wash ids.
const rendered=vi.hoisted(()=>({history:null as null|{strokes:readonly {washId?:string;tool:string;brush:{brushId:string}}[];cursor:number}}))
vi.mock('../engine/renderer/WatercolorRenderer',()=>({WatercolorRenderer:class{setHistory(history:NonNullable<typeof rendered.history>){rendered.history=history}showStroke(){}destroy(){}}}))
vi.mock('../engine/renderer/export-painting',()=>({renderPractice:()=>Promise.reject(new Error('No raster assets in DOM test')),canvasBlob:vi.fn(),downloadBlob:vi.fn()}))
vi.mock('../engine/renderer/example-composite',()=>({renderExample:()=>Promise.resolve({toDataURL:()=>'data:image/png;base64,x'})}))
let root:Root|null=null
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=null;document.body.innerHTML='';vi.unstubAllGlobals();vi.useRealTimers()})
const click=async(element:Element|null)=>{expect(element).not.toBeNull();await act(async()=>{(element as HTMLElement).click()})}
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
const findButton=(text:string)=>[...document.querySelectorAll('button')].find(button=>button.textContent?.includes(text))??null
const sizeSlider=()=>document.querySelector('input[aria-label="붓 크기"]') as HTMLInputElement
const pressedBrushType=()=>document.querySelector('.brush-type button[aria-pressed="true"]')?.textContent
const pressedTool=()=>document.querySelector('.tool-buttons:not(.brush-type) button[aria-pressed="true"]')?.textContent
const toolButton=(text:string)=>[...document.querySelectorAll('.tool-buttons:not(.brush-type) button')].find(button=>button.textContent===text)??null
/** Moves a React-controlled range input the way a pointer would: the native setter, then an input event. */
const setSlider=(input:HTMLInputElement,value:string)=>act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))})
const washIds=()=>rendered.history!.strokes.map(stroke=>stroke.washId)
const wetBadge=()=>document.querySelector('.canvas-column .wet-wash')
const hintColor=()=>(document.querySelector('.guide-overlay') as HTMLElement|null)?.style.backgroundColor
/** jsdom normalises inline hex colours to rgb(); compare through the same normalisation. */
const rgb=(hex:string)=>{const probe=document.createElement('div');probe.style.backgroundColor=hex;return probe.style.backgroundColor}
async function mount(){
  const host=document.createElement('div');document.body.append(host);root=createRoot(host)
  await act(async()=>root!.render(<StrictMode><App/></StrictMode>))
  for(let i=0;i<40&&!document.querySelector('.scene-grid');i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,25))})
  expect(document.querySelector('.scene-grid')).not.toBeNull()
}
function stubPointer(){
  HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1000,bottom:760,width:1000,height:760,toJSON:()=>({})})
  HTMLElement.prototype.setPointerCapture=()=>{}
  HTMLElement.prototype.hasPointerCapture=()=>false
  HTMLElement.prototype.releasePointerCapture=()=>{}
}
/** One pen tap on the stage: a single-sample stroke with the current settings. */
const tap=(stage:Element,x:number)=>act(async()=>{
  for(const type of ['pointerdown','pointerup']){
    const event=new Event(type,{bubbles:true,cancelable:true})
    Object.assign(event,{pointerId:1,pointerType:'pen',clientX:x,clientY:300,button:0,pressure:.6,tiltX:0,tiltY:0})
    stage.dispatchEvent(event)
  }
})
test('draw, change lighting, and remount restores the original practice without losing strokes',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  stubPointer()
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
  // A lifting step opens with the eraser, since the multiply brush cannot lighten anything. Its card says so and
  // shows size and strength only, while the tools panel greys out the sliders the eraser ignores.
  expect(steps[light].technique).toBe('lifting')
  expect(pressedTool()).toBe('지우개')
  expect(document.querySelector('.brush-card-head strong')?.textContent).toBe('지우개')
  expect([...document.querySelectorAll('.brush-specs dt')].map(term=>term.textContent)).toEqual(['크기','세기'])
  expect(document.querySelector('.brush-applied')).not.toBeNull()
  expect([...document.querySelectorAll('.tools-panel .slider-label input')].map(input=>(input as HTMLInputElement).disabled)).toEqual([false,true,true,false])
  expect([...document.querySelectorAll('.tools-panel .slider-label')].map(label=>label.textContent?.slice(0,2))).toEqual(['붓 ','수분','안료','세기'])
  // Picking the brush by hand un-applies the eraser preset; the card offers the eraser back.
  await click(toolButton('붓'))
  expect(document.querySelector('.brush-applied')).toBeNull()
  expect(document.querySelector('.suggested-brush')?.textContent).toBe('지우개로 바꾸기')
  await click(document.querySelector('.suggested-brush'))
  expect(pressedTool()).toBe('지우개')
  expect(document.querySelector('.brush-applied')).not.toBeNull()
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
test('quick flat strokes share one wet wash, badged on the canvas until 말리기 or another brush dries it',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  stubPointer()
  await mount()
  await click(document.querySelector('.scene-card:not(:disabled)'))
  await settle()
  const scene=readyScenes.find(value=>value.title===document.querySelector('.workspace-heading h1')?.textContent)!
  expect(defaultGuide(scene).steps[0].suggestedBrush.brushId).toBe('flat-wash')
  expect(wetBadge()).toBeNull()
  const stage=document.querySelector('.canvas-stage')!
  await tap(stage,300);await tap(stage,340)
  const ids=washIds()
  expect(ids).toHaveLength(2)
  expect(ids[0]).toMatch(/^[a-zA-Z0-9-]+$/)
  expect(ids[1]).toBe(ids[0])
  // The badge sits on the canvas frame, not in the status bar, and shows no countdown until the last seconds.
  const badge=wetBadge()!
  expect(badge.textContent).toContain('젖은 워시 · 겹쳐 칠해도 같은 농도')
  expect(badge.querySelector('output')).toBeNull()
  expect(badge.closest('.canvas-stage')).toBeNull()
  expect(document.querySelector('.canvas-bottom .wet-wash')).toBeNull()
  expect(document.querySelector('.canvas-bottom')?.textContent).toContain('2번의 붓질')
  // 말리기 ends the wash: the badge gives way to a short notice and the next flat stroke starts a new one.
  await click(findButton('말리기'))
  expect(wetBadge()).toBeNull()
  expect(document.querySelector('.wash-dried')?.textContent).toContain('워시가 말랐어요')
  await tap(stage,380)
  const next=washIds()[2]
  expect(next).toMatch(/^[a-zA-Z0-9-]+$/)
  expect(next).not.toBe(ids[0])
  expect(wetBadge()).not.toBeNull()
  expect(document.querySelector('.wash-dried')).toBeNull()
  // Switching to the round brush dries it too, quietly (the beginner did it); round strokes carry no wash id.
  await click(document.querySelector('.brush-type button:not([aria-pressed="true"])'))
  expect(pressedBrushType()).toBe(brushNames['watercolor-round'])
  expect(wetBadge()).toBeNull()
  expect(document.querySelector('.wash-dried')).toBeNull()
  await tap(stage,420)
  expect(washIds()[3]).toBeUndefined()
  expect(wetBadge()).toBeNull()
},10000)
test('the wash dries when its window elapses, on a colour, step or eraser change, but not on a size change',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  stubPointer()
  await mount()
  await click(document.querySelector('.scene-card:not(:disabled)'))
  await settle()
  const stage=document.querySelector('.canvas-stage')!
  // Only the wash clock is faked: React, act() and the store keep their real timers.
  vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']})
  await tap(stage,300)
  const first=washIds()[0]
  expect(first).toMatch(/^[a-zA-Z0-9-]+$/)
  // (a) Expiry: the countdown appears for the last seconds only, then the wash dries with a notice and the next
  // flat stroke gets a new id. The trickiest path, and the one a beginner hits by pausing to read the guide.
  await act(async()=>{vi.advanceTimersByTime(wetWashMs-wetCountdownMs-1500)})
  expect(wetBadge()?.querySelector('output')).toBeNull()
  await act(async()=>{vi.advanceTimersByTime(2000)})
  expect(wetBadge()?.querySelector('output')?.textContent).toMatch(/^(9|10)초$/)
  await act(async()=>{vi.advanceTimersByTime(wetCountdownMs+1000)})
  expect(wetBadge()).toBeNull()
  expect(document.querySelector('.wash-dried')?.textContent).toContain('이제 겹치면 진해져요')
  await tap(stage,320)
  expect(washIds()[1]).not.toBe(first)
  expect(document.querySelector('.wash-dried')).toBeNull()
  // (c) Size alone keeps the wash: the layer's tint and density are unchanged.
  await setSlider(sizeSlider(),'70')
  expect(sizeSlider().value).toBe('70')
  await tap(stage,340)
  expect(washIds()[2]).toBe(washIds()[1])
  expect(wetBadge()).not.toBeNull()
  // (b) Another colour dries it, and the next stroke starts a new wash.
  await click(document.querySelector('.palette .color:not(.selected)'))
  expect(wetBadge()).toBeNull()
  await tap(stage,360)
  expect(washIds()[3]).toMatch(/^[a-zA-Z0-9-]+$/)
  expect(washIds()[3]).not.toBe(washIds()[2])
  // (e) An eraser stroke ends the layer and carries no id; back on the brush the next stroke is a fresh wash.
  await click(toolButton('지우개'))
  await tap(stage,380)
  expect(wetBadge()).toBeNull()
  expect(rendered.history!.strokes[4].tool).toBe('eraser')
  expect(washIds()[4]).toBeUndefined()
  await click(toolButton('붓'))
  await tap(stage,400)
  expect(washIds()[5]).toMatch(/^[a-zA-Z0-9-]+$/)
  expect(washIds()[5]).not.toBe(washIds()[3])
  expect(wetBadge()).not.toBeNull()
  // (d) Opening another step dries it.
  await click(document.querySelector('.step-dots button:nth-child(2)'))
  expect(wetBadge()).toBeNull()
  vi.useRealTimers()
},10000)
