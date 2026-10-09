import type { GuideDefinition, GuideStep } from '../../domain/guide'
import type { LightKind, TimeOfDay } from '../../domain/lighting'
import type { ReadyScene } from '../../domain/scene'
import { assetUrl } from '../assets'
import { directions, guideId, lightLabels, supportedLightKinds, timeLabels } from '../lighting-options'
import type { LightDirection } from '../lighting-options'
import { lightingPresets } from '../lighting-presets'

const palettes: Record<TimeOfDay, { base:string; local:string; foliage:string; shadow:string; light:string; note:string }> = {
  dawn:{base:'#A7B7CF',local:'#BAA1B1',foliage:'#8C9C92',shadow:'#787D9B',light:'#F1D7D3',note:'차가운 바탕에 분홍빛을 아주 옅게 더해요.'},
  morning:{base:'#DFCA85',local:'#C79B71',foliage:'#8D9F69',shadow:'#8495A8',light:'#F8EBC0',note:'밝은 곳의 종이색을 남기고 맑은 노란빛을 더해요.'},
  afternoon:{base:'#D9B65D',local:'#C08E61',foliage:'#80915D',shadow:'#6E7D91',light:'#FFF0BD',note:'옐로 오커와 차가운 청회색으로 빛과 그늘을 나눠요.'},
  evening:{base:'#DBA17B',local:'#C47F64',foliage:'#89906F',shadow:'#7C7396',light:'#F4C69A',note:'따뜻한 주황빛과 보랏빛 그림자를 대비해요.'},
  night:{base:'#667792',local:'#8B8090',foliage:'#657F7D',shadow:'#48576F',light:'#F2D9A6',note:'남청색 워시를 얇게 쌓고 조명 주변의 밝기를 남겨요.'},
}
export function resolveGuide(scene: ReadyScene, time: TimeOfDay, kind: LightKind, direction: LightDirection): GuideDefinition {
  if (!supportedLightKinds(scene.id,time).includes(kind)) throw new Error('이 장면에서 지원하지 않는 광원이에요.')
  const source = lightingPresets.find(preset => preset.settings.timeOfDay === time)!
  const heading = directions.find(value => value.id === direction)
  if (!heading) throw new Error('지원하지 않는 방향이에요.')
  const palette = {...palettes[time]}
  if (kind === 'lamp') { palette.light='#F1CD93'; palette.local='#BE946E'; palette.note+=' 실내등 가까운 면은 더 따뜻하게 남겨요.' }
  if (kind === 'moon') { palette.light='#CBD8E9'; palette.local='#8C9BB1'; palette.note='달빛의 밝은 면을 차갑고 옅게 남기고 남청색으로 그늘을 쌓아요.' }
  if (kind === 'sky') { palette.shadow='#89959F'; palette.note+=' 흐린 빛에서는 그림자의 경계를 부드럽게 풀어요.' }
  const all=scene.regions.map(region=>region.id)
  const background=scene.regions.filter(region=>['wall','sky','water','floor','table'].includes(region.id)).map(region=>region.id)
  const objects=scene.regions.filter(region=>!background.includes(region.id)).map(region=>region.id)
  const lowAngle=(time==='evening'||time==='dawn')&&kind!=='sky'&&kind!=='lamp'
  const shadow=assetUrl(`scenes/${scene.id}/guides/${direction}-${lowAngle?'long-':''}shadow.svg`)
  const highlight=assetUrl(`scenes/${scene.id}/guides/${direction}-highlight.svg`)
  const step = (data: Partial<GuideStep> & Pick<GuideStep,'id'|'title'|'instruction'|'rationale'>): GuideStep => ({
    targetRegionIds:all,preserveWhiteRegionIds:[],technique:'flat-wash',
    palette:[{color:palette.base,label:'바탕색',mixingNote:palette.note}],suggestedBrush:{water:.8,pigment:.3,opacity:.4},completionHint:'밝은 부분을 남기고 옅은 색으로 시작했나요?',...data,
  })
  return {
    id:guideId(scene.id,time,kind,direction),version:1,sceneId:scene.id,sceneVersion:scene.version,
    lighting:{...source.settings,primary:{...source.settings.primary,kind,azimuthDeg:heading.angle,color:palette.light,shadowSoftness:kind==='sky'?.95:source.settings.primary.shadowSoftness}},
    steps:[
      step({id:'wash',title:time==='night'?'밤의 바탕을 옅게 쌓기':'전체 분위기를 옅게 깔기',instruction:`${timeLabels[time]}의 ${lightLabels[kind]}을 떠올려보세요. ${palette.note}`,rationale:'수채화는 밝은 종이 위에 투명한 색을 겹쳐요. 가장 밝게 남길 곳은 처음부터 피해서 칠해요.',targetRegionIds:background}),
      step({id:'local-color',title:'물체의 큰 색면 나누기',instruction:'작은 디테일보다 잎, 가구, 산처럼 큰 덩어리의 색을 먼저 나눠요. 한 번에 진하게 칠하지 마세요.',rationale:'바탕색이 비치는 정도를 조절하면 같은 물체도 서로 다른 시간의 분위기로 보여요.',targetRegionIds:objects,technique:'wet-on-wet',palette:[{color:palette.local,label:'물체의 중간색',mixingNote:'바탕색에 황토 또는 분홍기를 조금 섞어요.'},{color:palette.foliage,label:'잎과 자연의 색',mixingNote:'초록에 바탕색을 섞어 채도를 살짝 낮춰요.'}],suggestedBrush:{water:.7,pigment:.45,opacity:.5}}),
      step({id:'shadow',title:'빛의 반대쪽에 그림자 놓기',instruction:`빛은 ${heading.label}에서 와요. 표시된 반대쪽 면과 바닥 그림자를 차가운 색으로 얇게 칠해요.${time==='evening'?' 낮은 저녁빛의 긴 그림자를 생각해보세요.':''}`,rationale:kind==='sky'?'확산광에서는 명도 차이를 작게 두고 경계를 부드럽게 만들어요.':'물체가 빛을 가리는 면과 바닥에 닿는 곳을 어둡게 하면 부피가 생겨요.',overlayUrl:shadow,technique:'graded-wash',palette:[{color:palette.shadow,label:'그림자색',mixingNote:'검정 대신 청회색 또는 보라를 바탕색에 섞어요.'}],suggestedBrush:{water:kind==='sky'?.85:.6,pigment:.5,opacity:kind==='sky'?.3:.5}}),
      step({id:'glaze',title:'마른 색 위에 한 겹 더하기',instruction:'그림자가 겹치는 곳과 물체 사이의 좁은 부분에만 같은 색을 한 번 더 얹어보세요. 넓게 덮지 않아요.',rationale:'투명한 색을 선택적으로 겹치면 첫 바탕색을 살리며 깊은 명도를 만들 수 있어요.',overlayUrl:shadow,technique:'glazing',palette:[{color:palette.shadow,label:'겹칠 그림자색',mixingNote:'앞 단계의 색을 조금 더 진하게 섞어요.'}],suggestedBrush:{water:.4,pigment:.65,opacity:.4}}),
      step({id:'finish',title:'밝은 부분을 지키며 마무리',instruction:'표시된 밝은 면은 종이색이 비치게 남겨요. 가이드를 끄고 전체 명암을 확인한 뒤 필요한 작은 선만 더해보세요.',rationale:'모든 곳을 같은 농도로 칠하지 않아야 밝은 면과 그림자가 살아나요.',overlayUrl:highlight,technique:'dry-brush',palette:[{color:palette.local,label:'작은 디테일',mixingNote:'물을 적게 써 좁은 부분만 짚어주세요.'}],suggestedBrush:{water:.2,pigment:.6,opacity:.6},completionHint:'가이드를 껐을 때도 빛이 어디서 오는지 느껴지나요?'}),
    ],
  }
}
export const defaultGuide = (scene: ReadyScene) => resolveGuide(scene,'afternoon',supportedLightKinds(scene.id,'afternoon')[0],'upper-right')
