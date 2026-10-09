import type { BrushPreset, ExamplePaint, GuideStep } from '../../domain/guide'
import { directions } from '../lighting-options'
import type { GuideContext } from './resolve-guide'

/**
 * Hand-written steps for the plant-room scene of the reference video: a beginner paints the wall,
 * floor, plants, furniture, cushion, tea set, then shadows, light and details, one small job per step.
 * Colours come from the time-of-day palette mixed with fixed material tints so every lighting stays coherent.
 * Flat-wash presets are calibrated so one pass lands on the step's example tint (resolve-guide.test checks it).
 */

/** Linear sRGB-hex mix; t=0 keeps `from`, t=1 is `to`. */
export function mixHex(from: string, to: string, t: number): string {
  const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16)
  const blend = (at: number) => Math.round(channel(from, at) * (1 - t) + channel(to, at) * t)
  return '#' + [1, 3, 5].map(at => blend(at).toString(16).padStart(2, '0')).join('')
}

const round = (size: number, water: number, pigment: number, opacity: number): BrushPreset => ({ brushId:'watercolor-round', size, water, pigment, opacity })
const flat = (size: number, water: number, pigment: number, opacity: number): BrushPreset => ({ brushId:'flat-wash', size, water, pigment, opacity })
const multiply = (maskUrl: string, color: string, alpha: number): ExamplePaint => ({ maskUrl, color, alpha, blend:'multiply' })
const screen = (maskUrl: string, color: string, alpha: number): ExamplePaint => ({ maskUrl, color, alpha, blend:'screen' })

/** Fixed material tints, each pulled toward the lighting palette before use. */
const materials = { ochre:'#AE803C', leaf:'#6F9A3C', terracotta:'#C97A3E', wood:'#A8713F', cushion:'#F0941F', frame:'#7A4E2B', ceramic:'#E8DBC6', detail:'#5A4832' }

export function plantRoomColors(palette: GuideContext['palette']) {
  return {
    paleBase: mixHex(palette.base, '#FFFFFF', .4),
    base: palette.base,
    floor: mixHex(materials.ochre, palette.base, .35),
    leaf: mixHex(materials.leaf, palette.foliage, .4),
    terracotta: mixHex(materials.terracotta, palette.local, .35),
    wood: mixHex(materials.wood, palette.local, .35),
    cushion: mixHex(materials.cushion, palette.base, .25),
    frame: mixHex(materials.frame, palette.shadow, .25),
    ceramic: mixHex(materials.ceramic, palette.light, .4),
    shadow: palette.shadow,
    light: palette.light,
    detail: mixHex(materials.detail, palette.shadow, .3),
  }
}

