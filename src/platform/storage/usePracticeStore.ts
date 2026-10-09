import { useCallback, useEffect, useRef, useState } from 'react'
import type { PracticeSession } from '../../domain/painting'
import { createPracticeRepository } from './practice-repository'
import { validatePractice } from './practice-file'

export function usePracticeStore() {
  const [sessions,setSessions]=useState<PracticeSession[]>([])
  const [loading,setLoading]=useState(true)
  const [status,setStatus]=useState<'saved'|'saving'|'error'>('saved')
  const [error,setError]=useState('')
  const repository=useRef(createPracticeRepository())
  const pending=useRef(new Map<string,PracticeSession>())
  const deleted=useRef(new Set<string>())
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const inFlight=useRef(0)
  const mounted=useRef(true)
  const report=(message:string)=>{if(mounted.current){setStatus('error');setError(message)}}
  const flush=useCallback(async()=>{
    if(timer.current){clearTimeout(timer.current);timer.current=null}
    const batch=[...pending.current.values()];pending.current.clear()
    for(const session of batch){
      if(deleted.current.has(session.id))continue
      inFlight.current++
      try{await repository.current.save(session)}catch{
        if(!deleted.current.has(session.id)&&!pending.current.has(session.id))pending.current.set(session.id,session)
        report('이 기기에 저장하지 못했어요. 저장 공간을 확인하고 다시 시도하거나 연습 파일을 내려받아주세요.')
      }finally{inFlight.current--}
    }
    if(!pending.current.size&&!inFlight.current&&mounted.current){setStatus('saved');setError('')}
  },[])
  useEffect(()=>{
    let cancelled=false
    mounted.current=true
    repository.current.list().then(values=>{
      if(cancelled)return
      const valid:PracticeSession[]=[];let rejected=0
      for(const value of values){try{valid.push(validatePractice(value))}catch{rejected++}}
      setSessions(valid)
      if(rejected)report(`${rejected}개의 연습을 현재 버전에서 열 수 없어요. 저장소의 원본은 유지했어요.`)
    }).catch(()=>{if(!cancelled)report('로컬 저장소를 열지 못했어요. 이번 연습은 연습 파일로 백업해주세요.')}).finally(()=>{if(!cancelled)setLoading(false)})
    const hide=()=>{if(document.visibilityState==='hidden')void flush()}
    const leave=()=>{void flush()}
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave)
    return()=>{cancelled=true;mounted.current=false;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);void flush()}
  },[flush])
  const updateSession=useCallback((session:PracticeSession)=>{
    deleted.current.delete(session.id)
    setSessions(previous=>[...previous.filter(value=>value.id!==session.id),session])
    pending.current.set(session.id,session);setStatus('saving')
    if(timer.current)clearTimeout(timer.current)
    timer.current=setTimeout(()=>void flush(),400)
  },[flush])
  const removeSession=useCallback(async(id:string)=>{
    deleted.current.add(id);pending.current.delete(id)
    try{await repository.current.remove(id);setSessions(previous=>previous.filter(session=>session.id!==id))}
    catch{deleted.current.delete(id);report('연습을 삭제하지 못했어요. 연결된 다른 탭과 저장 공간을 확인해주세요.')}
  },[])
  return {sessions,loading,status,error,updateSession,removeSession,flush}
}
