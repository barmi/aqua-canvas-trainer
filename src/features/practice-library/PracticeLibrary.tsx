import type { PracticeSession } from '../../domain/painting'
import { readyScenes } from '../../content/scenes.catalog'
import { timeLabels } from '../../content/lighting-options'
import { useRef, useState } from 'react'
import { PracticeThumbnail } from './PracticeThumbnail'

export function PracticeLibrary({sessions,onOpen,onImport,onDelete}:{sessions:readonly PracticeSession[];onOpen:(session:PracticeSession)=>void;onImport:(file:File)=>Promise<void>;onDelete:(id:string)=>void}) {
  const input=useRef<HTMLInputElement>(null)
  const [error,setError]=useState('')
  const works=sessions.filter(session=>session.strokes.length>0).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
  return <section className="practice-library"><p className="eyebrow">MY LITTLE COLLECTION</p><h1>차곡차곡, 나의 연습</h1><p className="muted">이 기기에 자동 저장한 연습이에요. 파일로 백업해 다른 기기에서도 이어갈 수 있어요.</p><div className="library-actions"><button className="secondary-button" onClick={()=>input.current?.click()}>연습 파일 가져오기</button><input hidden ref={input} type="file" accept=".json,application/json" aria-label="연습 파일 가져오기" onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{setError('');await onImport(file)}catch(error){setError(error instanceof Error?error.message:'파일을 열지 못했어요.')}}}/></div>{error&&<p className="error-message" role="alert">{error}</p>}{!works.length?<p className="empty-state">아직 연습이 없어요. 풍경을 고르고 첫 붓질을 남겨보세요.</p>:<ul className="scene-grid">{works.map(session=>{
    const scene=readyScenes.find(value=>value.id===session.sceneId)
    if(!scene)return null
    return <li key={session.id}><button className="scene-card" onClick={()=>onOpen(session)}><div className="scene-art"><PracticeThumbnail session={session} scene={scene}/></div><div className="scene-description"><span className="scene-level">{timeLabels[session.lighting.timeOfDay]} · {session.historyCursor}번의 붓질</span><h3>{scene.title}</h3><p>{new Date(session.updatedAt).toLocaleString('ko-KR')}</p><span className="scene-action">이어서 그리기 ↗</span></div></button><button className="delete-practice" onClick={()=>{if(window.confirm('이 연습을 삭제할까요?'))onDelete(session.id)}}>연습 삭제</button></li>
  })}</ul>}</section>
}
