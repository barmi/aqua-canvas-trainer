import { expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

// Isolated worker protocol tests: no browser process or live site is accessed.
function harness(){
  const scope='https://paint.test/studio/',prefix='aqua-canvas-_studio_-'
  const app=`${prefix}shell-new`,scene=`${prefix}scenes-v1`
  const handlers=new Map<string,(event:unknown)=>void>()
  const stores=new Map<string,Map<string,Response>>()
  let online=true,quotaExceeded=false
  const key=(request:string|{url:string})=>typeof request==='string'?new URL(request,scope).href:request.url
  const network=vi.fn(async(request:string|{url:string})=>{if(!online)throw new Error('offline');return new Response(`network:${key(request)}`)})
  const caches={
    keys:async()=>[...stores.keys()],delete:async(name:string)=>stores.delete(name),
    open:async(name:string)=>{
      if(!stores.has(name))stores.set(name,new Map())
      const values=stores.get(name)!
      const put=async(request:string|{url:string},response:Response)=>{if(quotaExceeded)throw new Error('QuotaExceededError');values.set(key(request),response.clone())}
      return {match:async(request:string|{url:string})=>values.get(key(request))?.clone(),put,addAll:async(urls:string[])=>{for(const url of urls)await put(url,await network(url))}}
    },
  }
  const skipWaiting=vi.fn(async()=>{}),claim=vi.fn(async()=>{})
  const template=readFileSync('src/platform/pwa/service-worker.js','utf8')
  const code=template.replace('__APP_CACHE__',JSON.stringify(app)).replace('__SCENE_CACHE__',JSON.stringify(scene)).replace('__CACHE_PREFIX__',JSON.stringify(prefix)).replace('__PRECACHE_FILES__',JSON.stringify(['index.html','assets/app.js','manifest.webmanifest']))
  runInNewContext(code,{self:{registration:{scope},clients:{claim},skipWaiting,addEventListener:(name:string,handler:(event:unknown)=>void)=>handlers.set(name,handler)},caches,URL,Response,fetch:network,Set,Promise})
  const dispatch=async(name:string,data={})=>{let pending:Promise<unknown>|undefined;handlers.get(name)!({...data,waitUntil:(promise:Promise<unknown>)=>{pending=promise}});await pending}
  const fetchRequest=async(path:string,mode='cors')=>{let response:Promise<Response>|undefined;handlers.get('fetch')!({request:{url:new URL(path,scope).href,method:'GET',mode},respondWith:(value:Promise<Response>)=>{response=value}});return response?await response:undefined}
  return {caches,stores,app,scene,prefix,network,dispatch,fetchRequest,skipWaiting,claim,offline:()=>{online=false},fillStorage:()=>{quotaExceeded=true}}
}
test('install caches only the shell and activation keeps current content and unrelated caches',async()=>{
  const h=harness();await h.dispatch('install')
  await h.caches.open(`${h.prefix}shell-old`);await h.caches.open(h.scene);await h.caches.open('another-app-cache')
  await h.dispatch('activate')
  expect(await h.caches.keys()).toEqual(expect.arrayContaining([h.app,h.scene,'another-app-cache']))
  expect(await h.caches.keys()).not.toContain(`${h.prefix}shell-old`)
  expect(h.claim).toHaveBeenCalledOnce()
  expect(h.skipWaiting).not.toHaveBeenCalled()
  expect(h.network.mock.calls.some(([request])=>String(request).includes('.mp4'))).toBe(false)
})
test('offline navigation and prepared scene assets are served from their versioned caches',async()=>{
  const h=harness();await h.dispatch('install')
  await h.fetchRequest('assets/scenes/lakeside/line-art.svg')
  h.offline()
  expect(await (await h.fetchRequest('./','navigate'))!.text()).toContain('index.html')
  expect(await (await h.fetchRequest('assets/scenes/lakeside/line-art.svg'))!.text()).toContain('line-art.svg')
  expect((await h.fetchRequest('assets/scenes/lakeside/missing.svg'))!.status).toBe(0)
  expect(await h.fetchRequest('assets/references/videos/watercolor-plant-room.mp4')).toBeUndefined()
})
test('updates activate only after an explicit message',async()=>{
  const h=harness();await h.dispatch('install');expect(h.skipWaiting).not.toHaveBeenCalled()
  await h.dispatch('message',{data:{type:'SKIP_WAITING'}});expect(h.skipWaiting).toHaveBeenCalledOnce()
})
test('cache quota failure does not discard a successfully downloaded scene',async()=>{
  const h=harness();await h.dispatch('install');h.fillStorage()
  const response=await h.fetchRequest('assets/scenes/lakeside/base-wash.svg')
  expect(response!.ok).toBe(true)
  expect(await response!.text()).toContain('base-wash.svg')
})
