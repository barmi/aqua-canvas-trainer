import { useEffect, useRef, useState } from 'react'
import type { ReadyScene } from '../../domain/scene'
import type { BrushSettings } from '../../domain/painting'
import { WatercolorRenderer } from '../../engine/renderer/WatercolorRenderer'
import { attachPaintingInput } from '../../engine/input/painting-input'
import type { PaintTool } from '../../engine/input/painting-input'
import { initialViewport, zoomAt } from '../../engine/input/coordinates'
import { appendStroke, emptyHistory, redo, undo } from '../../engine/history/history'
import { starterGuides } from '../../content/guides/starter-guides'

const palette = ['#D6B65E','#B97F59','#849568','#5F8277','#70788F','#9D7780','#4B5752','#D9BE9B']
export const defaultBrush: BrushSettings = { brushId: 'watercolor-round', brushVersion: 1, color: palette[0], size: 18, opacity: .6, water: .7, pigment: .45 }

export function PaintingWorkspace({ scene, onBack }: { scene: ReadyScene; onBack: () => void }) {
  const [brush, setBrush] = useState(defaultBrush)
  const [tool, setTool] = useState<PaintTool>('brush')
  const [viewport, setViewport] = useState(initialViewport)
  const [history, setHistory] = useState(emptyHistory)
  const [showBase, setShowBase] = useState(true)
  const [assetError, setAssetError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const renderer = useRef<WatercolorRenderer | null>(null)
  const settings = useRef({ brush, tool, viewport })
  settings.current = { brush, tool, viewport }
  const step = starterGuides.find(guide => guide.sceneId === scene.id)?.steps[0]

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
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' || (event.target instanceof HTMLElement && ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))) return
      event.preventDefault(); setHistory(event.shiftKey ? redo : undo)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])

  return <section className="workspace">
    <div className="workspace-heading"><div><button className="text-button" onClick={onBack}>← 풍경 고르기</button><h1>{scene.title}</h1></div><p className="muted">옅게 시작해서, 한 겹씩 쌓아보세요.</p></div>
    <div className="workspace-grid">
      <aside className="tools-panel" aria-label="그리기 도구">
        <p className="panel-label">나의 붓</p>
        <div className="tool-buttons">{(['brush','eraser','pan'] as const).map(value => <button key={value} className={tool === value ? 'selected' : ''} aria-pressed={tool === value} onClick={() => setTool(value)}>{({brush:'붓',eraser:'지우개',pan:'이동'})[value]}</button>)}</div>
        <div className="palette" aria-label="팔레트">{palette.map(color => <button key={color} className={brush.color === color ? 'color selected' : 'color'} style={{background:color}} aria-label={`색상 ${color}`} aria-pressed={brush.color === color} onClick={() => { setBrush({...brush,color});setTool('brush') }} />)}</div>
        <label className="custom-color">나만의 색<input type="color" aria-label="사용자 색상" value={brush.color} onChange={event => setBrush({...brush,color:event.target.value})} /></label>
        <label className="slider-label">붓 크기 <output>{brush.size}</output><input type="range" min="2" max="65" value={brush.size} onChange={event => setBrush({...brush,size:Number(event.target.value)})}/></label>
        {(['water','pigment','opacity'] as const).map(key => <label className="slider-label" key={key}>{({water:'수분',pigment:'안료',opacity:'농도'})[key]}<output>{Math.round(brush[key]*100)}%</output><input type="range" min="0.05" max="1" step="0.05" value={brush[key]} onChange={event => setBrush({...brush,[key]:Number(event.target.value)})}/></label>)}
        <div className="history-buttons"><button disabled={!history.cursor} onClick={() => setHistory(undo)} aria-label="실행 취소">↶ 취소</button><button disabled={history.cursor === history.strokes.length} onClick={() => setHistory(redo)} aria-label="다시 실행">다시 ↷</button></div>
        <label className="check-label"><input type="checkbox" checked={showBase} onChange={event => setShowBase(event.target.checked)}/>기본 바탕색</label>
        <p className="input-hint">펜과 마우스로 칠해요.<br/>손가락 두 개로 확대·이동해요.<br/>손가락은 색을 남기지 않아요.</p>
      </aside>
      <div className="canvas-column">
        <div className={`canvas-stage tool-${tool}`} ref={stageRef}>
          <div className="paper-frame" style={{ transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`, aspectRatio:`${scene.canvasSize.width}/${scene.canvasSize.height}` }}>
            {showBase && <img className="paper-layer" src={scene.assets.baseWashUrl} alt="" draggable={false} onError={() => setAssetError(true)} />}
            <canvas ref={canvasRef} width={scene.canvasSize.width} height={scene.canvasSize.height} aria-label="수채화 그리기 캔버스" />
            <img className="paper-layer line-art" src={scene.assets.lineArtUrl} alt="" draggable={false} onError={() => setAssetError(true)} />
          </div>
          {assetError && <div className="canvas-error" role="alert">배경을 불러오지 못했어요. 연결을 확인하고 다시 열어주세요.</div>}
        </div>
        <div className="canvas-bottom"><span>나의 작은 수채화 · {history.cursor}번의 붓질</span><div className="zoom-controls"><button aria-label="축소" onClick={() => setViewport(zoomAt(viewport,.8))}>−</button><button aria-label="화면 맞추기" onClick={() => setViewport(initialViewport)}>{Math.round(viewport.scale*100)}%</button><button aria-label="확대" onClick={() => setViewport(zoomAt(viewport,1.25))}>＋</button></div></div>
      </div>
      <aside className="guide-panel" aria-label="채색 가이드"><p className="panel-label">빛을 따라, 한 단계씩</p><span className="step-count">01 / 01</span><h2>{step?.title}</h2><p>{step?.instruction}</p><div className="guide-reason">{step?.rationale}</div><p className="muted">지금은 자유롭게 색을 쌓아보세요. 먼저 밝은 면을 남기는 연습부터 시작해요.</p></aside>
    </div>
  </section>
}
