import type { BrushPreset, ExamplePaint, GuideStep } from '../../domain/guide'
import { directions } from '../lighting-options'
import { mixHex } from './reference-plant-room'
import type { GuideContext } from './resolve-guide'

/**
 * Hand-written steps for the window still life: a beginner lays the washes (all over, wall, table), then the
 * cloth, the curtain, the window panes, then one small object group per step (tea set, lemons and bowl, books and
 * window wood, herbs and vase), then cast shadows, the glaze under the objects, lifted light and details.
 * Colours come from the time-of-day palette mixed with fixed material tints so night and evening stay coherent.
 * Flat-wash presets are calibrated so one pass lands on the step's example tint (resolve-guide.test checks it).
 */

const round = (size: number, water: number, pigment: number, opacity: number): BrushPreset => ({ brushId:'watercolor-round', size, water, pigment, opacity })
const flat = (size: number, water: number, pigment: number, opacity: number): BrushPreset => ({ brushId:'flat-wash', size, water, pigment, opacity })
const multiply = (maskUrl: string, color: string, alpha: number): ExamplePaint => ({ maskUrl, color, alpha, blend:'multiply' })
const screen = (maskUrl: string, color: string, alpha: number): ExamplePaint => ({ maskUrl, color, alpha, blend:'screen' })

/** Fixed material tints, each pulled toward the lighting palette before use. */
const materials = {
  plaster:'#A3AFB5', wood:'#B07D47', linen:'#D9D2C3', curtain:'#E6A98F', sky:'#9CC3E3', nightSky:'#55688C',
  ceramic:'#C6D2DA', lemon:'#F1C318', bowl:'#B89A7A', book:'#8F665A', sash:'#A8713F', leaf:'#6F9A3C',
  eucalyptus:'#8CA592', terracotta:'#C97A3E', glass:'#BBD1D9', detail:'#5A4832',
}

export function windowStillLifeColors(palette: GuideContext['palette'], time: GuideContext['time']) {
  return {
    paleBase: mixHex(palette.base, '#FFFFFF', .4),
    wall: mixHex(materials.plaster, palette.base, .2),
    table: mixHex(materials.wood, palette.base, .35),
    cloth: mixHex(materials.linen, palette.light, .3),
    curtain: mixHex(materials.curtain, palette.base, .3),
    sky: time === 'night' ? mixHex(materials.nightSky, palette.base, .4) : mixHex(materials.sky, palette.light, .2),
    ceramic: mixHex(materials.ceramic, palette.shadow, .2),
    lemon: mixHex(materials.lemon, palette.base, .25),
    bowl: mixHex(materials.bowl, palette.local, .35),
    book: mixHex(materials.book, palette.local, .3),
    sash: mixHex(materials.sash, palette.local, .35),
    leaf: mixHex(materials.leaf, palette.foliage, .4),
    eucalyptus: mixHex(materials.eucalyptus, palette.foliage, .4),
    terracotta: mixHex(materials.terracotta, palette.local, .35),
    glass: mixHex(materials.glass, palette.light, .3),
    shadow: palette.shadow,
    light: palette.light,
    detail: mixHex(materials.detail, palette.shadow, .3),
  }
}

