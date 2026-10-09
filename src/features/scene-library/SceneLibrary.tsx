import { sceneCatalog } from '../../content/scenes.catalog'
import { watercolorReference } from '../../content/references'
import type { ReadyScene } from '../../domain/scene'

const levels = { beginner: '첫걸음', intermediate: '차근차근', advanced: '조금 더 깊이' }
export function SceneLibrary({ onSelect, online=true, cached=new Set<string>() }: { onSelect: (scene: ReadyScene) => void; online?:boolean; cached?:ReadonlySet<string> }) {
  return <>
    <section className="library-intro">
      <p className="eyebrow">A LITTLE LIGHT, A LITTLE COLOR</p>
      <h1>오늘은 어떤 빛을<br /><em>그려볼까요?</em></h1>
      <p>마음에 드는 풍경을 고르고, 빛을 따라 색을 쌓아보세요.<br />서두르지 않아도 괜찮아요. 한 겹씩, 나만의 수채화.</p>
      <span className="intro-note">iPad & Apple Pencil · 마우스로도 함께</span>
    </section>
    <section className="scene-section" aria-labelledby="scene-heading">
      <div className="section-heading"><h2 id="scene-heading">연습할 풍경</h2><span>선화와 옅은 바탕색에서 시작해요</span></div>
      <ul className="scene-grid">{sceneCatalog.map((scene, i) => <li key={scene.id}>
        <button className="scene-card" disabled={scene.status !== 'ready'||(!online&&!cached.has(scene.id))} onClick={() => scene.status === 'ready' && onSelect(scene)}>
          <div className="scene-art">{scene.status === 'ready'
            ? <img src={scene.assets.thumbnailUrl} alt={scene.title} loading="lazy" />
            : <span className="coming-art">✧</span>}
            <span className="scene-number">0{i+1}</span>
            {cached.has(scene.id)&&<span className="offline-chip">오프라인 준비됨</span>}
          </div>
          <div className="scene-description"><span className="scene-level">{scene.status === 'ready' ? levels[scene.difficulty] : '준비 중'}</span><h3>{scene.title}</h3><p>{scene.description}</p><span className="scene-goals">{scene.learningGoals.join(' · ')}</span>
          {scene.status === 'ready' && <span className="scene-action">{!online&&!cached.has(scene.id)?'인터넷 연결 후 연습할 수 있어요':'이 풍경으로 연습하기 ↗'}</span>}</div>
        </button>
      </li>)}</ul>
    </section>
    <details className="reference"><summary>이 연습실의 시작이 된 수채화 영상 <span>약 48초 ↗</span></summary><div className="reference-content"><p>의자와 식물이 있는 장면에 노란 바탕색과 음영을 쌓는 과정을 살펴보세요.</p><video controls playsInline preload="none" src={watercolorReference.assetUrl} /><a href={watercolorReference.sourceUrl} target="_blank" rel="noreferrer">원본 게시물 보기</a></div></details>
  </>
}
