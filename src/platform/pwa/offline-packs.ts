import type { ReadyScene } from '../../domain/scene'
import { sceneAssetVersion, scenePackFiles } from '../../content/scenes.generated'

export const sceneCacheName=`aqua-canvas-${import.meta.env.BASE_URL.replace(/[^a-zA-Z0-9]/g,'_')}-scenes-${sceneAssetVersion}`
export const scenePackUrls=(scene:ReadyScene)=>scenePackFiles[scene.id as keyof typeof scenePackFiles].map(file=>`${import.meta.env.BASE_URL}${file}`)
export async function isSceneCached(scene:ReadyScene):Promise<boolean>{
  const cache=await caches.open(sceneCacheName)
  return (await Promise.all(scenePackUrls(scene).map(url=>cache.match(url)))).every(Boolean)
}
export async function cacheScene(scene:ReadyScene){
  const cache=await caches.open(sceneCacheName)
  const missing=[]
  for(const url of scenePackUrls(scene))if(!await cache.match(url))missing.push(url)
  await cache.addAll(missing)
}
