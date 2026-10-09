// HTTP deployment verification, independent of browser/Pencil acceptance tests.
import { setTimeout as delay } from 'node:timers/promises'

const site=new URL(process.argv[2])
if(site.protocol!=='https:')throw Error('Provide the HTTPS app URL')
if(!site.pathname.endsWith('/'))site.pathname+='/'
const expected=process.env.EXPECTED_COMMIT
const fileURL=path=>{
  const url=new URL(path,site)
  if(url.origin!==site.origin||!url.pathname.startsWith(site.pathname))throw Error(`Asset escaped app scope: ${path}`)
  return url
}
async function get(path,type,init={}){
  const response=await fetch(fileURL(path),{signal:AbortSignal.timeout(20000),...init})
  if(!response.ok)throw Error(`${path}: HTTP ${response.status}`)
  if(!response.headers.get('content-type')?.includes(type))throw Error(`${path}: unexpected content type ${response.headers.get('content-type')}`)
  return response
}

// A new deployment can take a short time to reach the Pages CDN.
let info
for(let attempt=0;attempt<8;attempt++){
  try{
    info=await (await get(`build-info.json?revision=${encodeURIComponent(expected??Date.now())}-${attempt}`,'application/json')).json()
    if(expected&&info.commit!==expected)throw Error(`Expected ${expected}, received ${info.commit}`)
    if(info.base!==site.pathname)throw Error(`Wrong site base: ${info.base}`)
    break
  }catch(error){
    if(attempt===7)throw error
    await delay(10000)
  }
}
const html=await (await get('./','text/html')).text()
if(!html.includes('<div id="root"></div>'))throw Error('App entry point missing')
for(const [,path] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const type=path.endsWith('.js')?'javascript':path.endsWith('.css')?'text/css':path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'manifest'
  await (await get(path,type)).arrayBuffer()
}
const worker=await (await get('sw.js','javascript')).text()
const files=JSON.parse(worker.match(/const PRECACHE_FILES = (.+)\n/)[1])
if(files.some(name=>name.endsWith('.mp4')||name.includes('/scenes/')))throw Error('Large content in shell precache')
const manifest=await (await get('manifest.webmanifest','manifest')).json()
for(const path of [manifest.id,manifest.scope,manifest.start_url])if(fileURL(path).href!==site.href)throw Error('Manifest scope mismatch')
const packs=await (await get('scene-packs.json','application/json')).json()
const paths=[...new Set([...files,...manifest.icons.map(icon=>icon.src),...Object.values(packs.scenes).flat()])]
let next=0
await Promise.all(Array.from({length:6},async()=>{
  while(next<paths.length){
    const path=paths[next++]
    const type=path.endsWith('.svg')?'image/svg+xml':path.endsWith('.png')?'image/png':path.endsWith('.json')?'application/json':path.endsWith('.js')?'javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':'manifest'
    await (await get(path,type)).arrayBuffer()
  }
}))
const video=await (await get('assets/references/videos/watercolor-plant-room.mp4','video/mp4',{headers:{Range:'bytes=0-31'}})).arrayBuffer()
if(Buffer.from(video).subarray(4,8).toString()!=='ftyp')throw Error('Invalid reference video')
console.log(`Verified ${site.href}: commit ${info.commit}, ${paths.length} static files, ${Object.keys(packs.scenes).length} scene packs, manifest, worker, and video`)
