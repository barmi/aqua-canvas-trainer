import { createCanvas, loadImage } from '@napi-rs/canvas'
import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import type { PaintStroke } from '../../domain/painting'
import { flatWashPasses, flatWashProfile, paintStroke, pressureResponse } from './watercolor'

const stroke: PaintStroke = {id:'a',layerId:'paint',tool:'brush',seed:42,brush:{brushId:'watercolor-round',brushVersion:1,color:'#627755',size:30,opacity:.7,water:.7,pigment:.6},samples:[{x:.2,y:.5,pressure:.6,tiltX:0,tiltY:0,elapsedMs:0},{x:.8,y:.5,pressure:.7,tiltX:20,tiltY:0,elapsedMs:100}]}
test('replay preserves the legacy appearance and eraser reduces paint alpha', async () => {
  const first=createCanvas(300,228), second=createCanvas(300,228)
  paintStroke(first.getContext('2d') as unknown as CanvasRenderingContext2D,stroke)
  paintStroke(second.getContext('2d') as unknown as CanvasRenderingContext2D,JSON.parse(JSON.stringify(stroke)))
  expect(first.toBuffer('image/png')).toEqual(second.toBuffer('image/png'))
  // Captured before v2. Native raster rounding differs across OS/CPU targets;
  // compare premultiplied colors so near-transparent pixels do not amplify it.
  const reference=createCanvas(300,228)
  reference.getContext('2d').drawImage(await loadImage(await readFile(new URL('./fixtures/watercolor-v1.png',import.meta.url))),0,0)
  const expected=reference.getContext('2d').getImageData(0,0,300,228).data
  const actual=first.getContext('2d').getImageData(0,0,300,228).data
  let maximum=0,total=0
  for(let i=0;i<actual.length;i++){
    const alpha=i-i%4+3
    const delta=Math.abs(i%4===3?actual[i]-expected[i]:(actual[i]*actual[alpha]-expected[i]*expected[alpha])/255)
    maximum=Math.max(maximum,delta);total+=delta
  }
  // Linux/macOS antialiasing differs by up to 7 at isolated edge pixels.
  // Hosted Linux measured mean error .219 on the 0-255 scale; v2 differs by 1.87.
  // Keep both bounds so real width/pigment changes still fail the fixture.
  expect.soft(maximum).toBeLessThanOrEqual(8)
  expect.soft(total/actual.length).toBeLessThan(.3)
  const before=first.getContext('2d').getImageData(150,114,1,1).data[3]
  expect(before).toBeGreaterThan(0)
  paintStroke(first.getContext('2d') as unknown as CanvasRenderingContext2D,{...stroke,tool:'eraser'})
  expect(first.getContext('2d').getImageData(150,114,1,1).data[3]).toBeLessThan(before)
})

