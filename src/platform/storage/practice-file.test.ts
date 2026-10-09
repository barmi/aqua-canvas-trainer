import { expect, test } from 'vitest'
import { readyScenes } from '../../content/scenes.catalog'
import { defaultGuide } from '../../content/guides/resolve-guide'
import { createPractice } from '../../features/practice-library/create-practice'
import { parsePracticeFile, serializePractice, validatePractice } from './practice-file'

const practice=()=>createPractice(readyScenes[0],defaultGuide(readyScenes[0]))
test('project files preserve guide state, renderer version, and undo history',()=>{
  const session=practice();expect(parsePracticeFile(serializePractice(session))).toEqual(session)
})
test('rejects future versions and unsupported lighting without changing the original',()=>{
  const session=practice()
  expect(()=>validatePractice({...session,schemaVersion:2})).toThrow()
  expect(()=>validatePractice({...session,sceneVersion:999})).toThrow()
  expect(()=>validatePractice({...session,lighting:{...session.lighting,primary:{...session.lighting.primary,intensity:99}}})).toThrow()
  expect(()=>parsePracticeFile('{')).toThrow()
  expect(()=>parsePracticeFile(JSON.stringify({version:1,format:'other',session}))).toThrow()
})
test('rejects unbounded coordinates, invalid cursors, and unknown brush versions',()=>{
  const session=practice()
  const stroke={id:'stroke-1',layerId:'paint',tool:'brush',seed:1,brush:{brushId:'watercolor-round',brushVersion:1,color:'#627755',size:18,water:.7,pigment:.5,opacity:.6},samples:[{x:.5,y:.5,pressure:.6,tiltX:0,tiltY:0,elapsedMs:0}]}
  expect(validatePractice({...session,strokes:[stroke],historyCursor:0}).historyCursor).toBe(0)
  expect(()=>validatePractice({...session,historyCursor:1})).toThrow()
  expect(()=>validatePractice({...session,strokes:[{...stroke,samples:[{...stroke.samples[0],x:Infinity}]}]})).toThrow()
  expect(()=>validatePractice({...session,strokes:[{...stroke,brush:{...stroke.brush,brushVersion:999}}]})).toThrow()
})
