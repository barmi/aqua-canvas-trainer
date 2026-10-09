import { useCallback, useState } from 'react'
import { SceneLibrary } from '../features/scene-library/SceneLibrary'
import type { ReadyScene } from '../domain/scene'
import type { PracticeSession } from '../domain/painting'
import { PaintingWorkspace } from '../features/painting-workspace/PaintingWorkspace'
import { PracticeLibrary } from '../features/practice-library/PracticeLibrary'
import { readyScenes } from '../content/scenes.catalog'
import { createPractice } from '../features/practice-library/create-practice'
import { defaultGuide, resolveGuide } from '../content/guides/resolve-guide'
import type { GuideChoice } from '../features/lighting-controls/LightingControls'

export function App() {
  const [sessions,setSessions]=useState<PracticeSession[]>([])
  const [activeId,setActiveId]=useState<string|null>(null)
  const [view,setView]=useState<'scenes'|'workspace'|'practices'>('scenes')
  const active=sessions.find(session=>session.id===activeId)
  const scene=readyScenes.find(value=>value.id===active?.sceneId)
  const updateSession=useCallback((session:PracticeSession)=>setSessions(previous=>[...previous.filter(value=>value.id!==session.id),session]),[])
  const openSession=(session:PracticeSession)=>{setActiveId(session.id);setView('workspace')}
  const start=(selected:ReadyScene,choice?:GuideChoice)=>{
    const practice=createPractice(selected,choice?resolveGuide(selected,choice.time,choice.kind,choice.direction):defaultGuide(selected))
    updateSession(practice);openSession(practice)
  }
  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={()=>setView('scenes')}><span className="brand-mark">a.</span><span>aqua canvas<small>수채화 연습실</small></span></button><nav className="header-nav" aria-label="주 메뉴"><button className={view==='scenes'?'active':''} onClick={()=>setView('scenes')}>풍경 고르기</button><button className={view==='practices'?'active':''} onClick={()=>setView('practices')}>나의 연습</button></nav></header>
    <main>{view==='workspace'&&active&&scene?<PaintingWorkspace key={active.id} scene={scene} initialSession={active} onBack={()=>setView('scenes')} onSessionChange={updateSession} onLightingChange={choice=>start(scene,choice)}/>:view==='practices'?<PracticeLibrary sessions={sessions} onOpen={openSession}/>:<SceneLibrary onSelect={selected=>start(selected)}/>}</main>
    <footer className="app-footer"><span>aqua canvas</span><span>한 겹의 색, 한 번의 발견.</span></footer>
  </div>
}
