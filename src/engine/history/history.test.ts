import { expect, test } from 'vitest'
import type { PaintStroke } from '../../domain/painting'
import { appendStroke, emptyHistory, redo, undo } from './history'
import { strokeDabs } from '../brush/watercolor'

export const fixture: PaintStroke = {id:'a',layerId:'paint',tool:'brush',seed:123,brush:{brushId:'watercolor-round',brushVersion:1,color:'#aabbcc',size:18,opacity:.5,water:.7,pigment:.4},samples:[{x:.1,y:.1,pressure:.3,tiltX:20,tiltY:0,elapsedMs:0},{x:.8,y:.7,pressure:.9,tiltX:40,tiltY:0,elapsedMs:200}]}
test('new strokes after undo discard the redo branch without mutating old history', () => {
  const first = appendStroke(emptyHistory(),fixture)
  const second = appendStroke(first,{...fixture,id:'b'})
  const branched = appendStroke(undo(second),{...fixture,id:'c'})
  expect(branched.strokes.map(s=>s.id)).toEqual(['a','c'])
  expect(second.strokes.map(s=>s.id)).toEqual(['a','b'])
  expect(redo(branched).cursor).toBe(2)
  expect(undo(emptyHistory()).cursor).toBe(0)
})
test('serialized strokes restore identical seeded brush texture', () => {
  const restored = JSON.parse(JSON.stringify(fixture)) as PaintStroke
  expect(strokeDabs(restored,1000,760)).toEqual(strokeDabs(fixture,1000,760))
  expect(strokeDabs({...restored,seed:124},1000,760)).not.toEqual(strokeDabs(fixture,1000,760))
})
test('pen pressure increases dab size', () => {
  const a = strokeDabs({...fixture,samples:[{...fixture.samples[0],pressure:.1}]},1000,760)
  const b = strokeDabs({...fixture,samples:[{...fixture.samples[0],pressure:1}]},1000,760)
  expect(b[0].radius).toBeGreaterThan(a[0].radius*2)
})
