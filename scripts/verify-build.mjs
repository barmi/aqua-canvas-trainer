import { access,readFile } from 'node:fs/promises'
const source=await readFile('dist/sw.js','utf8')
if(source.includes('__APP_CACHE__'))throw Error('Unresolved worker placeholders')
const files=JSON.parse(source.match(/const PRECACHE_FILES = (.+)\n/)[1])
for(const name of files)await access(`dist/${name}`)
if(files.some(name=>name.endsWith('.mp4')||name.includes('/scenes/')))throw Error('Large content must not enter shell precache')
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'))
for(const icon of manifest.icons){
  const bytes=await readFile(`dist/${icon.src}`),[width,height]=icon.sizes.split('x').map(Number)
  if(bytes.readUInt32BE(16)!==width||bytes.readUInt32BE(20)!==height)throw Error(`Invalid icon size: ${icon.src}`)
}
const packs=JSON.parse(await readFile('dist/scene-packs.json','utf8'))
for(const files of Object.values(packs.scenes))for(const name of files)await access(`dist/${name}`)
console.log(`Verified production worker, ${files.length} shell files, icons, and ${Object.keys(packs.scenes).length} offline packs`)
