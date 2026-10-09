import { createCanvas } from '@napi-rs/canvas'
import type { Canvas } from '@napi-rs/canvas'
import { afterEach, expect, test, vi } from 'vitest'
import type { PaintStroke } from '../../domain/painting'
import { WatercolorRenderer } from './WatercolorRenderer'
import { paintStrokes } from '../brush/watercolor'

afterEach(()=>vi.unstubAllGlobals())
const stroke:PaintStroke={id:'first',layerId:'paint',tool:'brush',seed:42,brush:{brushId:'watercolor-round',brushVersion:1,color:'#D6B65E',size:30,opacity:.7,water:.7,pigment:.6},samples:[{x:.2,y:.5,pressure:.6,tiltX:0,tiltY:0,elapsedMs:0},{x:.8,y:.5,pressure:.7,tiltX:20,tiltY:0,elapsedMs:100}]}
function harness(){
  let frames:FrameRequestCallback[]=[]
  const createElement=vi.fn(()=>createCanvas(300,228))
  vi.stubGlobal('document',{createElement})
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length})
  vi.stubGlobal('cancelAnimationFrame',vi.fn())
  const canvas=createCanvas(300,228)
  const renderer=new WatercolorRenderer(canvas as unknown as HTMLCanvasElement)
  const flush=()=>{const pending=frames;frames=[];pending.forEach(callback=>callback(0))}
  return {canvas,renderer,flush,createElement}
}
const brushes:{brushId:PaintStroke['brush']['brushId'];brushVersion:number}[]=[{brushId:'watercolor-round',brushVersion:1},{brushId:'watercolor-round',brushVersion:2},{brushId:'flat-wash',brushVersion:1}]
test.each(brushes)('$brushId v$brushVersion overlapping stroke has identical pixels before and after committing',brush=>{
  const {canvas,renderer,flush}=harness()
  const second={...stroke,id:'second',seed:103,brush:{...stroke.brush,...brush,color:'#70788F'}}
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
// Wet wash strokes: width 40 runs along y=80, 104 and 128 with the same wash id; cores overlap around y=92 and y=116.
const run=(id:string,y:number,washId?:string):PaintStroke=>({...stroke,id,seed:0,brush:{...stroke.brush,brushId:'flat-wash',brushVersion:1,color:'#D9B65D',size:40,opacity:.5,water:.5,pigment:.4},samples:[40,150,260].map((x,i)=>({x:x/300,y:y/228,pressure:.5,tiltX:0,tiltY:0,elapsedMs:i*20})),...(washId===undefined?{}:{washId})})
const wetA=run('wet-a',80,'wash-1'),wetB=run('wet-b',104,'wash-1'),wetC=run('wet-c',128,'wash-1')
const fresh=(strokes:readonly PaintStroke[])=>{const canvas=createCanvas(300,228);paintStrokes(canvas.getContext('2d') as unknown as CanvasRenderingContext2D,strokes);return canvas.toBuffer('image/png')}
const alphaAt=(canvas:Canvas,x:number,y:number)=>canvas.getContext('2d').getImageData(x,y,1,1).data[3]
/** A round stroke near the bottom edge (y≈180–228), clear of the runs, so density readings stay unaffected. */
const dot:PaintStroke={...stroke,id:'dot',samples:[{...stroke.samples[0],x:.5,y:.9}]}
test('a stroke continuing the wet wash previews exactly as it commits and keeps one density',()=>{
  const {canvas,renderer,flush}=harness()
  renderer.setHistory({strokes:[dot,wetA],cursor:2});flush()
  renderer.showStroke(wetB);flush()
  const preview=canvas.toBuffer('image/png')
  expect(Math.abs(alphaAt(canvas,150,92)-alphaAt(canvas,150,72))).toBeLessThanOrEqual(1)
  renderer.setHistory({strokes:[dot,wetA,wetB],cursor:3});flush()
  expect(canvas.toBuffer('image/png').equals(preview)).toBe(true)
  expect(canvas.toBuffer('image/png').equals(fresh([dot,wetA,wetB]))).toBe(true)
  renderer.destroy()
})
test('a wet stroke starting a new wash previews exactly as it commits, after a round stroke and after another wash',()=>{
  const {canvas,renderer,flush}=harness()
  renderer.setHistory({strokes:[dot],cursor:1});flush()
  renderer.showStroke(wetA);flush()
  const first=canvas.toBuffer('image/png')
  renderer.setHistory({strokes:[dot,wetA],cursor:2});flush()
  expect(canvas.toBuffer('image/png').equals(first)).toBe(true)
  const other={...wetB,washId:'wash-2'}
  renderer.showStroke(other);flush()
  const second=canvas.toBuffer('image/png')
  // Another wash multiplies over the first, so the overlap darkens like dried paint.
  expect(alphaAt(canvas,150,92)).toBeGreaterThan(alphaAt(canvas,150,72)+20)
  renderer.setHistory({strokes:[dot,wetA,other],cursor:3});flush()
  expect(canvas.toBuffer('image/png').equals(second)).toBe(true)
  expect(canvas.toBuffer('image/png').equals(fresh([dot,wetA,other]))).toBe(true)
  renderer.destroy()
})
test('undo inside a wet wash and redo reproduce a fresh render',()=>{
  const {canvas,renderer,flush}=harness()
  const strokes=[dot,wetA,wetB,wetC]
  renderer.setHistory({strokes,cursor:4});flush()
  expect(canvas.toBuffer('image/png').equals(fresh(strokes))).toBe(true)
  renderer.setHistory({strokes,cursor:3});flush()
  expect(canvas.toBuffer('image/png').equals(fresh(strokes.slice(0,3)))).toBe(true)
  renderer.setHistory({strokes,cursor:2});flush()
  expect(canvas.toBuffer('image/png').equals(fresh(strokes.slice(0,2)))).toBe(true)
  renderer.setHistory({strokes,cursor:4});flush()
  expect(canvas.toBuffer('image/png').equals(fresh(strokes))).toBe(true)
  renderer.setHistory({strokes,cursor:1});flush()
  expect(canvas.toBuffer('image/png').equals(fresh(strokes.slice(0,1)))).toBe(true)
  renderer.destroy()
})
test('rebuilding a history of many wash groups reuses one layer instead of allocating a canvas per group',()=>{
  const {canvas,renderer,flush,createElement}=harness()
  // Thirty consecutive washes with different ids: thirty groups, each baked through paintStrokes on a rebuild.
  const groups=Array.from({length:30},(_,i)=>run(`group-${i}`,20+i*6,`wash-${i}`))
  renderer.setHistory({strokes:groups,cursor:groups.length});flush()
  createElement.mockClear()
  // Undo one stroke is not an append, so the whole history replays; iOS Safari caps total canvas memory, so this must not allocate.
  renderer.setHistory({strokes:groups,cursor:groups.length-1});flush()
  expect(createElement.mock.calls.length).toBeLessThanOrEqual(1)
  expect(canvas.toBuffer('image/png').equals(fresh(groups.slice(0,-1)))).toBe(true)
  renderer.setHistory({strokes:groups,cursor:groups.length});flush()
  expect(createElement.mock.calls.length).toBeLessThanOrEqual(1)
  expect(canvas.toBuffer('image/png').equals(fresh(groups))).toBe(true)
  renderer.destroy()
})
test('baking an open wash under a round stroke and a later wash equals a fresh render',()=>{
  const {canvas,renderer,flush}=harness()
  const later={...wetC,washId:'wash-2'}
  const steps=[[wetA],[wetA,wetB],[wetA,wetB,stroke],[wetA,wetB,stroke,later],[wetA,wetB,stroke,later,{...stroke,id:'eraser',tool:'eraser' as const}]]
  // Walks the append path (open wash → continue → bake under a round stroke → new wash → eraser), each step matching a fresh render.
  for(const strokes of steps){
    renderer.setHistory({strokes,cursor:strokes.length});flush()
    expect(canvas.toBuffer('image/png').equals(fresh(strokes))).toBe(true)
  }
  renderer.destroy()
})
