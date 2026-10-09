import { expect, test } from 'vitest'
import { canvasPoint, initialViewport, pointerPressure, zoomAt } from './coordinates'

test('normalizes coordinates after CSS zoom and translation', () => {
  expect(canvasPoint({x:500,y:250},{left:100,top:50,width:800,height:400})).toEqual({x:.5,y:.5})
  expect(canvasPoint({x:-20,y:900},{left:100,top:50,width:800,height:400})).toEqual({x:0,y:1})
})
test('keeps the point under the zoom anchor stable', () => {
  const view = {scale:1.5,x:40,y:-20}, anchor = {x:120,y:100}
  const next = zoomAt(view,2,anchor)
  expect((anchor.x-next.x)/next.scale).toBeCloseTo((anchor.x-view.x)/view.scale)
  expect((anchor.y-next.y)/next.scale).toBeCloseTo((anchor.y-view.y)/view.scale)
  expect(zoomAt(initialViewport,100).scale).toBe(4)
})
test('pressure-less devices get a usable fallback and pen pressure is bounded', () => {
  expect(pointerPressure('mouse',0)).toBe(.55)
  expect(pointerPressure('pen',0)).toBe(.55)
  expect(pointerPressure('pen',2)).toBe(1)
  expect(pointerPressure('pen',.2)).toBe(.2)
})
