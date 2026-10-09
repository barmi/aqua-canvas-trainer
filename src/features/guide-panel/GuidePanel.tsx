import type { GuideDefinition, GuideStep } from '../../domain/guide'

const techniqueNames = {'flat-wash':'플랫 워시','graded-wash':'그라데이션','wet-on-wet':'웻온웻','glazing':'글레이징','dry-brush':'드라이브러시','lifting':'리프팅'}
export function GuidePanel({guide,index,onStep,onColor,onBrush,showHint,onHint,opacity,onOpacity}:{guide:GuideDefinition;index:number;onStep:(index:number)=>void;onColor:(color:string)=>void;onBrush:(step:GuideStep)=>void;showHint:boolean;onHint:(show:boolean)=>void;opacity:number;onOpacity:(value:number)=>void}) {
  const step=guide.steps[index]
  return <aside className="guide-panel" aria-label="채색 가이드"><p className="panel-label">빛을 따라, 한 단계씩</p>
    <div className="step-dots">{guide.steps.map((value,i)=><button key={value.id} aria-label={`${i+1}단계 ${value.title}`} aria-current={i===index?'step':undefined} className={i===index?'current':i<index?'done':''} onClick={()=>onStep(i)}>{i+1}</button>)}</div>
    <span className="step-count">0{index+1} <small>/ 0{guide.steps.length}</small></span><h2>{step.title}</h2><p>{step.instruction}</p><div className="guide-reason">{step.rationale}</div>
    <p className="technique">{techniqueNames[step.technique]}</p><div className="guide-palette">{step.palette.map(color=><button key={color.color} onClick={()=>onColor(color.color)} title={color.mixingNote}><span style={{background:color.color}}/>{color.label}</button>)}</div>
    <p className="mixing-note">{step.palette[0].mixingNote}</p><button className="secondary-button suggested-brush" onClick={()=>onBrush(step)}>이 단계의 추천 붓 적용</button>
    <label className="check-label"><input type="checkbox" checked={showHint} onChange={event=>onHint(event.target.checked)}/>칠할 영역 가이드</label>
    {showHint&&<label className="slider-label">안내 투명도<output>{Math.round(opacity*100)}%</output><input type="range" min=".1" max=".7" step=".05" value={opacity} onChange={event=>onOpacity(Number(event.target.value))}/></label>}
    <p className="completion-hint">{step.completionHint}</p><div className="step-actions"><button disabled={!index} className="secondary-button" onClick={()=>onStep(index-1)}>이전</button><button className="primary-button" onClick={()=>{if(index<guide.steps.length-1)onStep(index+1);else onHint(false)}}>{index===guide.steps.length-1?'가이드 끄고 감상':'다음 단계 →'}</button></div>
  </aside>
}
