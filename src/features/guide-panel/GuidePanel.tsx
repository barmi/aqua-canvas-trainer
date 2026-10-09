import { useState } from 'react'
import type { BrushPreset, GuideDefinition, GuideStep } from '../../domain/guide'
import type { BrushId, BrushSettings } from '../../domain/painting'
import type { PaintTool } from '../../engine/input/painting-input'

const techniqueNames = {'flat-wash':'고르게 깔기','graded-wash':'점점 옅게 풀기','wet-on-wet':'젖은 위에 번지기','glazing':'마른 위에 겹치기','dry-brush':'마른 붓으로 짚기','lifting':'닦아서 밝히기'}
export const brushNames: Record<BrushId,string> = {'watercolor-round':'둥근 붓','flat-wash':'평붓'}
const near=(a:number,b:number)=>Math.abs(a-b)<.011
/** The step's brush counts as applied when type, size and the three controls agree within a slider step. */
export const matchesPreset=(brush:BrushSettings,preset:BrushPreset)=>brush.brushId===preset.brushId&&near(brush.size,preset.size)&&near(brush.water,preset.water)&&near(brush.pigment,preset.pigment)&&near(brush.opacity,preset.opacity)
const percent=(value:number)=>`${Math.round(value*100)}%`

export interface GuidePanelProps {
  guide:GuideDefinition;index:number;onStep:(index:number)=>void
  onColor:(color:string)=>void;onBrush:(step:GuideStep)=>void;brush:BrushSettings
  /** The active tool: a lifting step counts as applied only with the eraser, every other step only with the brush. */
  tool?:PaintTool
  /** Data URLs of the example composites; null while rendering. `exampleAvailable` is false when compositing failed. */
  stepImage:string|null;finishedImage:string|null;exampleAvailable:boolean
  showHint:boolean;onHint:(show:boolean)=>void;opacity:number;onOpacity:(value:number)=>void
  showTrace:boolean;onTrace:(show:boolean)=>void;traceOpacity:number;onTraceOpacity:(value:number)=>void
}
/**
 * Step content in reading order: dots, title, example figure, instruction, tip, brush card, palette, reason.
 * View settings sit in a collapsed block and the step actions in a sticky footer, so instruction and canvas
 * stay visible together; the auto-brush setting lives with the tools, not with the step.
 */
export function GuidePanel({guide,index,onStep,onColor,onBrush,brush,tool,stepImage,finishedImage,exampleAvailable,showHint,onHint,opacity,onOpacity,showTrace,onTrace,traceOpacity,onTraceOpacity}:GuidePanelProps) {
  const step=guide.steps[index]
  const last=guide.steps.length-1
  // The figure returns to "this step" whenever the step changes; no effect needed.
  const [finishedAt,setFinishedAt]=useState(-1)
  const showFinished=finishedAt===index&&index!==last
  const figureImage=showFinished?finishedImage:stepImage
  // A lifting step is done with the eraser, which only has a size and a strength (농도); water and pigment mean
  // nothing to it, so the card says 지우개 and shows just those two instead of a round brush with four controls.
  const lifting=step.technique==='lifting'
  const applied=matchesPreset(brush,step.suggestedBrush)&&(tool===undefined||tool===(lifting?'eraser':'brush'))
  return <aside className="guide-panel" aria-label="채색 가이드"><p className="panel-label">빛을 따라, 한 단계씩</p>
    <div className="step-dots">{guide.steps.map((value,i)=><button key={value.id} aria-label={`${i+1}단계 ${value.title}`} aria-current={i===index?'step':undefined} className={i===index?'current':i<index?'done':''} onClick={()=>onStep(i)}>{i+1}</button>)}</div>
    <span className="step-count">{String(index+1).padStart(2,'0')} <small>/ {String(guide.steps.length).padStart(2,'0')}</small></span><h2>{step.title}</h2>
    {exampleAvailable&&<figure className="step-example">
      <figcaption><span>{showFinished?'완성 예시':'이 단계까지 칠하면'}</span>{index!==last&&<button type="button" aria-pressed={showFinished} onClick={()=>setFinishedAt(showFinished?-1:index)}>{showFinished?'이 단계 보기':'완성 예시 보기'}</button>}</figcaption>
      {figureImage?<img src={figureImage} alt={showFinished?'완성 예시 그림':`${index+1}단계까지 칠한 예시 그림`} draggable={false}/>:<div className="example-placeholder" role="status">예시를 준비하고 있어요…</div>}
    </figure>}
    <p>{step.instruction}</p>
    {step.tip&&<p className="step-tip">💡 {step.tip}</p>}
    <div className="brush-card" aria-label="이 단계의 붓">
      <div className="brush-card-head"><strong>{lifting?'지우개':brushNames[step.suggestedBrush.brushId]}</strong><span className="technique">{techniqueNames[step.technique]}</span><span className="brush-chip" style={{background:step.palette[0].color}} aria-label={`추천 색 ${step.palette[0].label}`}/></div>
      {lifting
        ?<dl className="brush-specs eraser"><div><dt>크기</dt><dd>{step.suggestedBrush.size}</dd></div><div><dt>세기</dt><dd>{percent(step.suggestedBrush.opacity)}</dd></div></dl>
        :<dl className="brush-specs"><div><dt>크기</dt><dd>{step.suggestedBrush.size}</dd></div><div><dt>수분</dt><dd>{percent(step.suggestedBrush.water)}</dd></div><div><dt>안료</dt><dd>{percent(step.suggestedBrush.pigment)}</dd></div><div><dt>농도</dt><dd>{percent(step.suggestedBrush.opacity)}</dd></div></dl>}
      {applied?<p className="brush-applied" role="status">✓ 적용됨</p>:<button type="button" className="secondary-button suggested-brush" onClick={()=>onBrush(step)}>{lifting?'지우개로 바꾸기':'이 붓으로 바꾸기'}</button>}
    </div>
    <div className="guide-palette">{step.palette.map(color=><button key={color.color} type="button" aria-pressed={brush.color===color.color} onClick={()=>onColor(color.color)} title={color.mixingNote}><span style={{background:color.color}}/>{color.label}</button>)}</div>
    <p className="mixing-note">{step.palette[0].mixingNote}</p>
    <details className="guide-reason"><summary>왜 이렇게 할까요?</summary><p>{step.rationale}</p></details>
    <details className="view-options"><summary>보기 설정</summary>
      <label className="check-label"><input type="checkbox" checked={showHint} onChange={event=>onHint(event.target.checked)}/>칠할 영역 가이드</label>
      {showHint&&<label className="slider-label">안내 투명도<output>{percent(opacity)}</output><input type="range" min=".1" max=".7" step=".05" value={opacity} onChange={event=>onOpacity(Number(event.target.value))}/></label>}
      {exampleAvailable&&<label className="check-label"><input type="checkbox" checked={showTrace} onChange={event=>onTrace(event.target.checked)}/>완성본 비치기</label>}
      {exampleAvailable&&showTrace&&<label className="slider-label">비치는 정도<output>{percent(traceOpacity)}</output><input type="range" min=".15" max=".7" step=".05" value={traceOpacity} onChange={event=>onTraceOpacity(Number(event.target.value))}/></label>}
    </details>
    <p className="completion-hint">{step.completionHint}</p>
    <div className="step-footer"><div className="step-actions"><button disabled={!index} className="secondary-button" onClick={()=>onStep(index-1)}>이전</button><button className="primary-button" onClick={()=>{if(index<last)onStep(index+1);else onHint(false)}}>{index===last?'가이드 끄고 감상':'다음 단계 →'}</button></div></div>
  </aside>
}
