import { createCanvas } from '@napi-rs/canvas'
import { afterEach, expect, test, vi } from 'vitest'
import type { PaintStroke } from '../../domain/painting'
import { WatercolorRenderer } from './WatercolorRenderer'

afterEach(()=>vi.unstubAllGlobals())
const stroke:PaintStroke={id:'first',layerId:'paint',tool:'brush',seed:42,brush:{brushId:'watercolor-round',brushVersion:1,color:'#D6B65E',size:30,opacity:.7,water:.7,pigment:.6},samples:[{x:.2,y:.5,pressure:.6,tiltX:0,tiltY:0,elapsedMs:0},{x:.8,y:.5,pressure:.7,tiltX:20,tiltY:0,elapsedMs:100}]}
function harness(){
  let frames:FrameRequestCallback[]=[]
  vi.stubGlobal('document',{createElement:()=>createCanvas(300,228)})
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length})
  vi.stubGlobal('cancelAnimationFrame',vi.fn())
  const canvas=createCanvas(300,228)
  const renderer=new WatercolorRenderer(canvas as unknown as HTMLCanvasElement)
  const flush=()=>{const pending=frames;frames=[];pending.forEach(callback=>callback(0))}
  return {canvas,renderer,flush}
}
test('overlapping wet stroke has identical pixels before and after committing',()=>{
  const {canvas,renderer,flush}=harness()
  const second={...stroke,id:'second',seed:103,brush:{...stroke.brush,color:'#70788F'}}
  renderer.setHistory({strokes:[stroke],cursor:1});flush()
  renderer.showStroke(second);flush()
  const preview=canvas.toBuffer('image/png')
  renderer.setHistory({strokes:[stroke,second],cursor:2});flush()
  expect(canvas.toBuffer('image/png').equals(preview)).toBe(true)
  renderer.destroy()
})
test('cancelled eraser preview preserves the committed painting',()=>{
  const {canvas,renderer,flush}=harness()
  renderer.setHistory({strokes:[stroke],cursor:1});flush()
  const committed=canvas.toBuffer('image/png')
  renderer.showStroke({...stroke,id:'eraser',tool:'eraser'});flush()
  expect(canvas.toBuffer('image/png').equals(committed)).toBe(false)
  renderer.showStroke(null);flush()
  expect(canvas.toBuffer('image/png').equals(committed)).toBe(true)
  renderer.destroy()
})
