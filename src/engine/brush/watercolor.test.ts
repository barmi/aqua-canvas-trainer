import { createCanvas } from '@napi-rs/canvas'
import { expect, test } from 'vitest'
import type { PaintStroke } from '../../domain/painting'
import { paintStroke } from './watercolor'

const stroke: PaintStroke = {id:'a',layerId:'paint',tool:'brush',seed:42,brush:{brushId:'watercolor-round',brushVersion:1,color:'#627755',size:30,opacity:.7,water:.7,pigment:.6},samples:[{x:.2,y:.5,pressure:.6,tiltX:0,tiltY:0,elapsedMs:0},{x:.8,y:.5,pressure:.7,tiltX:20,tiltY:0,elapsedMs:100}]}
test('replay restores identical pixels and eraser reduces paint alpha', () => {
  const first=createCanvas(300,228), second=createCanvas(300,228)
  paintStroke(first.getContext('2d') as unknown as CanvasRenderingContext2D,stroke)
  paintStroke(second.getContext('2d') as unknown as CanvasRenderingContext2D,JSON.parse(JSON.stringify(stroke)))
  expect(first.toBuffer('image/png')).toEqual(second.toBuffer('image/png'))
  const before=first.getContext('2d').getImageData(150,114,1,1).data[3]
  expect(before).toBeGreaterThan(0)
  paintStroke(first.getContext('2d') as unknown as CanvasRenderingContext2D,{...stroke,tool:'eraser'})
  expect(first.getContext('2d').getImageData(150,114,1,1).data[3]).toBeLessThan(before)
})
