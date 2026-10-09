import { access, readFile } from 'node:fs/promises'
import { artworks } from './scene-art.mjs'
let checked = 0
for (const art of artworks) {
  const files = ['line-art.svg','base-wash.svg','thumbnail.svg',...art.regions.map(r=>`masks/${r.id}.svg`),...Object.keys(art.shadows).flatMap(d=>[`guides/${d}-shadow.svg`,`guides/${d}-highlight.svg`])]
  if (new Set(art.regions.map(r=>r.id)).size !== art.regions.length) throw Error(`Duplicate region in ${art.id}`)
  for (const file of files) {
    const name=`public/assets/scenes/${art.id}/${file}`
    await access(name)
    if (!(await readFile(name,'utf8')).includes('viewBox="0 0 1000 760"')) throw Error(`Misaligned: ${name}`)
    checked++
  }
}
console.log(`Verified ${checked} aligned scene assets`)
