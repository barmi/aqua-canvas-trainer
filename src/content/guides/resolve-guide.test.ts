import { expect, test } from 'vitest'
import { access } from 'node:fs/promises'
import { readyScenes } from '../scenes.catalog'
import { directions, supportedLightKinds, timeLabels } from '../lighting-options'
import type { TimeOfDay } from '../../domain/lighting'
import { flatWashProfile } from '../../engine/brush/watercolor'
import { backgroundRegionIds, resolveGuide } from './resolve-guide'

const brushIds = ['watercolor-round','flat-wash']
const unit = (value: number) => value >= 0 && value <= 1

test('every supported combination has valid unique guides, complete brushes and existing aligned assets', async () => {
  const ids=new Set<string>()
  const checked=new Set<string>()
  const exists=async(url:string)=>{ if(checked.has(url))return; await access(`public${url}`); checked.add(url) }
  for(const scene of readyScenes) for(const time of Object.keys(timeLabels) as TimeOfDay[]) for(const kind of supportedLightKinds(scene.id,time)) for(const direction of directions){
    const guide=resolveGuide(scene,time,kind,direction.id)
    expect(ids.has(guide.id)).toBe(false);ids.add(guide.id)
    expect(scene.guideIds).toContain(guide.id)
    expect(guide.steps.length).toBeGreaterThanOrEqual(5)
    expect(new Set(guide.steps.map(step=>step.id)).size).toBe(guide.steps.length)
    for(const step of guide.steps){
      for(const region of [...step.targetRegionIds,...step.preserveWhiteRegionIds])expect(scene.regions.map(r=>r.id)).toContain(region)
      if(step.overlayUrl)await exists(step.overlayUrl)
      for(const paint of step.example){
        await exists(paint.maskUrl)
        expect(unit(paint.alpha)).toBe(true)
        expect(paint.color).toMatch(/^#[0-9a-f]{6}$/i)
      }
      const brush=step.suggestedBrush
      expect(brushIds).toContain(brush.brushId)
      expect(brush.size).toBeGreaterThanOrEqual(2);expect(brush.size).toBeLessThanOrEqual(120)
      expect(unit(brush.water)&&unit(brush.pigment)&&unit(brush.opacity)).toBe(true)
      expect(step.palette.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      // One pass of a flat preset must land on the tint the step's example shows, so a beginner matching
      // the picture never has to overlap rows: every example tint of a flat step, within .05.
      if(brush.brushId==='flat-wash')for(const paint of step.example)expect(flatWashProfile(brush).interior).toBeCloseTo(paint.alpha,1)
    }
    if(scene.id==='reference-plant-room'||scene.id==='window-still-life'){
      expect(guide.version).toBe(2)
      expect(guide.steps.length).toBeGreaterThanOrEqual(scene.id==='window-still-life'?12:10)
      expect(guide.steps[0].suggestedBrush.brushId).toBe('flat-wash')
      expect(guide.steps.some(step=>step.technique==='lifting')).toBe(true)
    } else {
      expect(guide.version).toBe(1)
      expect(guide.steps.map(step=>step.id)).toEqual(['wash','local-color','shadow','glaze','finish'])
      expect(guide.steps[0].suggestedBrush.brushId).toBe('flat-wash')
    }
  }
  expect(ids.size).toBeGreaterThan(100)
})
test('generic example tints follow the regions, overlays and palette of each step', () => {
  const scene=readyScenes.find(value=>value.id==='lakeside')!
  const guide=resolveGuide(scene,'morning','sun','left')
  const [wash,local,shadow,glaze,finish]=guide.steps
  // The first wash covers the large planes (sky, mountains, water, shore), not only the sky.
  expect(wash.example.map(paint=>paint.maskUrl)).toEqual(['sky','mountains','water','shore'].map(id=>scene.regions.find(region=>region.id===id)!.maskUrl))
  expect(wash.targetRegionIds).toEqual(['sky','mountains','water','shore'])
  expect(wash.example.every(paint=>paint.blend==='multiply'&&paint.color===wash.palette[0].color)).toBe(true)
  expect(local.example.map(paint=>paint.maskUrl)).toEqual(scene.regions.filter(region=>!backgroundRegionIds.includes(region.id)).map(region=>region.maskUrl))
  expect(local.example.find(paint=>paint.maskUrl.endsWith('tree.svg'))!.color).toBe(local.palette[1].color)
  expect(local.example.find(paint=>paint.maskUrl.endsWith('boat.svg'))!.color).toBe(local.palette[0].color)
  // Outdoor scenes with ground regions wash the ground too, and stone buildings take a paler local tint.
  for(const [id,ground] of [['garden-path',['sky','grass','path']],['old-town-street',['sky','far-facade','road']]] as const){
    const outdoor=resolveGuide(readyScenes.find(value=>value.id===id)!,'afternoon','sun','left')
    expect(outdoor.steps[0].targetRegionIds).toEqual(ground)
    expect(outdoor.steps[0].example).toHaveLength(ground.length)
  }
  const street=resolveGuide(readyScenes.find(value=>value.id==='old-town-street')!,'afternoon','sun','left').steps[1]
  expect(street.example.find(paint=>paint.maskUrl.endsWith('left-buildings.svg'))!.alpha).toBe(.3)
  expect(street.example.find(paint=>paint.maskUrl.endsWith('crates.svg'))!.alpha).toBe(.45)
  expect(shadow.example).toEqual([{maskUrl:shadow.overlayUrl,color:shadow.palette[0].color,alpha:.45,blend:'multiply'}])
  expect(glaze.example[0].alpha).toBeLessThan(shadow.example[0].alpha)
  expect(finish.example[0]).toMatchObject({maskUrl:finish.overlayUrl,blend:'screen'})
  expect(guide.steps.every(step=>step.tip)).toBe(true)
  // The shadow brush is wide enough to lay a cast shadow in one pass, and the wash tip explains the wet wash.
  expect(shadow.suggestedBrush).toMatchObject({brushId:'watercolor-round',size:34})
  expect(wash.tip).toContain('마르기 전(1분 안)에는 겹쳐 칠해도 같은 농도예요')
})
test('the window still life guide washes, then paints each object group through named guide masks, then shadows and light', () => {
  const scene=readyScenes.find(value=>value.id==='window-still-life')!
  const day=resolveGuide(scene,'afternoon','window','upper-right'),night=resolveGuide(scene,'night','lamp','upper-right')
  const mask=(id:string)=>scene.regions.find(region=>region.id===id)!.maskUrl
  const guideMask=(name:string)=>`${mask('wall').replace(/masks\/wall\.svg$/,'')}guides/${name}.svg`
  const find=(id:string)=>day.steps.find(step=>step.id===id)!
  expect(day.version).toBe(2)
  expect(day.steps.map(step=>step.id)).toEqual(['wash-all','wash-wall','wash-table','cloth','curtain','glass','teaset','lemons','books-sash','herbs-vase','shadow-cast','shadow-faces','light','details'])
  // The first wash is all-over: every region, the same pale tint, with the widest flat brush.
  expect(day.steps[0].targetRegionIds).toEqual(scene.regions.map(region=>region.id))
  expect(day.steps[0].example.map(paint=>paint.maskUrl)).toEqual(scene.regions.map(region=>region.maskUrl))
  expect(day.steps[0].example.every(paint=>paint.alpha===.35&&paint.color===day.steps[0].palette[0].color)).toBe(true)
  expect(day.steps[0].suggestedBrush).toMatchObject({brushId:'flat-wash',size:90})
  expect(day.steps.filter(step=>step.suggestedBrush.brushId==='flat-wash').map(step=>step.id)).toEqual(['wash-all','wash-wall','wash-table','curtain','glass','shadow-cast'])
  // The wall wash skips the panes: it tints the plaster guide, not the wall region, so the window stays bright
  // until the pale sky lands on the glass guide.
  expect(find('wash-wall').example).toEqual([{maskUrl:guideMask('plaster'),color:find('wash-wall').palette[0].color,alpha:.45,blend:'multiply'}])
  expect(find('wash-wall').overlayUrl).toBe(guideMask('plaster'))
  expect(find('wash-wall').instruction).toContain('유리')
  // Curtain and glass are separate steps so each flat preset is calibrated to its own tint (day glass .25, curtain .4).
  const curtain=find('curtain'),glass=find('glass')
  expect(curtain.example).toEqual([{maskUrl:mask('curtain'),color:curtain.palette[0].color,alpha:.4,blend:'multiply'}])
  expect(glass.example).toEqual([{maskUrl:guideMask('glass'),color:glass.palette[0].color,alpha:.25,blend:'multiply'}])
  expect(glass.overlayUrl).toBe(guideMask('glass'))
  expect(glass.suggestedBrush.opacity).toBeLessThan(curtain.suggestedBrush.opacity)
  // The pane to keep white follows the light: upper-right by default, upper-left when the light comes from the left,
  // and no pane at all under an overcast sky or the night lamp.
  const tipOf=(guide:typeof day,id:string)=>guide.steps.find(step=>step.id===id)!.tip!
  expect(find('wash-wall').tip).toContain('오른쪽 위 칸')
  expect(glass.tip).toContain('오른쪽 위 칸')
  const left=resolveGuide(scene,'afternoon','window','left')
  expect(tipOf(left,'wash-wall')).toContain('왼쪽 위 칸')
  expect(tipOf(left,'glass')).toContain('왼쪽 위 칸')
  const overcast=resolveGuide(scene,'afternoon','sky','upper-right')
  expect(tipOf(overcast,'glass')).toContain('흐린 날')
  expect(tipOf(overcast,'glass')+tipOf(overcast,'wash-wall')).not.toContain('위 칸')
  expect(tipOf(night,'glass')+tipOf(night,'wash-wall')).not.toContain('위 칸')
  // Lemons and bowl, books and window wood, herbs and vase each split a region through named guide masks.
  expect(find('lemons').example.map(paint=>[paint.maskUrl,paint.color])).toEqual([[guideMask('lemons'),find('lemons').palette[0].color],[guideMask('bowl'),find('lemons').palette[1].color]])
  expect(find('books-sash').example.map(paint=>paint.maskUrl)).toEqual([mask('books'),guideMask('sash')])
  expect(find('books-sash').overlayUrl).toBe(guideMask('sash'))
  expect(find('herbs-vase').example.map(paint=>paint.maskUrl)).toEqual(['herb-leaves','herb-pot','eucalyptus','vase-glass'].map(guideMask))
  expect(find('herbs-vase').palette).toHaveLength(3)
  // Cast shadows go down in one flat pass of a brush no wider than the scene's thin shadow bands (32; 44 only for
  // the long low-light shadows), the shaded faces move to the round glaze, and the light is lifted narrowly.
  const cast=find('shadow-cast'),faces=find('shadow-faces'),light=find('light')
  expect(cast.suggestedBrush).toMatchObject({brushId:'flat-wash',size:32})
  expect(resolveGuide(scene,'evening','window','left').steps.find(step=>step.id==='shadow-cast')!.suggestedBrush.size).toBe(44)
  expect(cast.instruction).not.toContain('그늘진')
  expect(faces.instruction).toContain('그늘진 왼쪽 면')
  expect(cast.overlayUrl).toBe(day.steps.find(step=>step.id==='shadow-faces')!.overlayUrl)
  expect(cast.example[0].alpha).toBeGreaterThan(faces.example[0].alpha)
  expect(cast.tip).toContain('1분')
  expect(light.technique).toBe('lifting')
  expect(light.example[0].blend).toBe('screen')
  expect(light.instruction).toContain('지우개')
  expect(light.instruction).toContain('좁은')
  expect(light.tip).toContain('살짝 눌러')
  expect(light.suggestedBrush.size).toBeLessThanOrEqual(12)
  expect(day.steps.at(-1)!.example).toEqual([])
  expect(day.steps.at(-1)!.suggestedBrush.size).toBeLessThan(day.steps[0].suggestedBrush.size)
  const tinted=new Set(day.steps.flatMap(step=>step.example.map(paint=>paint.maskUrl)))
  for(const region of scene.regions)if(region.id!=='wall')expect(tinted.has(region.maskUrl)).toBe(true)
  for(const name of ['plaster','glass','sash','lemons','bowl','herb-leaves','herb-pot','eucalyptus','vase-glass'])expect(tinted.has(guideMask(name))).toBe(true)
  // Night keeps the step list but swaps the colours; the window shows a night sky instead of a pale one.
  expect(day.steps.map(step=>step.id)).toEqual(night.steps.map(step=>step.id))
  expect(day.steps.map(step=>step.palette[0].color)).not.toEqual(night.steps.map(step=>step.palette[0].color))
  expect(night.steps.find(step=>step.id==='glass')!.palette[0].label).toContain('밤')
  expect(resolveGuide(scene,'evening','window','left').steps.find(step=>step.id==='shadow-cast')!.instruction).toContain('길게')
  expect(resolveGuide(scene,'afternoon','window','left').steps.find(step=>step.id==='teaset')!.instruction).toContain('왼쪽')
  expect(resolveGuide(scene,'afternoon','sky','left').steps.find(step=>step.id==='shadow-cast')!.suggestedBrush.opacity).toBeLessThan(cast.suggestedBrush.opacity)
})
test('the plant room guide builds a full example from washes to light and keeps the palette per time of day', () => {
  const scene=readyScenes.find(value=>value.id==='reference-plant-room')!
  const day=resolveGuide(scene,'afternoon','window','upper-right'),night=resolveGuide(scene,'night','lamp','upper-right')
  const mask=(id:string)=>scene.regions.find(region=>region.id===id)!.maskUrl
  const guideMask=(name:string)=>`${mask('wall').replace(/masks\/wall\.svg$/,'')}guides/${name}.svg`
  // The first wash is all-over: every region, the same pale tint, with the widest flat brush.
  expect(day.steps[0].targetRegionIds).toEqual(scene.regions.map(region=>region.id))
  expect(day.steps[0].example.map(paint=>paint.maskUrl)).toEqual(scene.regions.map(region=>region.maskUrl))
  expect(day.steps[0].example.every(paint=>paint.alpha===.35&&paint.color===day.steps[0].palette[0].color)).toBe(true)
  expect(day.steps[0].suggestedBrush).toMatchObject({brushId:'flat-wash',size:90})
  expect(day.steps.filter(step=>step.suggestedBrush.brushId==='flat-wash')).toHaveLength(4)
  // Leaves, pots, cushion and chair frame are tinted through named guide masks, each with its own colour.
  const plants=day.steps.find(step=>step.id==='plants')!,cushion=day.steps.find(step=>step.id==='cushion')!,frame=day.steps.find(step=>step.id==='chair-frame')!
  expect(plants.palette).toHaveLength(2)
  expect(plants.example.map(paint=>[paint.maskUrl,paint.color])).toEqual([[guideMask('leaves'),plants.palette[0].color],[guideMask('pots'),plants.palette[1].color]])
  expect(cushion.example).toEqual([{maskUrl:guideMask('cushion'),color:cushion.palette[0].color,alpha:.6,blend:'multiply'}])
  expect(cushion.overlayUrl).toBe(guideMask('cushion'))
  expect(frame.example).toEqual([{maskUrl:guideMask('chair-frame'),color:frame.palette[0].color,alpha:.5,blend:'multiply'}])
  expect(frame.overlayUrl).toBe(guideMask('chair-frame'))
  expect(day.steps.find(step=>step.id==='shadow-floor')!.overlayUrl).toBe(day.steps.find(step=>step.id==='shadow-faces')!.overlayUrl)
  const light=day.steps.find(step=>step.id==='light')!
  expect(light.example[0].blend).toBe('screen')
  expect(light.technique).toBe('lifting')
  expect(light.instruction).toContain('지우개')
  expect(light.instruction+light.title+day.steps[1].tip).not.toContain('창문')
  expect(light.tip).toContain('살짝 눌러')
  expect(day.steps.at(-1)!.example).toEqual([])
  expect(day.steps.at(-1)!.suggestedBrush.size).toBeLessThan(day.steps[0].suggestedBrush.size)
  const tinted=new Set(day.steps.flatMap(step=>step.example.map(paint=>paint.maskUrl)))
  for(const region of scene.regions)expect(tinted.has(region.maskUrl)).toBe(true)
  expect(day.steps.map(step=>step.palette[0].color)).not.toEqual(night.steps.map(step=>step.palette[0].color))
  expect(day.steps.map(step=>step.id)).toEqual(night.steps.map(step=>step.id))
  expect(resolveGuide(scene,'evening','window','left').steps.find(step=>step.id==='shadow-floor')!.instruction).toContain('길게')
})
test('night rejects sun and directions change both lighting and shadow masks', () => {
  const scene=readyScenes[0]
  expect(()=>resolveGuide(scene,'night','sun','left')).toThrow()
  const a=resolveGuide(scene,'afternoon','window','left'),b=resolveGuide(scene,'afternoon','window','right')
  const shadowOf=(guide:typeof a)=>guide.steps.find(step=>step.technique==='graded-wash')!
  expect(shadowOf(a).overlayUrl).not.toBe(shadowOf(b).overlayUrl)
  expect(a.lighting.primary.azimuthDeg).toBe(270)
  expect(a.steps[0].palette[0].color).not.toBe(resolveGuide(scene,'night','lamp','left').steps[0].palette[0].color)
  expect(shadowOf(a).overlayUrl).not.toBe(shadowOf(resolveGuide(scene,'evening','window','left')).overlayUrl)
})
