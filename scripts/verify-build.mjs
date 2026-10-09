import { access,readFile } from 'node:fs/promises'
const expectedBase=process.argv.find(arg=>arg.startsWith('--base='))?.slice(7)??'/'
if(!expectedBase.startsWith('/')||!expectedBase.endsWith('/'))throw Error('Expected an absolute base path with trailing slash')
const baseURL=new URL(expectedBase,'https://build.test')
const localFile=async(path)=>{
  const url=new URL(path,baseURL)
  if(url.origin!==baseURL.origin||!url.pathname.startsWith(expectedBase))throw Error(`Asset escaped the deployment base: ${path}`)
  await access(`dist/${decodeURIComponent(url.pathname.slice(expectedBase.length))}`)
}
const html=await readFile('dist/index.html','utf8')
for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g))await localFile(url)
const info=JSON.parse(await readFile('dist/build-info.json','utf8'))
if(info.base!==expectedBase)throw Error(`Wrong deployment base: ${info.base}`)
const source=await readFile('dist/sw.js','utf8')
if(source.includes('__APP_CACHE__'))throw Error('Unresolved worker placeholders')
const files=JSON.parse(source.match(/const PRECACHE_FILES = (.+)\n/)[1])
for(const name of files)await localFile(name)
if(files.some(name=>name.endsWith('.mp4')||name.includes('/scenes/')))throw Error('Large content must not enter shell precache')
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'))
for(const path of [manifest.id,manifest.scope,manifest.start_url]){
  if(new URL(path,baseURL).href!==baseURL.href)throw Error(`Manifest escaped the app scope: ${path}`)
}
const prefix=`aqua-canvas-${expectedBase.replace(/[^a-zA-Z0-9]/g,'_')}-`
if(JSON.parse(source.match(/const CACHE_PREFIX = (.+)\n/)[1])!==prefix)throw Error('Worker cache prefix does not match deployment path')
for(const icon of manifest.icons){
  const bytes=await readFile(`dist/${icon.src}`),[width,height]=icon.sizes.split('x').map(Number)
  await localFile(icon.src)
  if(bytes.readUInt32BE(16)!==width||bytes.readUInt32BE(20)!==height)throw Error(`Invalid icon size: ${icon.src}`)
}
const packs=JSON.parse(await readFile('dist/scene-packs.json','utf8'))
if(JSON.parse(source.match(/const SCENE_CACHE = (.+)\n/)[1])!==`${prefix}scenes-${packs.version}`)throw Error('Scene cache version mismatch')
for(const files of Object.values(packs.scenes))for(const name of files)await localFile(name)
const chunks=(await Promise.all(files.filter(name=>name.endsWith('.js')).map(name=>readFile(`dist/${name}`,'utf8')))).join('\n')
for(const path of ['sw.js','assets/references/videos/watercolor-plant-room.mp4']){
  if(!chunks.includes(`${expectedBase}${path}`))throw Error(`Missing compiled deployment URL: ${path}`)
  await localFile(path)
}
console.log(`Verified ${expectedBase}: production worker, ${files.length} shell files, icons, and ${Object.keys(packs.scenes).length} offline packs`)
