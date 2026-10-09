import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReadyScene } from '../../domain/scene'
import type { BrushId, BrushSettings, PracticeSession } from '../../domain/painting'
import type { GuideDefinition, GuideStep } from '../../domain/guide'
import { WatercolorRenderer } from '../../engine/renderer/WatercolorRenderer'
import { attachPaintingInput } from '../../engine/input/painting-input'
import type { PaintTool } from '../../engine/input/painting-input'
import { initialViewport, zoomAt } from '../../engine/input/coordinates'
import { appendStroke, redo, undo } from '../../engine/history/history'
import { resolveGuide } from '../../content/guides/resolve-guide'
import { directions } from '../../content/lighting-options'
import { LightingControls } from '../lighting-controls/LightingControls'
import type { GuideChoice } from '../lighting-controls/LightingControls'
import { GuidePanel, brushNames } from '../guide-panel/GuidePanel'
import { canvasBlob, downloadBlob, renderPractice } from '../../engine/renderer/export-painting'
import { renderExample } from '../../engine/renderer/example-composite'
import { serializePractice } from '../../platform/storage/practice-file'
import { flatWashBrushVersion, watercolorBrushVersion } from '../../engine/brush/watercolor'

/** Version stamped on new strokes of each brush type, so replays pick the brush that painted them. */
export const presetBrushVersion = (brushId: BrushId) => brushId === 'flat-wash' ? flatWashBrushVersion : watercolorBrushVersion
const palette = ['#D6B65E','#B97F59','#849568','#5F8277','#70788F','#9D7780','#4B5752','#D9BE9B']
export const defaultBrush: BrushSettings = { brushId: 'watercolor-round', brushVersion: watercolorBrushVersion, color: palette[0], size: 18, opacity: .6, water: .7, pigment: .45 }
/** The step's whole brush plus its first palette colour, on top of whatever else the user set. */
const presetBrush = (current: BrushSettings, step: GuideStep): BrushSettings => ({ ...current, ...step.suggestedBrush, brushVersion: presetBrushVersion(step.suggestedBrush.brushId), color: step.palette[0].color })
/** A lifting step lightens with the eraser (the multiply brush cannot); every other step paints. */
const presetTool = (step: GuideStep): PaintTool => step.technique === 'lifting' ? 'eraser' : 'brush'
const readSetting = (key: string, expected: string) => { try { return localStorage.getItem(key) === expected } catch { return false } }
const writeSetting = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* Settings still work in memory. */ } }

interface ExampleCache { ready: Map<string, string>; pending: Map<string, Promise<string>> }
/**
 * One example composite as a data URL, rendered at most once per guide and shared through `cache`:
 * the finished figure and the tracing layer reuse the last step's render. Null while rendering or when not wanted.
 */
function useComposite(cache: ExampleCache, scene: ReadyScene, guide: GuideDefinition, index: number, trace: boolean, wanted: boolean, failed: boolean, onFail: (failed: boolean) => void) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!wanted || failed) { setUrl(null); return }
    const key = `${trace ? 'trace' : 'step'}:${index}`
    const ready = cache.ready.get(key)
    if (ready) { setUrl(ready); return }
    let cancelled = false
    setUrl(null)
    let pending = cache.pending.get(key)
    if (!pending) {
      pending = renderExample(scene, guide, index, { paper: !trace, lineArt: !trace }).then(canvas => { const data = canvas.toDataURL('image/png'); cache.ready.set(key, data); return data })
      cache.pending.set(key, pending)
    }
    pending.then(data => { if (!cancelled) setUrl(data) }, () => { if (!cancelled) onFail(true) })
    return () => { cancelled = true }
  }, [cache, scene, guide, index, trace, wanted, failed, onFail])
  return url
}
/**
 * Example images for the guide panel figure and the tracing layer. A rejected render (e.g. offline masks)
 * hides every example for this guide instead of failing the workspace.
 */