function pressureMark(pressure: number, version = 2) {
  const canvas = createCanvas(300, 228)
  const ctx = canvas.getContext('2d')
  paintStroke(ctx as unknown as CanvasRenderingContext2D, {
    ...stroke, brush: {...stroke.brush, brushVersion: version},
    samples: [{...stroke.samples[0], x: .5, y: .5, pressure}],
  })
  const pixels = ctx.getImageData(0, 0, 300, 228).data
  let left = 300, right = 0
  for (let y = 0; y < 228; y++) for (let x = 0; x < 300; x++) {
    if (pixels[(y * 300 + x) * 4 + 3] >= 3) { left = Math.min(left, x); right = Math.max(right, x) }
  }
  return {canvas, width: right-left+1, alpha: ctx.getImageData(150, 114, 1, 1).data[3]}
}
test('new brush makes light and firm pressure clearly different in width and pigment', () => {
  const light = pressureMark(.2), firm = pressureMark(.8)
  expect(firm.width).toBeGreaterThan(light.width * 3)
  expect(firm.alpha).toBeGreaterThan(light.alpha * 2)
  expect(pressureMark(.6).width).toBeGreaterThan(pressureMark(.4).width * 1.5)
})
test('neutral pressure preserves the mouse and unsupported-pen appearance', () => {
  expect(pressureMark(.55).canvas.toBuffer('image/png').equals(pressureMark(.55, 1).canvas.toBuffer('image/png'))).toBe(true)
})
test('new pressure response replays the same pixels after serialization', () => {
  const updated = {...stroke, brush: {...stroke.brush, brushVersion: 2}}
  const first = createCanvas(300, 228), second = createCanvas(300, 228)
  paintStroke(first.getContext('2d') as unknown as CanvasRenderingContext2D, updated)
  paintStroke(second.getContext('2d') as unknown as CanvasRenderingContext2D, JSON.parse(JSON.stringify(updated)))
  expect(first.toBuffer('image/png').equals(second.toBuffer('image/png'))).toBe(true)
})
// Flat wash on a 300x228 canvas: a straight run along y=60, a loop down the right side, and a
// straight return that crosses the run at (130,60). Pixel coordinates are normalized below.
const flatPixels=[[30,60],[90,60],[150,60],[210,60],[262,80],[272,125],[235,168],[180,115],[130,60],[100,27]]
const flatStroke:PaintStroke={id:'flat',layerId:'paint',tool:'brush',seed:7,brush:{brushId:'flat-wash',brushVersion:1,color:'#D9B65D',size:40,opacity:.5,water:.5,pigment:.4},samples:flatPixels.map(([x,y],i)=>({x:x/300,y:y/228,pressure:.3+(i%3)*.3,tiltX:0,tiltY:0,elapsedMs:i*20}))}
function paintFlat(stroke:PaintStroke){
  const canvas=createCanvas(300,228),ctx=canvas.getContext('2d')
  paintStroke(ctx as unknown as CanvasRenderingContext2D,stroke)
  return {canvas,ctx,alpha:(x:number,y:number)=>ctx.getImageData(x,y,1,1).data[3]}
}
test('flat wash covers a self-crossing stroke uniformly with a soft edge',()=>{
  const {alpha}=paintFlat(flatStroke)
  // Centre-line points: the run, the crossing, and the midpoints the smoothed path passes through.
  const interior=[[60,60],[90,60],[120,60],[150,60],[180,60],[130,60],[267,102],[253,146],[207,141],[155,87]].map(([x,y])=>alpha(x,y))
  expect(Math.min(...interior)).toBeGreaterThan(0)
  expect(Math.max(...interior)-Math.min(...interior)).toBeLessThanOrEqual(2)
  expect(alpha(130,60)).toBe(alpha(90,60))
  // Interior alpha is calibrated to opacity * (.55 + pigment * .45) = .365 for this preset;
  // eight 8-bit passes land within a few levels of it (measured 90 of 93).
  const profile=flatWashProfile(flatStroke.brush)
  expect(profile.interior).toBeCloseTo(.365)
  expect(profile.passes).toHaveLength(flatWashPasses)
  expect(Math.abs(alpha(90,60)-Math.round(profile.interior*255))).toBeLessThanOrEqual(5)
  // Edge profile across the run at x=60 (half width 20): a smooth feather that never steps back,
  // reaches the interior inside the core (size * (1 - edge) / 2) and is clear just outside the width.
  const coreHalf=flatStroke.brush.size*(1-profile.edge)/2
  const column=Array.from({length:23},(_,i)=>alpha(60,38+i))
  for(let i=1;i<column.length;i++)expect(column[i]).toBeGreaterThanOrEqual(column[i-1])
  expect(alpha(60,38)).toBe(0)
  const feather=alpha(60,42)
  expect(feather).toBeGreaterThan(0)
  expect(feather).toBeLessThan(alpha(60,60)*.6)
  expect(Math.abs(alpha(60,60-Math.floor(coreHalf))-alpha(60,60))).toBeLessThanOrEqual(2)
})
test('flat wash ignores pressure, replays identically after serialization, and erases',()=>{
  const first=paintFlat(flatStroke),second=paintFlat(JSON.parse(JSON.stringify(flatStroke)))
  expect(first.canvas.toBuffer('image/png').equals(second.canvas.toBuffer('image/png'))).toBe(true)
  const firm=paintFlat({...flatStroke,samples:flatStroke.samples.map(sample=>({...sample,pressure:1}))})
  expect(firm.canvas.toBuffer('image/png').equals(first.canvas.toBuffer('image/png'))).toBe(true)
  const before=first.alpha(90,60)
  paintStroke(first.ctx as unknown as CanvasRenderingContext2D,{...flatStroke,id:'erase',tool:'eraser'})
  expect(first.alpha(90,60)).toBeLessThan(before)
  expect(first.alpha(130,60)).toBeLessThan(before)
})
test('a single flat sample paints a round dot of the brush width',()=>{
  const {alpha}=paintFlat({...flatStroke,samples:[{...flatStroke.samples[0],x:.5,y:.5}]})
  expect(Math.abs(alpha(150,114)-Math.round(flatWashProfile(flatStroke.brush).interior*255))).toBeLessThanOrEqual(5)
  let left=300,right=0
  for(let x=0;x<300;x++)if(alpha(x,114)>0){left=Math.min(left,x);right=Math.max(right,x)}
  expect(right-left+1).toBeGreaterThanOrEqual(38)
  expect(right-left+1).toBeLessThanOrEqual(42)
  expect(alpha(150,114)).toBeGreaterThan(alpha(150,95))
})
test('pressure response changes smoothly across the entire input range', () => {
  let previous = pressureResponse(0)
  for (let i = 1; i <= 100; i++) {
    const next = pressureResponse(i / 100)
    expect(next.radiusScale).toBeGreaterThan(previous.radiusScale)
    expect(next.opacityScale).toBeGreaterThan(previous.opacityScale)
    expect(next.radiusScale - previous.radiusScale).toBeLessThan(.025)
    expect(next.opacityScale - previous.opacityScale).toBeLessThan(.025)
    previous = next
  }
})
