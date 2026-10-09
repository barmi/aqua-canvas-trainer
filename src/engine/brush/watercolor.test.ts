import { createCanvas, loadImage } from '@napi-rs/canvas'
import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import type { PaintStroke } from '../../domain/painting'
import { paintStroke, pressureResponse } from './watercolor'

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
  // Keep the mean bound tight so width/pigment changes still fail the fixture.
  expect.soft(maximum).toBeLessThanOrEqual(8)
  expect.soft(total/actual.length).toBeLessThan(.1)
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