function useExampleImages(scene: ReadyScene, guide: GuideDefinition, stepIndex: number, traceWanted: boolean) {
  const cache = useMemo<ExampleCache>(() => ({ ready: new Map(), pending: new Map() }), [scene, guide])
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [cache])
  const lastIndex = guide.steps.length - 1
  const stepImage = useComposite(cache, scene, guide, stepIndex, false, true, failed, setFailed)
  const finishedImage = useComposite(cache, scene, guide, lastIndex, false, true, failed, setFailed)
  const traceImage = useComposite(cache, scene, guide, lastIndex, true, traceWanted, failed, setFailed)
  return { stepImage, finishedImage, traceImage, failed }
}

export function PaintingWorkspace({ scene, initialSession, onBack, onSessionChange, onLightingChange, offlineLabel='온라인 연습' }: { scene: ReadyScene; initialSession: PracticeSession; onBack: () => void; onSessionChange: (session: PracticeSession) => void; onLightingChange: (choice: GuideChoice) => void; offlineLabel?:string }) {
  const original = useRef(initialSession)
  const choice: GuideChoice = {time:initialSession.lighting.timeOfDay,kind:initialSession.lighting.primary.kind,direction:directions.find(value=>value.angle===initialSession.lighting.primary.azimuthDeg)?.id ?? 'upper-right'}
  const guide = useMemo(()=>resolveGuide(scene,choice.time,choice.kind,choice.direction),[scene,choice.time,choice.kind,choice.direction])
  const [stepIndex,setStepIndex]=useState(()=>Math.max(0,guide.steps.findIndex(step=>step.id===initialSession.guide?.currentStepId)))
  const [showHint,setShowHint]=useState(true)
  const [hintOpacity,setHintOpacity]=useState(.25)
  const [showTrace,setShowTrace]=useState(false)
  const [traceOpacity,setTraceOpacity]=useState(.35)
  const step=guide.steps[stepIndex]
  /** The highlight overlay is tinted with the light itself; every other hint takes the step's first colour. */
  const hintColor=step.overlayUrl?.endsWith('-highlight.svg')?guide.lighting.primary.color:step.palette[0].color
  const [brush, setBrush] = useState(defaultBrush)
  const [autoBrush,setAutoBrush]=useState(()=>!readSetting('aqua-auto-brush','off'))
  const [tool, setTool] = useState<PaintTool>('brush')
  const [viewport, setViewport] = useState(initialViewport)
  const [history, setHistory] = useState(()=>({strokes:initialSession.strokes,cursor:initialSession.historyCursor}))
  const [showBase, setShowBase] = useState(initialSession.baseWashVisible)
  const [assetError, setAssetError] = useState(false)
  const [leftHanded,setLeftHanded]=useState(()=>readSetting('aqua-handedness','left'))
  const [guideVisible,setGuideVisible]=useState(true)
  const [exporting,setExporting]=useState(false)
  const [exportError,setExportError]=useState('')
  const examples=useExampleImages(scene,guide,stepIndex,showTrace)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const renderer = useRef<WatercolorRenderer | null>(null)
  const settings = useRef({ brush, tool, viewport })
  settings.current = { brush, tool, viewport }

  useEffect(() => {
    const canvas = canvasRef.current!, stage = stageRef.current!
    const painter = new WatercolorRenderer(canvas)
    renderer.current = painter
    const detach = attachPaintingInput(stage, canvas, {
      settings: () => settings.current,
      preview: stroke => painter.showStroke(stroke),
      complete: stroke => setHistory(previous => appendStroke(previous, stroke)),
      viewport: setViewport,
    })
    return () => { detach(); painter.destroy(); renderer.current = null }
  }, [scene.id])
  useEffect(() => { renderer.current?.setHistory(history) }, [history])
  useEffect(()=>{
    onSessionChange({...original.current,strokes:history.strokes,historyCursor:history.cursor,baseWashVisible:showBase,guide:{id:guide.id,version:guide.version,currentStepId:guide.steps[stepIndex].id},updatedAt:new Date().toISOString()})
  },[history,showBase,stepIndex,guide,onSessionChange])
  // Each step opens with its own brush so a beginner never has to set type, size, water, pigment or opacity by hand.
  useEffect(()=>{
    if(!autoBrush)return
    setBrush(previous=>presetBrush(previous,guide.steps[stepIndex]));setTool(presetTool(guide.steps[stepIndex]))
  },[guide,stepIndex,autoBrush])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' || (event.target instanceof HTMLElement && ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))) return
      event.preventDefault(); setHistory(event.shiftKey ? redo : undo)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])

  const applyPreset=(current:GuideStep)=>{setBrush(previous=>presetBrush(previous,current));setTool(presetTool(current))}
  const chooseBrushType=(brushId:BrushId)=>{setBrush({...brush,brushId,brushVersion:presetBrushVersion(brushId)});setTool('brush')}
  const snapshot=():PracticeSession=>({...initialSession,strokes:history.strokes,historyCursor:history.cursor,baseWashVisible:showBase,guide:{id:guide.id,version:guide.version,currentStepId:guide.steps[stepIndex].id}})
  const exportPng=async()=>{
    setExporting(true);setExportError('')
    try{downloadBlob(await canvasBlob(await renderPractice(snapshot(),scene)),`${scene.id}-${initialSession.id.slice(0,8)}.png`)}
    catch(error){setExportError(error instanceof Error?error.message:'그림을 저장하지 못했어요.')}
    finally{setExporting(false)}
  }
  return <section className="workspace">
    <div className="workspace-heading"><div><button className="text-button" onClick={onBack}>← 풍경 고르기</button><h1>{scene.title}</h1></div><div className="export-actions"><button className="secondary-button" aria-pressed={leftHanded} onClick={()=>{const value=!leftHanded;setLeftHanded(value);writeSetting('aqua-handedness',value?'left':'right')}}>{leftHanded?'왼손 배치':'오른손 배치'}</button><button className="secondary-button" aria-expanded={guideVisible} onClick={()=>setGuideVisible(!guideVisible)}>{guideVisible?'가이드 접기':'가이드 열기'}</button><button className="secondary-button" disabled={exporting} onClick={()=>void exportPng()}>{exporting?'그림 준비 중…':'PNG 저장'}</button><button className="secondary-button" onClick={()=>downloadBlob(new Blob([serializePractice(snapshot())],{type:'application/json'}),`${scene.id}-${initialSession.id.slice(0,8)}.aqua.json`)}>연습 파일 백업</button></div></div>
    {exportError&&<p className="error-message" role="alert">{exportError}</p>}
    <div className={`workspace-grid${leftHanded?' left-handed':''}${!guideVisible?' guide-collapsed':''}`}>
      <aside className="tools-panel" aria-label="그리기 도구">
        <LightingControls scene={scene} choice={choice} onChange={onLightingChange}/><p className="lighting-note">빛을 바꾸면 지금 그림을 보관하고 새 연습을 시작해요.</p><p className="panel-label">나의 붓</p>
        <div className="tool-buttons">{(['brush','eraser','pan'] as const).map(value => <button key={value} className={tool === value ? 'selected' : ''} aria-pressed={tool === value} onClick={() => setTool(value)}>{({brush:'붓',eraser:'지우개',pan:'이동'})[value]}</button>)}</div>
        <div className="tool-buttons brush-type" role="group" aria-label="붓 종류">{(['watercolor-round','flat-wash'] as const).map(value => <button key={value} className={brush.brushId === value ? 'selected' : ''} aria-pressed={brush.brushId === value} onClick={() => chooseBrushType(value)}>{brushNames[value]}</button>)}</div>
        <p className="brush-type-note">평붓은 넓은 면을 고르게, 둥근 붓은 형태와 디테일에 좋아요.</p>
        <label className="check-label auto-brush"><input type="checkbox" checked={autoBrush} onChange={event=>{const value=event.target.checked;setAutoBrush(value);writeSetting('aqua-auto-brush',value?'on':'off')}}/>단계를 열면 추천 붓으로 바꾸기</label>
        <div className="palette" aria-label="팔레트">{palette.map(color => <button key={color} className={brush.color === color ? 'color selected' : 'color'} style={{background:color}} aria-label={`색상 ${color}`} aria-pressed={brush.color === color} onClick={() => { setBrush({...brush,color});setTool('brush') }} />)}</div>
        <label className="custom-color">나만의 색<input type="color" aria-label="사용자 색상" value={brush.color} onChange={event => setBrush({...brush,color:event.target.value})} /></label>
        <label className="slider-label">붓 크기 <output>{brush.size}</output><input type="range" aria-label="붓 크기" min="2" max="120" value={brush.size} onChange={event => setBrush({...brush,size:Number(event.target.value)})}/></label>
        {(['water','pigment','opacity'] as const).map(key => <label className="slider-label" key={key}>{({water:'수분',pigment:'안료',opacity:'농도'})[key]}<output>{Math.round(brush[key]*100)}%</output><input type="range" min="0.05" max="1" step="0.05" value={brush[key]} onChange={event => setBrush({...brush,[key]:Number(event.target.value)})}/></label>)}
        <div className="history-buttons"><button disabled={!history.cursor} onClick={() => setHistory(undo)} aria-label="실행 취소">↶ 취소</button><button disabled={history.cursor === history.strokes.length} onClick={() => setHistory(redo)} aria-label="다시 실행">다시 ↷</button></div>
        <label className="check-label"><input type="checkbox" checked={showBase} onChange={event => setShowBase(event.target.checked)}/>기본 바탕색</label>
        <p className="input-hint">가볍게 누르면 얇고 옅게,<br/>꾹 누르면 넓고 진하게 칠해요.<br/>손가락 두 개로 확대·이동해요.<br/>손가락은 색을 남기지 않아요.</p>
      </aside>
      <div className="canvas-column">
        <div className={`canvas-stage tool-${tool}`} ref={stageRef}>
          <div className="paper-frame" style={{ transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`, aspectRatio:`${scene.canvasSize.width}/${scene.canvasSize.height}` }}>
            {showBase && <img className="paper-layer" src={scene.assets.baseWashUrl} alt="" draggable={false} onError={() => setAssetError(true)} />}
            {showTrace && !examples.failed && examples.traceImage && <img className="paper-layer trace-layer" src={examples.traceImage} style={{opacity:traceOpacity}} alt="" draggable={false} />}
            <canvas ref={canvasRef} width={scene.canvasSize.width} height={scene.canvasSize.height} aria-label="수채화 그리기 캔버스" />
            {showHint && (step.overlayUrl ? [step.overlayUrl] : scene.regions.filter(region=>step.targetRegionIds.includes(region.id)).map(region=>region.maskUrl)).map(url=><div key={url} className="guide-overlay" style={{maskImage:`url("${url}")`,WebkitMaskImage:`url("${url}")`,backgroundColor:hintColor,opacity:hintOpacity}}/>)}
            <img className="paper-layer line-art" src={scene.assets.lineArtUrl} alt="" draggable={false} onError={() => setAssetError(true)} />
          </div>
          {assetError && <div className="canvas-error" role="alert">배경을 불러오지 못했어요. 연결을 확인하고 다시 열어주세요.</div>}
        </div>
        <div className="canvas-bottom"><span>나의 작은 수채화 · {history.cursor}번의 붓질 · {offlineLabel}</span><div className="zoom-controls"><button aria-label="축소" onClick={() => setViewport(zoomAt(viewport,.8))}>−</button><button aria-label="화면 맞추기" onClick={() => setViewport(initialViewport)}>{Math.round(viewport.scale*100)}%</button><button aria-label="확대" onClick={() => setViewport(zoomAt(viewport,1.25))}>＋</button></div></div>
      </div>
      {guideVisible&&<GuidePanel guide={guide} index={stepIndex} onStep={setStepIndex} onColor={color=>{setBrush({...brush,color});setTool('brush')}} onBrush={applyPreset} brush={brush} stepImage={examples.stepImage} finishedImage={examples.finishedImage} exampleAvailable={!examples.failed} showHint={showHint} onHint={setShowHint} opacity={hintOpacity} onOpacity={setHintOpacity} showTrace={showTrace} onTrace={setShowTrace} traceOpacity={traceOpacity} onTraceOpacity={setTraceOpacity}/>}
    </div>
  </section>
}
