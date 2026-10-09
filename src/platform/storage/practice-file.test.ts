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
const flat={id:'flat',layerId:'paint',tool:'brush' as const,seed:3,brush:{brushId:'flat-wash' as const,brushVersion:1,color:'#D9B65D',size:120,water:.8,pigment:.3,opacity:.4},samples:[{x:.1,y:.2,pressure:.5,tiltX:0,tiltY:0,elapsedMs:0},{x:.9,y:.2,pressure:.5,tiltX:0,tiltY:0,elapsedMs:80}]}
test('flat wash strokes round-trip with the wide size range while unknown brushes are rejected',()=>{
  const session={...practice(),strokes:[flat],historyCursor:1}
  expect(parsePracticeFile(serializePractice(session))).toEqual(session)
  expect(validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,size:2}}]}).strokes[0].brush.size).toBe(2)
  expect(()=>validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,size:121}}]})).toThrow()
  expect(validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,brushVersion:2}}]}).strokes[0].brush.brushVersion).toBe(2)
  expect(()=>validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,brushVersion:3}}]})).toThrow()
  expect(()=>validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,brushId:'nope'}}]})).toThrow()
  expect(()=>validatePractice({...session,strokes:[{...flat,brush:{...flat.brush,brushId:'watercolor-round',size:121}}]})).toThrow()
})
test('re-authored guide steps restart at the first step while keeping strokes; another guide still fails',()=>{
  const session={...practice(),strokes:[flat],historyCursor:1}
  const guide=session.guide!,later=defaultGuide(readyScenes[0]).steps[1].id
  const first={id:guide.id,version:guide.version,currentStepId:guide.currentStepId}
  const newer=validatePractice({...session,guide:{...guide,version:guide.version+1,currentStepId:later}})
  expect(newer.guide).toEqual(first)
  expect(newer.strokes).toEqual([flat])
  expect(newer.historyCursor).toBe(1)
  expect(validatePractice({...session,guide:{...guide,currentStepId:'retired-step'}}).guide).toEqual(first)
  expect(validatePractice({...session,guide:{...guide,currentStepId:later}}).guide).toEqual({...first,currentStepId:later})
  expect(()=>validatePractice({...session,guide:{...guide,id:'another-guide'}})).toThrow()
  expect(()=>validatePractice({...session,guide:undefined})).toThrow()
})
test('mixed legacy and pressure-enhanced strokes round-trip without upgrading old artwork',()=>{
  const session=practice()
  const stroke={id:'legacy',layerId:'paint',tool:'brush' as const,seed:1,brush:{brushId:'watercolor-round' as const,brushVersion:1,color:'#627755',size:18,water:.7,pigment:.5,opacity:.6},samples:[{x:.5,y:.5,pressure:.4,tiltX:0,tiltY:0,elapsedMs:0}]}
  // v3 is the eraser that follows strength and pressure; older erasers keep their version and fixed wipe.
  const mixed={...session,strokes:[stroke,{...stroke,id:'enhanced',brush:{...stroke.brush,brushVersion:2}},{...stroke,id:'lift',tool:'eraser' as const,brush:{...stroke.brush,brushVersion:3}}],historyCursor:1}
  const restored=parsePracticeFile(serializePractice(mixed))
  expect(restored).toEqual(mixed)
  expect(restored.strokes.map(stroke=>stroke.brush.brushVersion)).toEqual([1,2,3])
  expect(()=>validatePractice({...mixed,strokes:[{...stroke,brush:{...stroke.brush,brushVersion:4}}]})).toThrow()
})
test('wash ids round-trip on flat brush strokes and are refused elsewhere or malformed',()=>{
  const wet={...flat,washId:'wash-1'},second={...flat,id:'flat-2',washId:'wash-1'}
  const session={...practice(),strokes:[wet,second,{...flat,id:'flat-3'}],historyCursor:3}
  const restored=parsePracticeFile(serializePractice(session))
  expect(restored).toEqual(session)
  expect(restored.strokes.map(stroke=>stroke.washId)).toEqual(['wash-1','wash-1',undefined])
  expect('washId' in restored.strokes[2]).toBe(false)
  expect(validatePractice({...session,strokes:[{...wet,washId:'a'.repeat(128)}],historyCursor:1}).strokes[0].washId).toBe('a'.repeat(128))
  expect(()=>validatePractice({...session,strokes:[{...wet,tool:'eraser'}],historyCursor:1})).toThrow()
  expect(()=>validatePractice({...session,strokes:[{...wet,brush:{...wet.brush,brushId:'watercolor-round',brushVersion:2}}],historyCursor:1})).toThrow()
  for(const washId of ['','wash 1','wash/1',1,null,{},'a'.repeat(129)])expect(()=>validatePractice({...session,strokes:[{...wet,washId}],historyCursor:1})).toThrow()
})
