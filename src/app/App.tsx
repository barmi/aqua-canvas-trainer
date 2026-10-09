import { useState } from 'react'
import { SceneLibrary } from '../features/scene-library/SceneLibrary'
import type { ReadyScene } from '../domain/scene'
import { PaintingWorkspace } from '../features/painting-workspace/PaintingWorkspace'

export function App() {
  const [scene, setScene] = useState<ReadyScene | null>(null)
  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={() => setScene(null)}><span className="brand-mark">a.</span><span>aqua canvas<small>수채화 연습실</small></span></button><span className="header-note">빛을 배우는 작은 시간</span></header>
    <main>{scene ? <PaintingWorkspace key={scene.id} scene={scene} onBack={() => setScene(null)} /> : <SceneLibrary onSelect={setScene} />}</main>
    <footer className="app-footer"><span>aqua canvas</span><span>한 겹의 색, 한 번의 발견.</span></footer>
  </div>
}
