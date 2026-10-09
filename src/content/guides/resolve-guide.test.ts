import { expect, test } from 'vitest'
import { access } from 'node:fs/promises'
import { readyScenes } from '../scenes.catalog'
import { directions, supportedLightKinds, timeLabels } from '../lighting-options'
import type { TimeOfDay } from '../../domain/lighting'
import { resolveGuide } from './resolve-guide'

test('every supported combination has valid unique guides and existing aligned assets', async () => {
  const ids=new Set<string>()
  for(const scene of readyScenes) for(const time of Object.keys(timeLabels) as TimeOfDay[]) for(const kind of supportedLightKinds(scene.id,time)) for(const direction of directions){
    const guide=resolveGuide(scene,time,kind,direction.id)
    expect(ids.has(guide.id)).toBe(false);ids.add(guide.id)
    expect(scene.guideIds).toContain(guide.id)
    expect(guide.steps).toHaveLength(5)
    for(const step of guide.steps){
      for(const region of [...step.targetRegionIds,...step.preserveWhiteRegionIds])expect(scene.regions.map(r=>r.id)).toContain(region)
      if(step.overlayUrl)await access(`public${step.overlayUrl}`)
    }
  }
  expect(ids.size).toBeGreaterThan(100)
})
test('night rejects sun and directions change both lighting and shadow masks', () => {
  const scene=readyScenes[0]
  expect(()=>resolveGuide(scene,'night','sun','left')).toThrow()
  const a=resolveGuide(scene,'afternoon','window','left'),b=resolveGuide(scene,'afternoon','window','right')
  expect(a.steps[2].overlayUrl).not.toBe(b.steps[2].overlayUrl)
  expect(a.lighting.primary.azimuthDeg).toBe(270)
  expect(a.steps[0].palette[0].color).not.toBe(resolveGuide(scene,'night','lamp','left').steps[0].palette[0].color)
  expect(a.steps[2].overlayUrl).not.toBe(resolveGuide(scene,'evening','window','left').steps[2].overlayUrl)
})
