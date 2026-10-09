import { afterEach, expect, test, vi } from 'vitest'
import { attachPaintingInput } from './painting-input'
import type { PaintTool } from './painting-input'
import type { PaintStroke } from '../../domain/painting'

afterEach(() => vi.unstubAllGlobals())
function harness() {
  vi.stubGlobal('window',new EventTarget()); vi.stubGlobal('document',new EventTarget())
  const captured = new Set<number>()
  const stage = Object.assign(new EventTarget(), {
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
    getBoundingClientRect: () => ({left:0,top:0,width:1000,height:760}),
  }) as unknown as HTMLElement
  const canvas = {getBoundingClientRect:()=>({left:0,top:0,right:1000,bottom:760,width:1000,height:760})} as HTMLCanvasElement
  const complete = vi.fn<(stroke: PaintStroke)=>void>(), viewport = vi.fn()
  const settings = {brush:{brushId:'watercolor-round' as PaintStroke['brush']['brushId'],brushVersion:1,color:'#aabbcc',size:18,water:.7,pigment:.5,opacity:.6},tool:'brush' as PaintTool,viewport:{scale:1,x:0,y:0},washId:undefined as string|undefined}
  const detach = attachPaintingInput(stage,canvas,{settings:()=>settings,complete,preview:vi.fn(),viewport})
  const emit = (type: string, id: number, pointerType='pen', x=300) => {
    const event = new Event(type,{cancelable:true})
    Object.assign(event,{pointerId:id,pointerType,clientX:x,clientY:300,button:0,pressure:.6,tiltX:20,tiltY:0})
    stage.dispatchEvent(event)
  }
  return {emit,complete,viewport,settings,detach}
}
test('finger and palm contacts never create strokes', () => {
  const h=harness();h.emit('pointerdown',1,'touch');h.emit('pointermove',1,'touch',500);h.emit('pointerup',1,'touch')
  expect(h.complete).not.toHaveBeenCalled();h.detach()
})
test('captures pen settings and completes cancellation exactly once', () => {
  const h=harness();h.emit('pointerdown',1);h.settings.brush.color='#000000';h.emit('pointermove',1,'pen',500)
  h.emit('pointercancel',1);h.emit('lostpointercapture',1)
  expect(h.complete).toHaveBeenCalledTimes(1)
  expect(h.complete.mock.calls[0][0].brush.color).toBe('#aabbcc')
  expect(h.complete.mock.calls[0][0].samples).toHaveLength(2);h.detach()
})
test('two fingers zoom but contacts during a pen stroke cannot move the paper', () => {
  const h=harness();h.emit('pointerdown',1,'touch',200);h.emit('pointerdown',2,'touch',400);h.emit('pointermove',2,'touch',600)
  expect(h.viewport.mock.calls[0][0].scale).toBe(2)
  h.viewport.mockClear();h.emit('pointerdown',3);h.emit('pointerdown',4,'touch');h.emit('pointermove',4,'touch',800)
  expect(h.viewport).not.toHaveBeenCalled();h.detach()
})
test('the wash id is copied only onto flat-wash brush strokes', () => {
  const h=harness()
  const washOf=(index:number)=>h.complete.mock.calls[index][0].washId
  h.settings.washId='wash-1'
  h.emit('pointerdown',1);h.emit('pointerup',1)
  expect(washOf(0)).toBeUndefined()
  expect('washId' in h.complete.mock.calls[0][0]).toBe(false)
  h.settings.brush.brushId='flat-wash'
  h.emit('pointerdown',2);h.emit('pointerup',2)
  expect(washOf(1)).toBe('wash-1')
  h.settings.tool='eraser'
  h.emit('pointerdown',3);h.emit('pointerup',3)
  expect(washOf(2)).toBeUndefined()
  h.settings.tool='brush';h.settings.washId=undefined
  h.emit('pointerdown',4);h.emit('pointerup',4)
  expect(washOf(3)).toBeUndefined()
  expect(h.complete).toHaveBeenCalledTimes(4);h.detach()
})