export function buildWindowStillLifeSteps({ scene, time, kind, direction, palette, shadowUrl, highlightUrl, mask, overlay }: GuideContext): readonly GuideStep[] {
  const color = windowStillLifeColors(palette, time)
  const heading = directions.find(value => value.id === direction)!
  const lowAngle = shadowUrl.includes('long-shadow')
  const soft = kind === 'sky'
  const night = time === 'night'
  const litSide = direction.includes('left') ? '왼쪽' : '오른쪽'
  const shadeSide = direction.includes('left') ? '오른쪽' : '왼쪽'
  /** Under direct daylight one upper pane carries the light; overcast sky and the night lamp light no pane in particular. */
  const litPane = !soft && !night
  const all = scene.regions.map(region => region.id)
  const step = (data: Omit<GuideStep,'preserveWhiteRegionIds'|'completionHint'> & Partial<Pick<GuideStep,'preserveWhiteRegionIds'|'completionHint'>>): GuideStep => ({ preserveWhiteRegionIds:[], completionHint:'표시된 영역이 고르게, 아직은 옅게 덮였나요?', ...data })
  const wetTip = '마르기 전(1분 안)에는 겹쳐 칠해도 같은 농도예요. 다 덮지 못했으면 바로 이어서 칠하세요. 말린 뒤에 겹치면 진해져요.'
  return [
    step({
      id:'wash-all', title:'전체 바탕 워시 깔기',
      instruction:'종이 전체를 넓은 평붓으로 아주 옅은 바탕색으로 덮어요. 붓을 떼지 않고 왼쪽 위에서 지그재그로 왔다 갔다 하며 아래까지 한 번에 내려와요. 창문 유리 위도 그냥 지나가요.',
      rationale:`수채화는 밝은 종이 위에 옅은 색을 겹쳐요. 첫 워시가 그림 전체의 분위기를 정해요. ${palette.note}`,
      tip:wetTip,
      targetRegionIds:all, technique:'flat-wash',
      palette:[{color:color.paleBase,label:'아주 옅은 바탕색',mixingNote:'바탕색에 물을 많이 섞어 거의 비치게 만들어요.'}],
      suggestedBrush:flat(90,.9,.2,.55),
      example:scene.regions.map(region => multiply(mask(region.id),color.paleBase,.35)),
      completionHint:'종이가 전체적으로 아주 옅게 물들었나요? 아직 흰 종이처럼 보여도 괜찮아요.',
    }),
    step({
      id:'wash-wall', title:'벽에 두 번째 워시 더하기',
      instruction:'첫 워시가 마른 느낌이 들면 벽과 창틀을 옅은 회색빛 벽색으로 한 번 더 덮어요. 창문 왼쪽 벽, 창문 위, 창문 오른쪽 순서로 붓을 떼지 않고 위아래로 왔다 갔다 해요. 유리 여섯 칸은 건너뛰어요.',
      rationale:'벽이 첫 워시보다 조금 진하고 차가워야 테이블 위 물체가 앞으로 나와 보여요. 유리는 그림에서 가장 밝은 곳이라 지금은 비워 둬요.',
      tip:`유리에 조금 묻어도 괜찮아요. ${litPane?`다만 ${litSide} 위 칸은 빛이 들어오는 칸이니 꼭 비워 두세요. `:''}커튼은 다음에 따로 칠하니 지나가도 돼요.`,
      targetRegionIds:['wall'], technique:'flat-wash', overlayUrl:overlay('plaster'),
      palette:[{color:color.wall,label:'벽의 회색빛 바탕색',mixingNote:'첫 워시 색에 회색을 조금 섞고 물을 조금 덜 넣어요.'}],
      suggestedBrush:flat(60,.8,.35,.6),
      example:[multiply(overlay('plaster'),color.wall,.45)],
      completionHint:'유리 여섯 칸이 벽보다 밝게 남아 있나요?',
    }),
    step({
      id:'wash-table', title:'테이블에 나무색 깔기',
      instruction:'평붓을 널빤지 방향으로 눕혀 테이블을 따뜻한 황토색으로 덮어요. 한 널빤지씩 왼쪽에서 오른쪽으로 길게 긋고, 접힌 천은 피해서 천 둘레의 테이블만 칠해요. 그릇과 유리병 위는 지나가도 괜찮아요.',
      rationale:'테이블이 벽보다 따뜻하고 진해야 벽과 테이블이 나뉘고 그림에 앞뒤가 생겨요.',
      tip:'앞쪽 널빤지로 올수록 조금 더 진하게 칠하면 가까워 보여요. 서랍 앞판도 같은 색으로 한 번에 지나가요.',
      targetRegionIds:['table'], technique:'flat-wash',
      palette:[{color:color.table,label:'테이블의 황토색',mixingNote:'황토색에 바탕색을 조금 섞어요.'}],
      suggestedBrush:flat(60,.75,.4,.65),
      example:[multiply(mask('table'),color.table,.5)],
    }),
    step({
      id:'cloth', title:'접힌 천에 옅은 회색 넣기',
      instruction:'둥근 붓으로 접힌 천을 아주 옅은 따뜻한 회색으로 칠해요. 주름 선을 따라 붓을 길게 움직이고, 천 가운데의 가장 밝은 부분은 종이색을 남겨요.',
      rationale:'흰 천도 완전히 흰색이 아니에요. 옅은 회색이 들어가야 주름과 접힌 모서리가 보여요.',
      tip:'주름의 골 안쪽만 한 번 더 지나가면 접힌 느낌이 살아요. 천의 가장자리 단 안쪽에서 붓을 멈춰요.',
      targetRegionIds:['cloth'], technique:'wet-on-wet',
      palette:[{color:color.cloth,label:'천의 옅은 회색',mixingNote:'회색에 바탕색을 아주 조금 섞고 물을 많이 넣어요.'}],
      suggestedBrush:round(24,.7,.3,.45),
      example:[multiply(mask('cloth'),color.cloth,.35)],
      completionHint:'천의 주름 골은 옅은 회색, 가운데는 종이색인가요?',
    }),
    step({
      id:'curtain', title:'커튼에 분홍빛 넣기',
      instruction:'커튼을 부드러운 분홍빛으로 위에서 아래로 세로로 쓸어요. 주름 하나에 한 번씩 붓을 내려요. 묶인 띠 아래쪽은 한 번 더 지나가면 퍼지는 느낌이 나요.',
      rationale:'커튼의 따뜻한 분홍이 차가운 창밖과 나란히 있어야 창가가 아늑해 보여요. 세로로만 움직인 붓질이 그대로 주름이 돼요.',
      tip:'붓을 세로로만 움직여요. 커튼 가장자리 선 안쪽에서 멈추면 깔끔하고, 묶인 띠 위는 비워 두어도 좋아요.',
      targetRegionIds:['curtain'], technique:'flat-wash',
      palette:[{color:color.curtain,label:'커튼의 분홍빛',mixingNote:'분홍에 주황을 조금 섞고 물을 많이 넣어요.'}],
      suggestedBrush:flat(40,.8,.3,.6),
      example:[multiply(mask('curtain'),color.curtain,.4)],
      completionHint:'커튼의 주름이 세로 줄로 보이나요?',
    }),
    step({
      id:'glass', title:night?'창밖에 밤하늘 넣기':'창밖에 옅은 하늘색 넣기',
      instruction:`유리 여섯 칸을 아주 옅은 ${night?'밤하늘색':'하늘색'}으로 칸마다 한 번씩 위에서 아래로 쓸어내려요. 창살과 화분 잎 위는 지나가도 괜찮아요.`,
      rationale:night?'밤의 창밖은 방 안보다 어두워요. 그래도 한 번만 옅게 칠해야 유리가 무거워지지 않아요.':'창밖은 그림에서 가장 밝고 차가운 곳이에요. 아주 옅게 칠해야 빛이 들어오는 느낌이 나요.',
      tip:litPane?`${litSide} 위 칸은 빛이 가장 세게 들어오는 곳이에요. 거의 흰색으로 남기거나 아래쪽 절반만 살짝 칠해요.`:soft?'흐린 날엔 여섯 칸을 같은 농도로 칠해요. 칸마다 한 번씩만 지나가요.':'밤에는 여섯 칸을 같은 농도로 칠해요. 칸마다 한 번씩만 지나가요.',
      targetRegionIds:['wall'], technique:'flat-wash', overlayUrl:overlay('glass'),
      palette:[{color:color.sky,label:night?'창밖의 밤하늘색':'창밖의 옅은 하늘색',mixingNote:night?'남청색에 바탕색을 섞고 물을 많이 넣어요.':'하늘색에 물을 아주 많이 섞어 거의 비치게 해요.'}],
      // Day glass is the palest flat pass of the guide (.256 ≈ example .25); the night sky is as dense as the curtain.
      suggestedBrush:night?flat(40,.8,.3,.6):flat(40,.9,.2,.4),
      example:[multiply(overlay('glass'),color.sky,night?.4:.25)],
      completionHint:night?'유리 여섯 칸이 벽보다 어둡고 차가운 남청색인가요?':'유리 여섯 칸이 벽보다 차갑고 밝은 색인가요?',
    }),
    step({
      id:'teaset', title:'찻주전자와 컵 칠하기',
      instruction:`찻주전자와 컵·접시를 차가운 도자기 회색으로 옅게 칠해요. 둥근 몸통을 따라 붓을 돌리고, 빛이 오는 ${litSide} 쪽 면은 종이색을 남겨요. 뚜껑 아래와 손잡이 안쪽은 한 번 더 지나가요.`,
      rationale:'작은 물체라도 밝은 면을 남기면 반짝이는 도자기처럼 보여요. 회색이 차가워야 노란 레몬과 따뜻한 테이블이 더 살아나요.',
      tip:'붓에 물을 조금만 묻히고 짧게 움직여요. 접시는 가장자리만 따라 그리고 가운데는 비워 둬요.',
      targetRegionIds:['teapot','cup'], technique:'flat-wash',
      palette:[{color:color.ceramic,label:'도자기의 회색',mixingNote:'회색에 파란색을 아주 조금 섞어요.'}],
      suggestedBrush:round(14,.5,.4,.45),
      example:[multiply(mask('teapot'),color.ceramic,.4),multiply(mask('cup'),color.ceramic,.35)],
      completionHint:`찻주전자의 ${litSide} 쪽이 종이색으로 남아 있나요?`,
    }),
    step({
      id:'lemons', title:'레몬과 그릇 칠하기',
      instruction:'레몬 세 개를 따뜻한 노란색으로 칠해요. 가운데를 먼저 찍고 둥글게 넓히며, 꼭지 반대쪽 윗면은 조금 남겨요. 그릇은 두 번째 색으로 바꿔 테두리를 따라 둥글게 칠하고 앞면은 아래로 내려 그어요.',
      rationale:'노란 레몬은 이 그림에서 가장 선명한 색이에요. 그릇이 레몬보다 탁해야 레몬이 앞으로 나와요.',
      tip:'레몬끼리 닿는 곳은 붓을 떼었다가 다시 시작해요. 그릇 안쪽 뒤 테두리는 가늘게 한 번만 그어요.',
      targetRegionIds:['fruit'], technique:'wet-on-wet', overlayUrl:overlay('lemons'),
      palette:[{color:color.lemon,label:'레몬의 노란색',mixingNote:'레몬 노랑에 바탕색을 조금 섞어요.'},{color:color.bowl,label:'그릇의 흙색',mixingNote:'갈색에 회색을 조금 섞어요.'}],
      suggestedBrush:round(14,.6,.5,.5),
      example:[multiply(overlay('lemons'),color.lemon,.55),multiply(overlay('bowl'),color.bowl,.45)],
      completionHint:'레몬 세 개가 그릇보다 밝고 선명한가요?',
    }),
    step({
      id:'books-sash', title:'책과 창틀 나무 칠하기',
      instruction:'책 두 권의 표지와 옆면을 붉은 갈색으로 칠해요. 윗면은 한 번, 옆면은 두 번 지나가요. 그다음 두 번째 색(나무색)으로 바꿔 창틀의 긴 막대와 창턱을 한 번에 그어요. 가로는 왼쪽에서 오른쪽으로, 세로는 위에서 아래로요.',
      rationale:'창틀에 나무색이 들어가면 유리가 더 밝아 보이고 창문의 구조가 또렷해져요. 책은 천 위에서 가장 진한 덩어리예요.',
      tip:'창틀처럼 가는 막대는 붓끝으로 천천히 한 번에 그어요. 조금 삐져나와도 위에 놓인 선화가 정리해 줘요.',
      targetRegionIds:['books','wall'], technique:'dry-brush', overlayUrl:overlay('sash'),
      palette:[{color:color.book,label:'책 표지의 붉은 갈색',mixingNote:'갈색에 빨강을 조금 섞어요.'},{color:color.sash,label:'창틀의 나무색',mixingNote:'번트 시에나에 바탕색을 조금 섞어요.'}],
      suggestedBrush:round(12,.5,.5,.5),
      example:[multiply(mask('books'),color.book,.5),multiply(overlay('sash'),color.sash,.45)],
      completionHint:'창틀 막대가 모두 이어졌고 책 옆면이 윗면보다 진한가요?',
    }),
    step({
      id:'herbs-vase', title:'허브와 유리병 칠하기',
      instruction:'작은 둥근 붓으로 창가 허브의 잎을 하나씩 초록으로 찍고, 화분은 두 번째 색(테라코타)으로 바꿔 위에서 아래로 칠해요. 유리병은 세 번째 색으로 바꿔 양쪽 가장자리와 물이 담긴 아래쪽만 옅게 칠하고, 병에 꽂힌 잎은 다시 초록으로 톡톡 찍어요.',
      rationale:'초록이 들어가면 그림에 생기가 생겨요. 유리병은 전부 칠하지 않고 가장자리만 칠해야 투명하게 보여요.',
      tip:'잎 가장자리 선까지 꽉 채우지 말고 선 안쪽에서 멈추면 깔끔해요. 유리병 가운데는 종이색을 남겨요.',
      targetRegionIds:['plants','vase'], technique:'wet-on-wet', overlayUrl:overlay('herb-leaves'),
      palette:[{color:color.leaf,label:'잎의 초록',mixingNote:'초록에 바탕색을 섞어 채도를 살짝 낮춰요.'},{color:color.terracotta,label:'화분의 테라코타',mixingNote:'주황에 갈색을 조금 섞어요.'},{color:color.glass,label:'유리병의 옅은 청회색',mixingNote:'하늘색에 회색을 조금 섞고 물을 많이 넣어요.'}],
      suggestedBrush:round(10,.6,.5,.5),
      example:[multiply(overlay('herb-leaves'),color.leaf,.5),multiply(overlay('herb-pot'),color.terracotta,.5),multiply(overlay('eucalyptus'),color.eucalyptus,.45),multiply(overlay('vase-glass'),color.glass,.3)],
      completionHint:'잎마다 조금씩 다른 농도의 초록이 들어갔고, 유리병 가운데는 비어 있나요?',
    }),
    step({
      id:'shadow-cast', title:'천과 테이블에 그림자 놓기',
      instruction:`빛은 ${heading.label}에서 와요. 찻주전자·컵·그릇·책·유리병이 천과 테이블에 떨어뜨리는 그림자와 창턱 위 화분의 그림자를 차가운 청회색으로 한 번에 칠해요. 물체 밑동에서 시작해 ${shadeSide}으로 끌어내요.${lowAngle?' 낮은 빛이라 그림자가 길게 늘어져요.':''}`,
      rationale:soft?'흐린 빛에서는 그림자가 옅고 경계가 부드러워요. 그래도 물체 밑은 조금 어둡게 해야 테이블 위에 놓여 있어 보여요.':'그림자가 들어가야 물체가 천 위에 놓인 것처럼 보여요. 검정 대신 청회색을 쓰면 그림이 탁해지지 않아요.',
      tip:`그림자 띠는 평붓 폭에 맞춰 한 번에 덮어요. ${wetTip}`,
      targetRegionIds:['table','cloth','books','teapot','cup','fruit','vase','plants','wall'], technique:'graded-wash', overlayUrl:shadowUrl,
      palette:[{color:color.shadow,label:'그림자색',mixingNote:'검정 대신 청회색 또는 보라를 바탕색에 섞어요.'}],
      // The cast shadows of this scene are thin bands (teapot 18–30 px, vase 20, bowl ~30, saucer ~50): a 32 flat
      // (core ≈22 px at water .6) lays them in one pass; only the long low-light shadows take the wider 44.
      suggestedBrush:flat(lowAngle?44:32,soft?.85:.6,soft?.25:.3,soft?.45:.6),
      example:[multiply(shadowUrl,color.shadow,soft?.3:.4)],
      completionHint:`그림자가 모두 물체의 ${shadeSide}으로 떨어졌나요?`,
    }),
    step({
      id:'shadow-faces', title:'물체 바로 밑 그림자 겹치기',
      instruction:`같은 색으로 표시된 그림자 중 물체에 바로 붙은 곳과 물체의 그늘진 ${shadeSide} 면만 한 번 더 지나가요. 찻주전자 몸통의 ${shadeSide} 쪽, 컵 옆면, 그릇 밑, 책 밑이에요. 그림자의 바깥쪽은 그대로 두어야 안쪽이 더 어두워 보여요.`,
      rationale:'마른 색 위에 투명한 색을 겹치면 아래 색이 비치면서 명도가 깊어져요. 이렇게 물체에 무게가 생겨요.',
      tip:'한 번 지나간 곳은 다시 문지르지 않아요. 두 번째 겹침은 물체 밑동처럼 가장 어두운 곳에만요.',
      targetRegionIds:['table','cloth','books','teapot','cup','fruit','vase'], technique:'glazing', overlayUrl:shadowUrl,
      palette:[{color:color.shadow,label:'겹칠 그림자색',mixingNote:'앞 단계의 색을 조금 더 진하게 섞어요.'}],
      suggestedBrush:round(26,.4,.65,.4),
      example:[multiply(shadowUrl,color.shadow,.25)],
      completionHint:'물체 바로 밑이 그림자의 바깥쪽보다 어둡게 보이나요?',
    }),
    step({
      id:'light', title:'빛 닿는 밝은 면 살리기',
      instruction:`표시된 밝은 면에 색이 올라가 있다면 도구에서 \`지우개\`를 누르고 좁은 띠로만 살살 닦아 종이색이 다시 비치게 해요. 찻주전자 몸통과 뚜껑의 ${litSide} 쪽, 컵과 그릇의 ${litSide} 가장자리, 유리병의 ${litSide} 면이에요. 아직 종이색이면 그대로 두세요.`,
      rationale:'수채화의 빛은 흰 물감이 아니라 남겨둔 종이예요. 밝은 면이 좁고 또렷해야 그림자가 더 진해 보여요.',
      tip:'지우개도 추천 크기 그대로 써요. 살짝 눌러 한 번 지나가고, 더 밝게 하고 싶은 곳만 한 번 더 닦아요. 표시보다 넓게 문지르지 않아요.',
      targetRegionIds:['teapot','cup','fruit','vase','plants','books'], technique:'lifting', overlayUrl:highlightUrl,
      palette:[{color:color.light,label:'빛의 색',mixingNote:'색을 더하기보다 종이색을 남기는 단계예요.'}],
      suggestedBrush:round(12,.5,.25,.35),
      example:[screen(highlightUrl,color.light,.5)],
      completionHint:'가장 밝은 곳이 좁은 띠로 종이색 그대로 남아 있나요?',
    }),
    step({
      id:'details', title:'작은 디테일로 마무리',
      instruction:'가는 붓으로 레몬 꼭지, 찻주전자의 무늬 띠, 책등의 선, 천의 바느질 선처럼 눈에 띄는 작은 선만 몇 개 더해요. 가이드를 끄고 전체를 보며 부족한 곳만 짚어요.',
      rationale:'디테일은 몇 군데만 있어도 충분해요. 모든 곳을 똑같이 그리면 밝은 면과 그림자의 대비가 사라져요.',
      tip:'붓끝으로 짧게 톡톡 찍어요. 길게 끌면 선이 두꺼워져요.',
      targetRegionIds:all, technique:'dry-brush',
      palette:[{color:color.detail,label:'디테일 색',mixingNote:'물을 적게 써 좁은 부분만 짚어주세요.'},{color:color.sash,label:'나무 모서리',mixingNote:'창틀과 그릇 테두리에 짧게 써요.'}],
      suggestedBrush:round(6,.2,.65,.65),
      example:[],
      completionHint:'가이드를 껐을 때도 창문에서 빛이 들어오는 게 느껴지나요?',
    }),
  ]
}
