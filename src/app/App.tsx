import { useState } from 'react'
import { SceneLibrary } from '../features/scene-library/SceneLibrary'
import type { ReadyScene } from '../domain/scene'
import type { PracticeSession } from '../domain/painting'
import { PaintingWorkspace } from '../features/painting-workspace/PaintingWorkspace'
import { PracticeLibrary } from '../features/practice-library/PracticeLibrary'
import { readyScenes } from '../content/scenes.catalog'
import { createPractice } from '../features/practice-library/create-practice'
import { defaultGuide, resolveGuide } from '../content/guides/resolve-guide'
import type { GuideChoice } from '../features/lighting-controls/LightingControls'
import { usePracticeStore } from '../platform/storage/usePracticeStore'
import { maxProjectBytes, parsePracticeFile } from '../platform/storage/practice-file'
import { createId } from '../shared/id'

export function App() {
  const {sessions,loading,status,error,updateSession,removeSession,flush}=usePracticeStore()
  const [activeId,setActiveId]=useState<string|null>(null)
  const [view,setView]=useState<'scenes'|'workspace'|'practices'>('scenes')
  const active=sessions.find(session=>session.id===activeId)
  const scene=readyScenes.find(value=>value.id===active?.sceneId)
  const openSession=(session:PracticeSession)=>{setActiveId(session.id);setView('workspace')}
  const start=(selected:ReadyScene,choice?:GuideChoice)=>{
    const practice=createPractice(selected,choice?resolveGuide(selected,choice.time,choice.kind,choice.direction):defaultGuide(selected))
    updateSession(practice);openSession(practice)
  }
  const importSession=async(file:File)=>{
    if(file.size>maxProjectBytes)throw new Error('연습 파일은 16 MB 이하로 가져올 수 있어요.')
    const imported=parsePracticeFile(await file.text())
    const session={...imported,id:createId(),updatedAt:new Date().toISOString()}
    updateSession(session);openSession(session)
  }
  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={()=>setView('scenes')}><span className="brand-mark">a.</span><span>aqua canvas<small>수채화 연습실</small></span></button><span className={`save-state ${status}`} role="status">{loading?'연습 불러오는 중':status==='saving'?'저장 중…':status==='error'?'저장 확인 필요':'이 기기에 저장됨'}</span><nav className="header-nav" aria-label="주 메뉴"><button className={view==='scenes'?'active':''} onClick={()=>setView('scenes')}>풍경 고르기</button><button className={view==='practices'?'active':''} onClick={()=>setView('practices')}>나의 연습</button></nav></header>
    {error&&<div className="storage-banner" role="alert">{error}<button onClick={()=>void flush()}>저장 다시 시도</button></div>}
    <main>{loading?<p className="empty-state" role="status">저장한 연습을 불러오고 있어요.</p>:view==='workspace'&&active&&scene?<PaintingWorkspace key={active.id} scene={scene} initialSession={active} onBack={()=>setView('scenes')} onSessionChange={updateSession} onLightingChange={choice=>start(scene,choice)}/>:view==='practices'?<PracticeLibrary sessions={sessions} onOpen={openSession} onImport={importSession} onDelete={id=>void removeSession(id)}/>:<SceneLibrary onSelect={selected=>start(selected)}/>}</main>
    <footer className="app-footer"><span>aqua canvas</span><span>한 겹의 색, 한 번의 발견.</span></footer>
  </div>
}
