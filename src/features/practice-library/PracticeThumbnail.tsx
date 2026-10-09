import { useEffect, useState } from 'react'
import type { PracticeSession } from '../../domain/painting'
import type { ReadyScene } from '../../domain/scene'
import { renderPractice } from '../../engine/renderer/export-painting'

export function PracticeThumbnail({session,scene}:{session:PracticeSession;scene:ReadyScene}){
  const [url,setUrl]=useState(scene.assets.thumbnailUrl)
  useEffect(()=>{
    let disposed=false
    renderPractice(session,scene).then(canvas=>{
      const thumb=document.createElement('canvas');thumb.width=400;thumb.height=304;thumb.getContext('2d')!.drawImage(canvas,0,0,400,304)
      if(!disposed)setUrl(thumb.toDataURL('image/png'))
    }).catch(()=>{ /* Keep the scene thumbnail when assets are temporarily unavailable. */ })
    return()=>{disposed=true}
  },[session,scene])
  return <img src={url} alt={`${scene.title} 연습 그림`}/>
}
