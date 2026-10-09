import { lightingPresets } from '../content/lighting-presets'
import { watercolorReference } from '../content/references'
import { sceneCatalog } from '../content/scenes.catalog'

export function App() {
  return (
    <main>
      <header className="intro">
        <p className="eyebrow">AQUA CANVAS TRAINER · 개발 준비</p>
        <h1>빛을 관찰하고,<br />수채화로 연습하기</h1>
        <p className="lead">
          선화와 바탕색 위에 빛을 더하는 수채화 연습실입니다.
          배경과 광원, 시간대에 따라 달라지는 색과 그림자를 함께 살펴봅니다.
        </p>
        <p className="notice">
          현재는 프로젝트 구조와 설계 초안을 준비한 단계입니다.
          아래 배경은 제작 계획이며, 그리기와 채색 가이드 기능은 개발 예정입니다.
        </p>
      </header>

      <section className="reference" aria-labelledby="reference-title">
        <div>
          <p className="eyebrow">REFERENCE</p>
          <h2 id="reference-title">첫 번째 연습의 출발점</h2>
          <p>
            의자와 식물이 있는 장면에 노란 바탕색을 깔고 음영을 쌓는 과정입니다.
            선화, 바탕색, 그림자를 나누어 연습하는 방식의 참고 영상으로 사용합니다.
          </p>
          <p className="metadata">720 × 1280 · 약 48초 · 원본 MP4</p>
          <a href={watercolorReference.sourceUrl} target="_blank" rel="noreferrer">
            원본 게시물 보기 ↗
          </a>
        </div>
        <video controls playsInline preload="metadata" aria-label="의자와 식물이 있는 장면의 수채화 채색 참고 영상">
          <source src={watercolorReference.assetUrl} type="video/mp4" />
          영상을 재생할 수 없습니다. <a href={watercolorReference.assetUrl}>MP4 다운로드</a>
        </video>
      </section>

      <section aria-labelledby="scenes-title">
        <p className="eyebrow">SCENES</p>
        <h2 id="scenes-title">배경 제작 계획</h2>
        <ul className="scene-grid">
          {sceneCatalog.map((scene) => (
            <li key={scene.id} className="scene-card">
              <span className="status">제작 예정</span>
              <h3>{scene.title}</h3>
              <p>{scene.description}</p>
              <p className="goal">{scene.learningGoals.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lighting-title">
        <p className="eyebrow">LIGHT & TIME</p>
        <h2 id="lighting-title">같은 장면, 다른 시간</h2>
        <p>시간대별 시작 프리셋을 준비했습니다. 광원 종류와 방향은 연습 화면에서 조정할 예정입니다.</p>
        <ul className="time-grid">
          {lightingPresets.map((preset) => (
            <li key={preset.id}>
              <span className="swatch" style={{ backgroundColor: preset.settings.primary.color }} aria-hidden="true" />
              <h3>{preset.title}</h3>
              <p>{preset.learningFocus}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer>iPad Safari · Apple Pencil · Web App</footer>
    </main>
  )
}
