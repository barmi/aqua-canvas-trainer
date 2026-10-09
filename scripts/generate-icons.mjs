import { createCanvas,loadImage } from '@napi-rs/canvas'
import { mkdir,readFile,writeFile } from 'node:fs/promises'
await mkdir('public/icons',{recursive:true})
const image=await loadImage(await readFile('public/favicon.svg'))
for(const [name,size] of [['icon-192',192],['icon-512',512],['apple-touch-icon',180],['icon-maskable-512',512]]){
  const canvas=createCanvas(size,size),ctx=canvas.getContext('2d')
  ctx.fillStyle='#526c56';ctx.fillRect(0,0,size,size)
  const padding=name.includes('maskable')?size*.12:0
  ctx.drawImage(image,padding,padding,size-padding*2,size-padding*2)
  await writeFile(`public/icons/${name}.png`,canvas.toBuffer('image/png'))
}
console.log('Generated four PWA icons')
