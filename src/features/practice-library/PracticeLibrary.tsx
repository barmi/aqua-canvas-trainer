import type { PracticeSession } from '../../domain/painting'
import { readyScenes } from '../../content/scenes.catalog'
import { timeLabels } from '../../content/lighting-options'

export function PracticeLibrary({sessions,onOpen}:{sessions:readonly PracticeSession[];onOpen:(session:PracticeSession)=>void}) {
  const works=sessions.filter(session=>session.strokes.length>0).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
  return <section className="practice-library"><p className="eyebrow">MY LITTLE COLLECTION</p><h1>차곡차곡, 나의 연습</h1><p className="muted">같은 풍경도 빛과 색에 따라 다른 이야기가 돼요.</p>{!works.length?<p className="empty-state">아직 연습이 없어요. 풍경을 고르고 첫 붓질을 남겨보세요.</p>:<ul className="scene-grid">{works.map(session=>{
    const scene=readyScenes.find(value=>value.id===session.sceneId)
    if(!scene)return null
    return <li key={session.id}><button className="scene-card" onClick={()=>onOpen(session)}><div className="scene-art"><img src={scene.assets.thumbnailUrl} alt={scene.title}/></div><div className="scene-description"><span className="scene-level">{timeLabels[session.lighting.timeOfDay]} · {session.historyCursor}번의 붓질</span><h3>{scene.title}</h3><p>{new Date(session.updatedAt).toLocaleString('ko-KR')}</p><span className="scene-action">이어서 그리기 ↗</span></div></button></li>
  })}</ul>}</section>
}
