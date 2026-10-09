import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReadyScene } from '../../domain/scene'
import { readyScenes } from '../../content/scenes.catalog'
import { cacheScene, isSceneCached } from './offline-packs'

export function useOffline(){
  const supported=import.meta.env.PROD&&window.isSecureContext&&'serviceWorker' in navigator&&'caches' in window
  const [online,setOnline]=useState(navigator.onLine)
  const [cached,setCached]=useState<ReadonlySet<string>>(new Set())
  const [preparing,setPreparing]=useState(false)
  const [updateAvailable,setUpdateAvailable]=useState(false)
  const [notice,setNotice]=useState('')
  const registration=useRef<ServiceWorkerRegistration|null>(null)
  const reloadForUpdate=useRef(false)
  useEffect(()=>{
    let cancelled=false
    const cleanup: (()=>void)[]=[]
    const status=()=>{setOnline(navigator.onLine);if(navigator.onLine)void registration.current?.update().catch(()=>{})}
    const changed=()=>{if(reloadForUpdate.current)location.reload()}
    window.addEventListener('online',status);window.addEventListener('offline',status)
    if(supported){
      navigator.serviceWorker.addEventListener('controllerchange',changed)
      // Read prepared packs even when checking the worker update fails offline.
      Promise.all(readyScenes.map(async scene=>await isSceneCached(scene)?scene.id:null)).then(cachedScenes=>{
        if(!cancelled)setCached(new Set(cachedScenes.filter((id):id is string=>id!==null)))
      }).catch(()=>{if(!cancelled)setNotice('오프라인 저장소를 열지 못했어요. 연결된 상태에서는 계속 연습할 수 있어요.')})
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(async value=>{
        if(cancelled)return
        registration.current=value;setUpdateAvailable(Boolean(value.waiting))
        const found=()=>{
          const worker=value.installing
          if(!worker)return
          const state=()=>{if(!cancelled&&worker.state==='installed'&&navigator.serviceWorker.controller)setUpdateAvailable(true)}
          worker.addEventListener('statechange',state)
          cleanup.push(()=>worker.removeEventListener('statechange',state))
        }
        value.addEventListener('updatefound',found)
        cleanup.push(()=>value.removeEventListener('updatefound',found))
      }).catch(()=>{if(!cancelled)setNotice('오프라인 준비를 마치지 못했어요. 연결 후 다시 열어주세요.')})
    }
    return()=>{cancelled=true;cleanup.forEach(remove=>remove());window.removeEventListener('online',status);window.removeEventListener('offline',status);if(supported)navigator.serviceWorker.removeEventListener('controllerchange',changed)}
  },[supported])
  const prepare=useCallback(async(scene:ReadyScene)=>{
    if(!supported)return
    setPreparing(true)
    try{await cacheScene(scene);setCached(previous=>new Set([...previous,scene.id]));setNotice('')}
    catch{setNotice('이 풍경의 오프라인 준비가 끝나지 않았어요. 연결된 상태에서 다시 선택해주세요.')}
    finally{setPreparing(false)}
  },[supported])
  const update=()=>{if(registration.current?.waiting){reloadForUpdate.current=true;registration.current.waiting.postMessage({type:'SKIP_WAITING'})}}
  return {supported,online,cached,preparing,notice,updateAvailable,prepare,update}
}