export function buildReferencePlantRoomSteps({ scene, kind, direction, palette, shadowUrl, highlightUrl, mask, overlay }: GuideContext): readonly GuideStep[] {
  const color = plantRoomColors(palette)
  const heading = directions.find(value => value.id === direction)!
  const lowAngle = shadowUrl.includes('long-shadow')
  const soft = kind === 'sky'
  const all = scene.regions.map(region => region.id)
  const step = (data: Omit<GuideStep,'preserveWhiteRegionIds'|'completionHint'> & Partial<Pick<GuideStep,'preserveWhiteRegionIds'|'completionHint'>>): GuideStep => ({ preserveWhiteRegionIds:[], completionHint:'표시된 영역이 고르게, 아직은 옅게 덮였나요?', ...data })
  return [
    step({
      id:'wash-all', title:'전체 바탕 워시 깔기',
      instruction:'종이 전체를 넓은 평붓으로 아주 옅은 바탕색으로 덮어요. 붓을 떼지 않고 왼쪽 위에서 지그재그로 왔다 갔다 하며 아래까지 한 번에 내려와요.',
      rationale:`수채화는 밝은 종이 위에 옅은 색을 겹쳐요. 첫 워시가 그림 전체의 분위기를 정해요. ${palette.note}`,
      tip:'평붓은 한 번의 붓질 안에서는 아무리 겹쳐도 진해지지 않아요. 붓을 뗐다가 다시 겹쳐 그으면 그 줄만 진해지니, 다 덮지 못했으면 실행 취소하고 다시 한 번에 그어요.',
      targetRegionIds:all, technique:'flat-wash',
      palette:[{color:color.paleBase,label:'아주 옅은 바탕색',mixingNote:'바탕색에 물을 많이 섞어 거의 비치게 만들어요.'}],
      suggestedBrush:flat(90,.9,.2,.55),
      example:scene.regions.map(region => multiply(mask(region.id),color.paleBase,.35)),
      completionHint:'종이가 전체적으로 아주 옅게 물들었나요? 아직 흰 종이처럼 보여도 괜찮아요.',
    }),
    step({
      id:'wash-wall', title:'벽에 두 번째 워시 더하기',
      instruction:'첫 워시가 마른 느낌이 들면 벽만 조금 더 진한 바탕색으로 한 번 더 덮어요. 붓을 떼지 않고 세로 널빤지 방향으로 위아래로 왔다 갔다 하며 벽 전체를 한 번에 덮어요.',
      rationale:'같은 색을 두 번 겹치면 벽이 첫 워시보다 조금 진해져 멀리 있는 느낌이 나요.',
      tip:'벽 위쪽은 한 번만 지나가고, 선반과 잎 위는 지나가도 괜찮아요. 나중에 잎을 그 위에 칠해요.',
      targetRegionIds:['wall'], technique:'flat-wash',
      palette:[{color:color.base,label:'벽의 바탕색',mixingNote:'첫 워시와 같은 색에 물을 조금 덜 섞어요.'}],
      suggestedBrush:flat(60,.8,.35,.6),
      example:[multiply(mask('wall'),color.base,.45)],
    }),
    step({
      id:'wash-floor', title:'바닥 널빤지에 황토색 깔기',
      instruction:'평붓을 널빤지 방향으로 눕혀 바닥을 황토색으로 덮어요. 한 널빤지씩 앞에서 뒤로 길게 긋고, 의자 다리와 테이블 다리 위를 지나가도 괜찮아요.',
      rationale:'바닥은 벽보다 조금 더 따뜻한 황토색이어야 벽과 바닥이 나뉘고 방이 깊어 보여요.',
      tip:'한 널빤지를 끝까지 긋고, 다음 널빤지는 앞 줄의 가장자리에 살짝 닿게만 시작해요. 겹친 줄은 진해져요.',
      targetRegionIds:['floor'], technique:'flat-wash',
      palette:[{color:color.floor,label:'바닥의 황토색',mixingNote:'옐로 오커에 바탕색을 조금 섞어요.'}],
      suggestedBrush:flat(60,.75,.4,.65),
      example:[multiply(mask('floor'),color.floor,.5)],
    }),
    step({
      id:'plants', title:'잎과 덩굴에 초록 넣기',
      instruction:'둥근 붓으로 잎 하나하나의 가운데를 먼저 찍고 가장자리로 넓혀요. 큰 잎은 잎맥 방향으로, 덩굴의 작은 잎은 톡톡 찍듯이 칠해요. 화분은 팔레트의 두 번째 색으로 바꿔 칠해요.',
      rationale:'초록이 들어가면 이 그림의 주인공인 식물이 벽에서 분리돼요. 잎마다 농도가 조금씩 달라야 자연스러워요.',
      tip:'잎 가장자리 선까지 꽉 채우지 말고 선 안쪽에서 멈추면 깔끔해요.',
      targetRegionIds:['plants'], technique:'wet-on-wet',
      palette:[{color:color.leaf,label:'잎의 초록',mixingNote:'초록에 바탕색을 섞어 채도를 살짝 낮춰요.'},{color:color.terracotta,label:'화분의 테라코타',mixingNote:'주황에 갈색을 조금 섞어요.'}],
      suggestedBrush:round(26,.7,.45,.5),
      example:[multiply(overlay('leaves'),color.leaf,.5),multiply(overlay('pots'),color.terracotta,.5)],
      completionHint:'잎마다 조금씩 다른 농도의 초록이 들어갔나요? 화분은 테라코타색인가요?',
    }),
    step({
      id:'wood', title:'선반과 테이블에 나무색 칠하기',
      instruction:'선반의 가로 판과 다리, 둥근 테이블의 윗면과 기둥을 나무색으로 칠해요. 가늘고 긴 부분은 붓끝으로 한 번에 그어요.',
      rationale:'가구의 색이 들어가야 식물이 어디에 놓였는지 보여요. 나무는 바닥의 황토보다 조금 붉고 어두워요.',
      tip:'테이블 윗면은 타원을 따라 둥글게, 기둥은 위에서 아래로 한 번에 그어요.',
      targetRegionIds:['shelf','table'], technique:'flat-wash',
      palette:[{color:color.wood,label:'나무색',mixingNote:'번트 시에나에 바탕색을 조금 섞어요.'}],
      suggestedBrush:round(18,.6,.5,.5),
      example:[multiply(mask('shelf'),color.wood,.45),multiply(mask('table'),color.wood,.45)],
    }),
    step({
      id:'cushion', title:'의자 쿠션에 따뜻한 색 칠하기',
      instruction:'의자의 등받이와 방석을 노란 주황색으로 넓게 칠해요. 등받이는 위에서 아래로, 방석은 앞뒤로 붓을 길게 움직여요.',
      rationale:'쿠션은 그림에서 가장 따뜻하고 진한 색면이에요. 넓게 먼저 채워야 나중에 나무틀 선이 깔끔하게 들어가요.',
      tip:'쿠션이 접히는 선 근처는 두 번 지나가 조금 더 진하게 만들어도 좋아요.',
      targetRegionIds:['chairs'], technique:'flat-wash', overlayUrl:overlay('cushion'),
      palette:[{color:color.cushion,label:'쿠션의 노란 주황',mixingNote:'카드뮴 옐로에 주황을 조금 섞어요.'}],
      suggestedBrush:round(30,.65,.5,.5),
      example:[multiply(overlay('cushion'),color.cushion,.6)],
    }),
    step({
      id:'chair-frame', title:'의자 나무틀 그리기',
      instruction:'작은 둥근 붓으로 의자의 나무 다리와 팔걸이만 갈색으로 그어요. 쿠션은 칠하지 않아요. 긴 다리는 한 번에 긋고, 다른 다리와 겹치는 곳에서는 멈췄다가 다시 시작해요.',
      rationale:'가는 나무틀에 진한 색이 들어가면 의자의 구조가 또렷해져요.',
      tip:'선이 조금 삐져나와도 괜찮아요. 위에 놓인 선화가 다시 정리해 줘요.',
      targetRegionIds:['chairs'], technique:'dry-brush', overlayUrl:overlay('chair-frame'),
      palette:[{color:color.frame,label:'나무틀의 갈색',mixingNote:'번트 엄버에 그림자색을 조금 섞어요.'}],
      suggestedBrush:round(10,.4,.6,.55),
      example:[multiply(overlay('chair-frame'),color.frame,.5)],
      completionHint:'의자 다리가 네 개 모두 바닥까지 이어졌나요?',
    }),
    step({
      id:'teaset', title:'찻주전자와 컵 칠하기',
      instruction:'찻주전자와 컵을 아주 옅은 도자기색으로 칠해요. 가장 밝은 곳은 종이색을 남기고, 뚜껑 아래와 손잡이의 그늘 쪽만 한 번 더 지나가요.',
      rationale:'작은 물체라도 밝은 면을 남기면 반짝이는 도자기처럼 보여요.',
      tip:'붓에 물을 조금만 묻히고 주전자의 둥근 면을 따라 짧게 움직여요.',
      targetRegionIds:['teaset'], technique:'flat-wash',
      palette:[{color:color.ceramic,label:'도자기색',mixingNote:'바탕색에 회색을 아주 조금 섞어요.'}],
      suggestedBrush:round(12,.5,.4,.45),
      example:[multiply(mask('teaset'),color.ceramic,.4)],
    }),
    step({
      id:'shadow-floor', title:'바닥에 드리운 그림자 놓기',
      instruction:`빛은 ${heading.label}에서 와요. 의자·테이블·화분이 바닥에 떨어뜨리는 그림자와 표시된 그늘진 면(쿠션 등받이와 화분의 그늘 쪽)을 차가운 청회색으로 한 번 칠해요. 물체와 닿는 곳에서 시작해 바깥으로 끌어내요.${lowAngle?' 낮은 빛이라 그림자가 길게 늘어져요.':''}`,
      rationale:soft?'흐린 빛에서는 그림자가 옅고 경계가 부드러워요. 그래도 의자 밑은 조금 어둡게 해야 바닥에 서 있어 보여요.':'바닥 그림자가 들어가야 의자가 바닥 위에 서 있는 것처럼 보여요. 검정 대신 청회색을 쓰면 그림이 탁해지지 않아요.',
      tip:'그림자의 바깥 가장자리는 붓에 물을 조금 더 묻혀 부드럽게 풀어요.',
      targetRegionIds:['floor','chairs','table','plants'], technique:'graded-wash', overlayUrl:shadowUrl,
      palette:[{color:color.shadow,label:'그림자색',mixingNote:'검정 대신 청회색 또는 보라를 바탕색에 섞어요.'}],
      suggestedBrush:round(26,soft?.85:.6,.5,soft?.3:.5),
      example:[multiply(shadowUrl,color.shadow,soft?.3:.4)],
      completionHint:'의자 밑이 가장 어둡고 바깥으로 갈수록 옅어지나요?',
    }),
    step({
      id:'shadow-faces', title:'물체 바로 밑 그림자 겹치기',
      instruction:'같은 색으로 표시된 그림자 중 물체에 바로 붙은 곳만 한 번 더 지나가요. 의자 밑, 테이블 다리 밑, 화분 바로 아래예요. 그림자의 바깥쪽은 그대로 두어야 안쪽이 더 어두워 보여요.',
      rationale:'마른 색 위에 투명한 색을 겹치면 아래 색이 비치면서 명도가 깊어져요. 이렇게 물체에 부피가 생겨요.',
      tip:'한 번 지나간 곳은 다시 문지르지 않아요. 두 번째 겹침은 의자 밑처럼 가장 어두운 곳에만요.',
      targetRegionIds:['chairs','table','plants','floor'], technique:'glazing', overlayUrl:shadowUrl,
      palette:[{color:color.shadow,label:'겹칠 그림자색',mixingNote:'앞 단계의 색을 조금 더 진하게 섞어요.'}],
      suggestedBrush:round(18,.4,.65,.4),
      example:[multiply(shadowUrl,color.shadow,.25)],
      completionHint:'물체 바로 밑이 그림자의 바깥쪽보다 어둡게 보이나요?',
    }),
    step({
      id:'light', title:'햇빛 닿는 밝은 면 살리기',
      instruction:'표시된 밝은 면에 색이 올라가 있다면 도구에서 `지우개`를 누르고 살살 문질러 종이색이 다시 비치게 해요. 햇빛이 닿는 쿠션 윗면과 화분, 테이블 기둥의 밝은 쪽이에요. 아직 종이색이면 그대로 두세요.',
      rationale:'수채화의 빛은 흰 물감이 아니라 남겨둔 종이예요. 밝은 면이 있어야 그림자가 더 진해 보여요.',
      tip:'지우개도 추천 크기 그대로 써요. 한 번에 다 지우지 말고 두세 번 나눠 닦아야 경계가 부드러워요.',
      targetRegionIds:['wall','floor','chairs','plants','table'], technique:'lifting', overlayUrl:highlightUrl,
      palette:[{color:color.light,label:'빛의 색',mixingNote:'색을 더하기보다 종이색을 남기는 단계예요.'}],
      suggestedBrush:round(20,.5,.25,.35),
      example:[screen(highlightUrl,color.light,.55)],
      completionHint:'가장 밝은 곳이 종이색 그대로 남아 있나요?',
    }),
    step({
      id:'details', title:'작은 디테일로 마무리',
      instruction:'가는 붓으로 잎맥, 쿠션의 바느질 선, 선반 모서리처럼 눈에 띄는 작은 선만 몇 개 더해요. 가이드를 끄고 전체를 보며 부족한 곳만 짚어요.',
      rationale:'디테일은 몇 군데만 있어도 충분해요. 모든 곳을 똑같이 그리면 밝은 면과 그림자의 대비가 사라져요.',
      tip:'붓끝으로 짧게 톡톡 찍어요. 길게 끌면 선이 두꺼워져요.',
      targetRegionIds:all, technique:'dry-brush',
      palette:[{color:color.detail,label:'디테일 색',mixingNote:'물을 적게 써 좁은 부분만 짚어주세요.'},{color:color.frame,label:'나무 모서리',mixingNote:'의자와 선반의 모서리에 짧게 써요.'}],
      suggestedBrush:round(6,.2,.65,.65),
      example:[],
      completionHint:'가이드를 껐을 때도 빛이 어디서 오는지 느껴지나요?',
    }),
  ]
}
