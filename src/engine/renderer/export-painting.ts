import type { PracticeSession } from '../../domain/painting'
import type { ReadyScene } from '../../domain/scene'
import { paintStrokes } from '../brush/watercolor'

/** Shared by the PNG export and the example composite; tests stub Image to read from public/. */
export const loadImage=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('그림의 배경을 불러오지 못했어요. 연결을 확인해주세요.'));image.src=url
})
/** Composition intentionally excludes guide masks, viewport, and cursor. */
export async function renderPractice(session:PracticeSession,scene:ReadyScene):Promise<HTMLCanvasElement>{
  const canvas=document.createElement('canvas');canvas.width=scene.canvasSize.width;canvas.height=scene.canvasSize.height
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fcfaf3';ctx.fillRect(0,0,canvas.width,canvas.height)
  if(session.baseWashVisible)ctx.drawImage(await loadImage(scene.assets.baseWashUrl),0,0,canvas.width,canvas.height)
  const paint=document.createElement('canvas');paint.width=canvas.width;paint.height=canvas.height
  // The same grouping as the canvas, so a wet wash exports at one density where its strokes overlap; every wash
  // group of the export shares this one layer instead of allocating its own.
  const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height
  paintStrokes(paint.getContext('2d')!,session.strokes.slice(0,session.historyCursor),layer)
  ctx.drawImage(paint,0,0)
  ctx.drawImage(await loadImage(scene.assets.lineArtUrl),0,0,canvas.width,canvas.height)
  return canvas
}
export const canvasBlob=(canvas:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('그림 파일을 만들지 못했어요.')),'image/png'))
export function downloadBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}
