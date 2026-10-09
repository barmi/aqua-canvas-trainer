// Renders one scene module to PNG previews with metrics, without touching generated assets.
// Usage: node scripts/preview-scene.mjs <scene-id> [outDir=.preview]
// Writes <outDir>/<scene-id>/{thumbnail,line-art,regions,guide-<direction>,guide-<direction>-long}.png and metrics.json
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import { CANVAS, DIRECTIONS, FRAME, commandCount, lineArtContent, normalize, sceneDocuments } from './scene-svg.mjs'

const id = process.argv[2]
if (!id) throw new Error('Usage: node scripts/preview-scene.mjs <scene-id> [outDir]')
const outDir = `${process.argv[3] ?? '.preview'}/${id}`
const module = await import(`./scenes/${id}.mjs`)
const art = normalize(module.scene ?? module.default)
const files = sceneDocuments(art)
await mkdir(outDir, { recursive: true })

const { width, height } = CANVAS
const render = async content => { const image = await loadImage(Buffer.from(content)); const canvas = createCanvas(width, height); canvas.getContext('2d').drawImage(image, 0, 0, width, height); return canvas }
const tint = (canvas, color) => { const out = createCanvas(width, height), ctx = out.getContext('2d'); ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, width, height); return out }
const coverage = (canvas, threshold = 40, box = null) => {
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data
  let inside = 0, outside = 0
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] <= threshold) continue
    const x = i % width, y = Math.floor(i / width)
    if (!box || (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1)) inside++; else outside++
  }
  return { inside, outside }
}
const save = async (name, canvas) => writeFile(`${outDir}/${name}.png`, canvas.toBuffer('image/png'))
const label = (ctx, text, x, y, color) => { ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffffffcc'; ctx.fillRect(x - 4, y - 18, ctx.measureText(text).width + 8, 24); ctx.fillStyle = color; ctx.fillText(text, x, y) }

const line = await render(files['line-art.svg']), thumbnail = await render(files['thumbnail.svg'])
const paper = createCanvas(width, height); { const ctx = paper.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(line, 0, 0) }
await save('thumbnail', thumbnail); await save('line-art', paper)

const frameBox = { x0: FRAME.x - 3, y0: FRAME.y - 3, x1: FRAME.x + FRAME.width + 3, y1: FRAME.y + FRAME.height + 3 }
const ink = coverage(line, 40, frameBox)
const metrics = { id, commands: commandCount(lineArtContent(art)), inkCoveragePercent: +(ink.inside / (width * height) * 100).toFixed(2), inkOutsideFrame: ink.outside, regions: {}, guides: {}, warnings: [] }

const palette = ['#d9534f', '#2a7fd5', '#2eaa5a', '#e09a1e', '#8e44ad', '#17a2b8', '#c2185b', '#6d4c41', '#3f51b5', '#009688']
const regions = createCanvas(width, height); { const ctx = regions.getContext('2d'); ctx.drawImage(paper, 0, 0); ctx.globalAlpha = .42 }
let labelY = 80
for (const [index, region] of art.regions.entries()) {
  const mask = await render(files[`masks/${region.id}.svg`])
  const c = coverage(mask, 128, frameBox), percent = +(c.inside / (width * height) * 100).toFixed(2)
  metrics.regions[region.id] = { coveragePercent: percent, outsideFrame: c.outside }
  if (percent < .1) metrics.warnings.push(`region ${region.id} covers only ${percent}% of the canvas`)
  if (c.outside) metrics.warnings.push(`region ${region.id} has ${c.outside} mask pixels outside the frame`)
  const ctx = regions.getContext('2d'); ctx.globalAlpha = .42; ctx.drawImage(tint(mask, palette[index % palette.length]), 0, 0); ctx.globalAlpha = 1
  label(ctx, `${region.id} ${percent}%`, 70, labelY, palette[index % palette.length]); labelY += 26
}
await save('regions', regions)

for (const direction of DIRECTIONS) {
  for (const [suffix, file] of [['', `guides/${direction}-shadow.svg`], ['-long', `guides/${direction}-long-shadow.svg`]]) {
    const shadow = await render(files[file]), highlight = await render(files[`guides/${direction}-highlight.svg`])
    const canvas = createCanvas(width, height), ctx = canvas.getContext('2d')
    ctx.drawImage(thumbnail, 0, 0)
    ctx.globalAlpha = .45; ctx.drawImage(tint(shadow, '#2b4fa8'), 0, 0); ctx.drawImage(tint(highlight, '#f2c200'), 0, 0); ctx.globalAlpha = 1
    label(ctx, `${direction}${suffix}: blue = shadow + shaded side, yellow = lit side`, 70, 90, '#333')
    const s = coverage(shadow, 128, frameBox), h = coverage(highlight, 128, frameBox)
    metrics.guides[`${direction}${suffix}`] = { shadowPercent: +(s.inside / (width * height) * 100).toFixed(2), highlightPercent: +(h.inside / (width * height) * 100).toFixed(2), outsideFrame: s.outside + h.outside }
    if (s.outside + h.outside) metrics.warnings.push(`guide ${direction}${suffix} spills ${s.outside + h.outside} pixels outside the frame`)
    if (!s.inside) metrics.warnings.push(`guide ${direction}${suffix} shadow is empty`)
    if (!h.inside) metrics.warnings.push(`guide ${direction}${suffix} highlight is empty`)
    await save(`guide-${direction}${suffix}`, canvas)
  }
}
if (ink.outside) metrics.warnings.push(`${ink.outside} line-art pixels fall outside the paper frame`)
await writeFile(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2) + '\n')
console.log(JSON.stringify(metrics, null, 2))
console.log(`Previews written to ${outDir}`)
