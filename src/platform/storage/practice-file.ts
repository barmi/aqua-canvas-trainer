import type { BrushId, PaintStroke, PracticeSession, StrokeSample } from '../../domain/painting'
import type { LightKind, TimeOfDay } from '../../domain/lighting'
import { readyScenes } from '../../content/scenes.catalog'
import { resolveGuide } from '../../content/guides/resolve-guide'
import { directions, supportedLightKinds, timeLabels } from '../../content/lighting-options'

export const maxProjectBytes = 16 * 1024 * 1024
const fail = (): never => { throw new Error('지원하지 않거나 손상된 연습 파일이에요. 파일 버전과 배경을 확인해주세요.') }
const object = (value: unknown): Record<string,unknown> => {
  if (!value || typeof value!=='object' || Array.isArray(value)) return fail()
  return value as Record<string,unknown>
}
const number = (value: unknown,min:number,max:number,integer=false):number => {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))return fail()
  return value
}
const text = (value: unknown,pattern=/^[a-zA-Z0-9-]+$/,max=128):string => {
  if(typeof value!=='string'||value.length>max||!pattern.test(value))return fail()
  return value
}
const date = (value:unknown) => {const result=text(value,/^[\dT:.Z+-]+$/,64);if(!Number.isFinite(Date.parse(result)))return fail();return result}
/** Brush algorithms a file may reference; each version replays with its original appearance. */
const brushVersions:Record<BrushId,readonly number[]>={'watercolor-round':[1,2,3],'flat-wash':[1,2]}
const brushId=(value:unknown):BrushId=>{
  if(typeof value!=='string'||!Object.hasOwn(brushVersions,value))return fail()
  return value as BrushId
}
export function validatePractice(value:unknown):PracticeSession {
  const data=object(value)
  if(data.schemaVersion!==1||data.rendererVersion!=='watercolor-1')return fail()
  const scene=readyScenes.find(scene=>scene.id===data.sceneId&&scene.version===data.sceneVersion)
  if(!scene)return fail()
  const lighting=object(data.lighting),primary=object(lighting.primary),ambient=object(lighting.ambient)
  const time=text(lighting.timeOfDay) as TimeOfDay
  if(!Object.hasOwn(timeLabels,time))return fail()
  const kind=text(primary.kind) as LightKind
  if(!supportedLightKinds(scene.id,time).includes(kind))return fail()
  const direction=directions.find(direction=>direction.angle===primary.azimuthDeg)
  if(!direction)return fail()
  const guide=resolveGuide(scene,time,kind,direction.id)
  for(const key of ['kind','azimuthDeg','elevationDeg','intensity','color','shadowSoftness'] as const)if(primary[key]!==guide.lighting.primary[key])return fail()
  if(ambient.color!==guide.lighting.ambient.color||ambient.intensity!==guide.lighting.ambient.intensity)return fail()
  let guideState:PracticeSession['guide']=null
  if(data.guide!==null){
    const stored=object(data.guide)
    if(stored.id!==guide.id)return fail()
    // Strokes are what matters: when the guide's steps were re-authored (new version or a step id
    // that no longer exists), keep the session and restart the guide at its first step.
    const current=stored.version===guide.version?guide.steps.find(step=>step.id===stored.currentStepId):undefined
    guideState={id:guide.id,version:guide.version,currentStepId:(current??guide.steps[0]).id}
  }
  if(!Array.isArray(data.strokes)||data.strokes.length>10000||typeof data.baseWashVisible!=='boolean')return fail()
  let samplesCount=0
  const ids=new Set<string>()
  const strokes:PaintStroke[]=data.strokes.map((value:unknown)=>{
    const stroke=object(value),brush=object(stroke.brush)
    const id=text(stroke.id)
    if(ids.has(id))return fail();ids.add(id)
    const kind=brushId(brush.brushId)
    if(stroke.layerId!=='paint'||!['brush','eraser'].includes(stroke.tool as string)||!brushVersions[kind].includes(brush.brushVersion as number))return fail()
    // A wash id groups still-wet flat brush strokes; it means nothing on round strokes or erasers, so it is refused there.
    if(stroke.washId!==undefined&&(stroke.tool!=='brush'||kind!=='flat-wash'))return fail()
    const washId=stroke.washId===undefined?undefined:text(stroke.washId)
    if(!Array.isArray(stroke.samples)||!stroke.samples.length||stroke.samples.length>30000)return fail()
    samplesCount+=stroke.samples.length;if(samplesCount>500000)return fail()
    let last=-1
    const samples:StrokeSample[]=stroke.samples.map((value:unknown)=>{
      const point=object(value),elapsedMs=number(point.elapsedMs,0,3600000)
      if(elapsedMs<last)return fail();last=elapsedMs
      return {x:number(point.x,0,1),y:number(point.y,0,1),pressure:number(point.pressure,0,1),tiltX:number(point.tiltX,-90,90),tiltY:number(point.tiltY,-90,90),elapsedMs}
    })
    return {id,layerId:'paint',tool:stroke.tool as 'brush'|'eraser',seed:number(stroke.seed,0,4294967295,true),samples,brush:{brushId:kind,brushVersion:brush.brushVersion as number,color:text(brush.color,/^#[0-9a-fA-F]{6}$/,7),size:number(brush.size,2,120),water:number(brush.water,0,1),pigment:number(brush.pigment,0,1),opacity:number(brush.opacity,0,1)},...(washId===undefined?{}:{washId})}
  })
  return {schemaVersion:1,id:text(data.id),sceneId:scene.id,sceneVersion:scene.version,guide:guideState,lighting:guide.lighting,rendererVersion:'watercolor-1',baseWashVisible:data.baseWashVisible,createdAt:date(data.createdAt),updatedAt:date(data.updatedAt),strokes,historyCursor:number(data.historyCursor,0,strokes.length,true)}
}
export function serializePractice(session:PracticeSession) {
  return JSON.stringify({format:'aqua-canvas-practice',version:1,session})
}
export function parsePracticeFile(contents:string):PracticeSession {
  if(new TextEncoder().encode(contents).length>maxProjectBytes)throw new Error('연습 파일은 16 MB 이하로 가져올 수 있어요.')
  let value:unknown
  try{value=JSON.parse(contents)}catch{throw new Error('올바른 JSON 연습 파일을 선택해주세요.')}
  const data=object(value)
  if(data.format!=='aqua-canvas-practice'||data.version!==1)return fail()
  return validatePractice(data.session)
}
