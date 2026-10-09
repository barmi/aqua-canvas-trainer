import type { PracticeSession } from '../../domain/painting'

export function createPracticeRepository(factory:IDBFactory=globalThis.indexedDB,name='aqua-canvas-trainer') {
  let queue:Promise<unknown>=Promise.resolve()
  const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{
    if(!factory){reject(new Error('이 브라우저에서는 로컬 저장소를 사용할 수 없어요.'));return}
    const request=factory.open(name,1)
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('practices'))request.result.createObjectStore('practices',{keyPath:'id'})}
    request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)}
    request.onerror=()=>reject(request.error)
    request.onblocked=()=>reject(new Error('다른 탭을 닫은 뒤 저장을 다시 시도해주세요.'))
  })
  async function transaction<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
    const database=await open()
    return new Promise<T>((resolve,reject)=>{
      const transaction=database.transaction('practices',mode)
      let result:T
      const request=operation(transaction.objectStore('practices'))
      request.onsuccess=()=>{result=request.result}
      transaction.oncomplete=()=>{database.close();resolve(result)}
      transaction.onabort=()=>{database.close();reject(transaction.error??request.error??new Error('저장하지 못했어요.'))}
      transaction.onerror=()=>{ /* The abort handler reports failure after rollback. */ }
    })
  }
  const enqueue=<T>(operation:()=>Promise<T>):Promise<T>=>{const next=queue.catch(()=>undefined).then(operation);queue=next;return next}
  return {
    list:()=>transaction<unknown[]>('readonly',store=>store.getAll()),
    save:(session:PracticeSession)=>enqueue(()=>transaction('readwrite',store=>store.put(session)).then(()=>undefined)),
    remove:(id:string)=>enqueue(()=>transaction('readwrite',store=>store.delete(id)).then(()=>undefined)),
  }
}
