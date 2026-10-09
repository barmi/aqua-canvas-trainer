// Scene artwork registry. Each scene lives in scripts/scenes/<id>.mjs and follows the contract in scene-svg.mjs.
import { normalize } from './scene-svg.mjs'

export const sceneIds = ['reference-plant-room', 'window-still-life', 'lakeside', 'cafe-corner', 'garden-path', 'old-town-street']
export const artworks = await Promise.all(sceneIds.map(async id => {
  const module = await import(`./scenes/${id}.mjs`)
  const art = normalize(module.scene ?? module.default)
  if (art.id !== id) throw new Error(`scripts/scenes/${id}.mjs exports scene ${art.id}`)
  return art
}))
