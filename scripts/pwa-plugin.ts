import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

export function pwaPlugin():Plugin{
  let root='',base='/'
  return {
    name:'aqua-offline',apply:'build',enforce:'post',
    configResolved(config){root=config.root;base=config.base},
    async generateBundle(_options,bundle){
      const packs=JSON.parse(await readFile(resolve(root,'public/scene-packs.json'),'utf8')) as {version:string}
      const hash=createHash('sha256')
      for(const [name,file] of Object.entries(bundle)){hash.update(name);hash.update(file.type==='chunk'?file.code:file.source)}
      const prefix=`aqua-canvas-${base.replace(/[^a-zA-Z0-9]/g,'_')}-`
      const appCache=`${prefix}shell-${hash.digest('hex').slice(0,16)}`
      const sceneCache=`${prefix}scenes-${packs.version}`
      const files=['index.html','manifest.webmanifest','favicon.svg','scene-packs.json','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png',...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name))]
      const template=await readFile(resolve(root,'src/platform/pwa/service-worker.js'),'utf8')
      const source=template.replace('__APP_CACHE__',JSON.stringify(appCache)).replace('__SCENE_CACHE__',JSON.stringify(sceneCache)).replace('__CACHE_PREFIX__',JSON.stringify(prefix)).replace('__PRECACHE_FILES__',JSON.stringify(files))
      this.emitFile({type:'asset',fileName:'sw.js',source})
    },
  }
}
