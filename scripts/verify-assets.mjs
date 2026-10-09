// Verifies that the committed scene assets exist, align, match their modules, and are detailed enough to practise on.
import { readFile } from 'node:fs/promises'
import { artworks } from './scene-art.mjs'
import { DIRECTIONS, commandCount, lineArtContent, sceneDocuments } from './scene-svg.mjs'
import { coverage, renderSvg } from './scene-raster.mjs'

/** Floors for the drawing level: the former placeholder scenes had 106–337 commands and would fail here. */
export const limits = { minCommands: 1500, inkPercent: [8, 24], minRegionPercent: 0.1, maxLineArtBytes: 450_000 }

const problems = []
let checked = 0
for (const art of artworks) {
  const root = `public/assets/scenes/${art.id}`
  const documents = sceneDocuments(art)
  const expected = ['line-art.svg', 'base-wash.svg', 'thumbnail.svg', ...art.regions.map(r => `masks/${r.id}.svg`), ...art.guides.map(g => `guides/${g.id}.svg`), ...DIRECTIONS.flatMap(d => [`guides/${d}-shadow.svg`, `guides/${d}-long-shadow.svg`, `guides/${d}-highlight.svg`])]
  for (const file of expected) {
    let content
    try { content = await readFile(`${root}/${file}`, 'utf8') } catch { problems.push(`${art.id}: missing ${file}`); continue }
    if (!content.includes('viewBox="0 0 1000 760"')) problems.push(`${art.id}: misaligned ${file}`)
    if (content !== documents[file]) problems.push(`${art.id}: ${file} is stale, run npm run assets:generate`)
    checked++
  }
  const line = lineArtContent(art), commands = commandCount(line)
  if (commands < limits.minCommands) problems.push(`${art.id}: line art has ${commands} path commands, below ${limits.minCommands}`)
  if (Buffer.byteLength(documents['line-art.svg']) > limits.maxLineArtBytes) problems.push(`${art.id}: line-art.svg is larger than ${limits.maxLineArtBytes} bytes`)
  const ink = coverage(await renderSvg(documents['line-art.svg']))
  if (ink.percent < limits.inkPercent[0] || ink.percent > limits.inkPercent[1]) problems.push(`${art.id}: ink coverage ${ink.percent}% is outside ${limits.inkPercent.join('–')}%`)
  if (ink.outside) problems.push(`${art.id}: ${ink.outside} line-art pixels outside the paper frame`)
  for (const region of art.regions) {
    const mask = coverage(await renderSvg(documents[`masks/${region.id}.svg`]), 128)
    if (mask.percent < limits.minRegionPercent) problems.push(`${art.id}: region ${region.id} covers only ${mask.percent}%`)
    if (mask.outside) problems.push(`${art.id}: region ${region.id} mask spills outside the paper frame`)
  }
  for (const name of [...art.guides.map(g => g.id), ...DIRECTIONS.flatMap(d => [`${d}-shadow`, `${d}-long-shadow`, `${d}-highlight`])]) {
    const guide = coverage(await renderSvg(documents[`guides/${name}.svg`]), 128)
    if (!guide.inside) problems.push(`${art.id}: guide ${name} is empty`)
    if (guide.outside) problems.push(`${art.id}: guide ${name} spills outside the paper frame`)
  }
  console.log(`${art.id}: ${commands} commands, ${ink.percent}% ink, ${art.regions.length} regions, ${art.guides.length} named guides`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
console.log(`Verified ${checked} aligned scene assets across ${artworks.length} scenes`)
