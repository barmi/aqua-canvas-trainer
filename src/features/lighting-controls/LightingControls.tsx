import type { LightKind, TimeOfDay } from '../../domain/lighting'
import type { ReadyScene } from '../../domain/scene'
import { directions, lightLabels, supportedLightKinds, timeLabels } from '../../content/lighting-options'
import type { LightDirection } from '../../content/lighting-options'

export interface GuideChoice { time: TimeOfDay; kind: LightKind; direction: LightDirection }
export function LightingControls({scene,choice,onChange}:{scene:ReadyScene;choice:GuideChoice;onChange:(choice:GuideChoice)=>void}) {
  return <div className="lighting-controls" aria-label="빛과 시간 설정">
    <label>시간대<select value={choice.time} onChange={event=>{const time=event.target.value as TimeOfDay;const kinds=supportedLightKinds(scene.id,time);onChange({...choice,time,kind:kinds.includes(choice.kind)?choice.kind:kinds[0]})}}>{Object.entries(timeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    <label>광원<select value={choice.kind} onChange={event=>onChange({...choice,kind:event.target.value as LightKind})}>{supportedLightKinds(scene.id,choice.time).map(kind=><option value={kind} key={kind}>{lightLabels[kind]}</option>)}</select></label>
    <fieldset><legend>빛이 오는 방향</legend><div className="direction-buttons">{directions.map(direction=><button key={direction.id} aria-pressed={choice.direction===direction.id} className={choice.direction===direction.id?'selected':''} onClick={()=>onChange({...choice,direction:direction.id})}><span>{direction.arrow}</span>{direction.label}</button>)}</div></fieldset>
  </div>
}
