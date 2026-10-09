/* Build placeholders are replaced by scripts/pwa-plugin.ts. */
const APP_CACHE = __APP_CACHE__
const SCENE_CACHE = __SCENE_CACHE__
const CACHE_PREFIX = __CACHE_PREFIX__
const PRECACHE_FILES = __PRECACHE_FILES__
const scope = self.registration.scope
const absolute = file => new URL(file,scope).href
const shellURLs = new Set(PRECACHE_FILES.map(absolute))

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll([...shellURLs])))
})
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys()
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==APP_CACHE&&name!==SCENE_CACHE).map(name=>caches.delete(name)))
    await self.clients.claim()
  })())
})
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting())
})
async function cacheFirst(request,name){
  let cache
  try{
    cache=await caches.open(name)
    const cached=await cache.match(request)
    if(cached)return cached
  }catch{ /* Network practice remains available if cache storage is unavailable. */ }
  try{
    const response=await fetch(request)
    if(response.ok&&cache){
      try{await cache.put(request,response.clone())}catch{ /* A full cache must not discard a successful response. */ }
    }
    return response
  }catch{return Response.error()}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url)
  if(request.method!=='GET'||url.origin!==new URL(scope).origin)return
  // Videos are deliberately excluded from both precache and runtime caches.
  if(url.pathname.startsWith(new URL('assets/references/',scope).pathname))return
  if(request.mode==='navigate'){
    // Keep the HTML and hashed JS from the same app version until the user updates.
    event.respondWith(caches.open(APP_CACHE).then(async cache=>(await cache.match(absolute('index.html')))??fetch(request)))
  }else if(url.pathname.startsWith(new URL('assets/scenes/',scope).pathname)){
    event.respondWith(cacheFirst(request,SCENE_CACHE))
  }else if(shellURLs.has(url.href))event.respondWith(cacheFirst(request,APP_CACHE))
})
