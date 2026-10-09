// Cafe corner: a round bistro table in front of an arched cafe window, two bentwood chairs,
// a pendant lamp, framed pictures, a chalkboard menu, a wall shelf with jars and cups, a
// hanging pothos and a monstera in the corner, on a checkerboard floor. Layered module, see
// scripts/scene-svg.mjs for the contract. All randomness comes from rng(seed).
import {
  path, ellipse, circle, lineD, polyD, poly, rectD, arcD, curveD, rng, between, lerp, lerpPt, hull, hatchD,
  ticksD, dashesD, perspectiveRows, leaf, sprig, canopyD, foliageD, fmt,
} from './helpers.mjs'

const FR = { x0: 55, y0: 55, x1: 945, y1: 705 }
const FLOOR_Y = 500
const FLOOR_BOX = { x0: 55, y0: FLOOR_Y, x1: 945, y1: 705 }
const VP = [500, 330]
const random = rng(20261009)

// ---------- small local helpers ----------
/** Hand-drawn straight line: a soft curve through slightly jittered points. */
function hand(x1, y1, x2, y2, amp = .8) {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 60))
  if (n < 2) return lineD(x1, y1, x2, y2)
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : amp
    pts.push([lerp(x1, x2, t) + (random() - .5) * 2 * j, lerp(y1, y2, t) + (random() - .5) * 2 * j])
  }
  return curveD(pts, { tension: .8 })
}
/** Wavy chalk / pen scribble between two x positions. */
function scribble(x0, y, x1, amp = 1.3) {
  const n = Math.max(3, Math.round((x1 - x0) / 8)), pts = []
  for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), y + (random() - .5) * 2 * amp])
  return curveD(pts, { tension: .9 })
}
/** Liang-Barsky segment clip against a box. */
function clipSeg(x1, y1, x2, y2, b = FR) {
  let t0 = 0, t1 = 1
  const dx = x2 - x1, dy = y2 - y1
  for (const [p, q] of [[-dx, x1 - b.x0], [dx, b.x1 - x1], [-dy, y1 - b.y0], [dy, b.y1 - y1]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const r = q / p
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r } else { if (r < t0) return null; if (r < t1) t1 = r }
  }
  return [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1]
}
/** Sutherland-Hodgman polygon clip against a box. */
function clipPoly(polygon, b) {
  const xAt = (p, q, x) => [x, p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0])]
  const yAt = (p, q, y) => [p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]), y]
  const stage = (pts, inside, cross) => {
    const out = []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], pi = inside(p), qi = inside(q)
      if (pi) out.push(p)
      if (pi !== qi) out.push(cross(p, q))
    }
    return out
  }
  let pts = polygon
  pts = stage(pts, p => p[0] >= b.x0, (p, q) => xAt(p, q, b.x0))
  pts = stage(pts, p => p[0] <= b.x1, (p, q) => xAt(p, q, b.x1))
  pts = stage(pts, p => p[1] >= b.y0, (p, q) => yAt(p, q, b.y0))
  pts = stage(pts, p => p[1] <= b.y1, (p, q) => yAt(p, q, b.y1))
  return pts
}
const ellipsePts = (cx, cy, rx, ry, n = 24) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] })
const arcPts = (cx, cy, rx, ry, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] })
/** A disc seen from above with a visible thickness band: top ellipse + front band (both closed). */
function discBand(cx, cy, rx, ry, t) {
  const band = `M${fmt(cx - rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 0 0 ${fmt(cx + rx)} ${fmt(cy)}L${fmt(cx + rx)} ${fmt(cy + t)}A${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(cx - rx)} ${fmt(cy + t)}Z`
  const half = side => {
    const a0 = Math.PI / 2, a1 = side > 0 ? 0 : Math.PI
    return [...arcPts(cx, cy, rx, ry, a0, a1, 8), ...arcPts(cx, cy + t, rx, ry, a1, a0, 8)]
  }
  return {
    silhouette: ellipse(cx, cy, rx, ry) + path(band),
    edge: path(arcD(cx - rx, cy + t * .55, cx + rx, cy + t * .55, rx, ry, 0, 0)),
    stripR: half(1), stripL: half(-1),
  }
}
/** Offset a polyline to both sides. */
function offsetBand(pts, d) {
  const outer = [], inner = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)]
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l
    outer.push([pts[i][0] + nx * d, pts[i][1] + ny * d]); inner.push([pts[i][0] - nx * d, pts[i][1] - ny * d])
  }
  return { outer, inner }
}
/** Flower pot seen slightly from above: elliptical opening, lip, tapered body. */
function potBody(cx, y, topW, h, bottomW, ry, { rim = .16, lip = 1.08 } = {}) {
  const rw = topW * lip, rimH = h * rim, l = cx - rw / 2, r = cx + rw / 2, bl = cx - bottomW / 2, br = cx + bottomW / 2
  const d = `M${fmt(l)} ${fmt(y)}A${fmt(rw / 2)} ${fmt(ry)} 0 0 1 ${fmt(r)} ${fmt(y)}L${fmt(r)} ${fmt(y + rimH)}L${fmt(cx + topW / 2)} ${fmt(y + rimH)}L${fmt(br)} ${fmt(y + h)}A${fmt(bottomW / 2)} ${fmt(ry * .8)} 0 0 1 ${fmt(bl)} ${fmt(y + h)}L${fmt(cx - topW / 2)} ${fmt(y + rimH)}L${fmt(l)} ${fmt(y + rimH)}Z`
  const medium = arcD(l, y, r, y, rw / 2, ry, 0, 0) + arcD(l, y + rimH, r, y + rimH, rw / 2, ry * .9, 0, 0)
  const shade = [[cx + topW * .22, y + rimH + 3], [cx + topW / 2 - 3, y + rimH + 3], [br - 3, y + h - 3], [cx + bottomW * .22, y + h - 3]]
  const fine = ellipse(cx, y + 1.5, topW / 2 - 4, Math.max(2, ry - 2)) + path(hatchD(shade, 82, 6) + lineD(cx - topW * .3, y + rimH + 6, cx - bottomW * .3, y + h - 6) + arcD(bl + 3, y + h * .62, br - 3, y + h * .62, (br - bl) / 2, ry * .7, 0, 0))
  return {
    silhouette: path(d), medium: path(medium), fine, bottom: y + h, soil: [cx, y + 2],
    stripR: [[cx + topW / 2 - 7, y + rimH], [cx + topW / 2, y + rimH], [br, y + h], [br - 7, y + h], [cx + topW / 2 - 7, y + rimH], [r - 7, y + rimH], [r - 7, y], [r, y], [r, y + rimH]],
    stripL: [[cx - topW / 2 + 7, y + rimH], [cx - topW / 2, y + rimH], [bl, y + h], [bl + 7, y + h], [cx - topW / 2 + 7, y + rimH], [l + 7, y + rimH], [l + 7, y], [l, y], [l, y + rimH]],
  }
}

// ---------- wall and floor ----------
const floorLine = []
for (let x = 55; x <= 945; x += 89) floorLine.push([x, FLOOR_Y + (x === 55 || x === 945 ? 0 : (random() - .5) * 1.6)])

function wallLayer() {
  const silhouette = poly([[55, 55], [945, 55], ...floorLine.slice().reverse()])
  let medium = hand(55, 425, 945, 425, .7) + hand(55, 432, 945, 432, .7) + hand(55, 489, 945, 489, .6)
  let fine = ''
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 110.6
    medium += rectD(x + 7, 441, 97, 41)
    fine += rectD(x + 12, 446, 87, 31)
    for (const [cx, cy, sx, sy] of [[x + 7, 441, 1, 1], [x + 104, 441, -1, 1], [x + 104, 482, -1, -1], [x + 7, 482, 1, -1]]) fine += lineD(cx, cy, cx + 5 * sx, cy + 5 * sy)
  }
  // plaster marks on the upper wall
  for (let i = 0; i < 34; i++) {
    const x = between(random, 62, 935), y = between(random, 62, 415), l = between(random, 5, 12), a = between(random, -.4, .4)
    fine += `M${fmt(x)} ${fmt(y)}q${fmt(l / 2)} ${fmt(a * 3)} ${fmt(l)} ${fmt(a * 6)}`
  }
  return { id: 'wall', silhouette, lines: { medium: path(medium), fine: path(fine) } }
}

function floorLayer() {
  const silhouette = poly([...floorLine, [945, 705], [55, 705]])
  const rows = perspectiveRows(705, FLOOR_Y, 5, VP[1])
  const step = 118, xs = []
  for (let x = 500 - step * 9 - step / 2; x <= 500 + step * 10; x += step) xs.push(x)
  const atY = (x0, y) => x0 + (VP[0] - x0) * (705 - y) / (705 - VP[1])
  let grid = '', hatchLines = ''
  for (const x0 of xs) { const seg = clipSeg(atY(x0, FLOOR_Y), FLOOR_Y, x0, 705, FLOOR_BOX); if (seg) grid += hand(...seg, .6) }
  for (const y of rows.slice(1, -1)) grid += hand(55, y, 945, y, .5)
  for (let i = 0; i < rows.length - 1; i++) {
    const yN = rows[i], yF = rows[i + 1]
    for (let j = 0; j < xs.length - 1; j++) {
      if ((i + j) % 2) continue
      const quad = clipPoly([[atY(xs[j], yF), yF], [atY(xs[j + 1], yF), yF], [atY(xs[j + 1], yN), yN], [atY(xs[j], yN), yN]], { x0: 57, y0: FLOOR_Y + 2, x1: 943, y1: 703 })
      if (quad.length < 3) continue
      hatchLines += hatchD(quad, 30 + between(random, -7, 7), 7, { inset: 2.5 })
    }
  }
  return { id: 'floor', silhouette, lines: { medium: path(grid), fine: path(hatchLines) } }
}

// ---------- window, curtain, succulent ----------
function windowLayer() {
  const x0 = 110, x1 = 370, y0 = 80, y1 = 410, f = 12, sp = 180, cx = 240
  const outer = `M${x0} ${y1}V${sp}A130 100 0 0 1 ${x1} ${sp}V${y1}Z`
  const inner = `M${x0 + f} ${y1 - f}V${sp}A118 88 0 0 1 ${x1 - f} ${sp}V${y1 - f}Z`
  const sill = polyD([[x0 - 12, y1], [x1 + 12, y1], [x1 + 12, y1 + 14], [x0 - 12, y1 + 14]])
  let medium = inner + lineD(cx, sp, cx, y1 - f) + lineD(cx + 5, sp, cx + 5, y1 - f)
  for (const y of [262, 330]) medium += lineD(x0 + f, y, x1 - f, y) + lineD(x0 + f, y + 5, x1 - f, y + 5)
  medium += lineD(x0 - 12, y1 + 4, x1 + 12, y1 + 4) + lineD(x0 - 6, y1 + 14, x0 - 6, y1 + 22) + lineD(x1 + 6, y1 + 14, x1 + 6, y1 + 22)
  let fine = ''
  for (const a of [30, 60, 90, 120, 150]) { const r = a * Math.PI / 180; fine += lineD(cx, sp, cx + 118 * Math.cos(r), sp - 88 * Math.sin(r)) }
  fine += arcD(cx - 62, sp, cx + 62, sp, 62, 46, 0, 1) + `M${x0 + 4} ${y1 - 4}V${sp}A126 96 0 0 1 ${x1 - 4} ${sp}V${y1 - 4}`
  // outside: a street tree on the left, rooftops on the right, clipped to the two upper panes
  const clip = `<clipPath id="cc-win"><path d="M122 398V180A118 88 0 0 1 236 92.1V398Z"/><path d="M244 398V92.1A118 88 0 0 1 358 180V398Z"/></clipPath>`
  let scenery = canopyD(184, 158, 50, 40, random, { lobes: 9, depth: .12 }) + foliageD(184, 158, 50, 40, random, { count: 24, size: 8 })
  scenery += curveD([[190, 196], [188, 222], [186, 262]]) + curveD([[188, 214], [176, 206], [168, 196]]) + curveD([[189, 222], [200, 214]])
  scenery += hand(122, 238, 236, 238, .8) + hand(122, 246, 236, 246, .6)
  for (let x = 128; x < 232; x += 9) scenery += `M${x} 238q2 -5 4 -8`
  scenery += polyD([[244, 232], [258, 232], [258, 212], [276, 198], [294, 212], [294, 232], [314, 232], [314, 214], [336, 214], [336, 232], [358, 232]], false)
  scenery += rectD(270, 214, 6, 8) + rectD(282, 214, 6, 8) + rectD(320, 220, 6, 7) + rectD(300, 218, 7, 9) + lineD(286, 202, 286, 196) + lineD(290, 198, 290, 194) + hand(244, 244, 358, 244, .6)
  scenery += polyD([[300, 232], [300, 220], [305, 214], [310, 220], [310, 232]], false) + canopyD(345, 190, 20, 18, random, { lobes: 6, depth: .1 })
  const lines = { medium: path(medium), fine: path(fine) + clip + `<g clip-path="url(#cc-win)">${path(scenery)}</g>` }
  return { id: 'window', silhouette: path(outer) + path(sill), lines }
}

function curtainLayer() {
  const x0 = 124, x1 = 356, top = 266, hem = 388, n = 15, step = (x1 - x0) / n
  const topPts = [], hemPts = []
  for (let i = 0; i <= n; i++) topPts.push([x0 + i * step, top + (i % 2 ? 4 : 0)])
  for (let i = 0; i <= n * 2; i++) hemPts.push([x0 + i * step / 2, hem + (i % 2 ? 4 : -2) + (random() - .5)])
  const silhouette = path(curveD([...topPts, ...hemPts.slice().reverse()], { close: true, tension: .8 }))
  let medium = hand(116, 263, 364, 263, .5), fine = ticksD(x0, 263, x1, 263, step, 7)
  const finials = circle(116, 263, 3.5) + circle(364, 263, 3.5)
  for (let i = 1; i < n; i++) {
    const x = x0 + i * step, sway = (random() - .5) * 5
    medium += curveD([[x, top + 7], [x + sway, lerp(top, hem, .5)], [x + sway * .4, hem - 5]])
    if (i % 2) fine += hatchD([[x + 2, top + 12], [x + 9, top + 12], [x + 9 + sway * .5, hem - 10], [x + 2 + sway * .5, hem - 10]], 74, 6)
  }
  fine += dashesD(x0 + 4, hem - 14, x1 - 4, hem - 14, 7, 5)
  return { id: 'curtain', silhouette, lines: { medium: path(medium) + finials, fine: path(fine) } }
}

function succulentLayers() {
  const bx = 160, by = 391
  let shape = '', veins = ''
  for (const [a, len, w] of [[-166, 24, 9], [-144, 27, 10], [-120, 26, 10], [-96, 28, 10], [-72, 26, 10], [-48, 27, 10], [-24, 23, 9], [-132, 16, 7], [-86, 15, 7], [-58, 16, 7]]) {
    const l = leaf(bx, by, len, w, a, { kind: 'lance', veins: 1 })
    shape += l.shape; veins += l.veinsD
  }
  const p = potBody(160, 390, 30, 24, 22, 4)
  return [
    { id: 'succulent', silhouette: shape, lines: { fine: path(veins) } },
    { id: 'succulent-pot', silhouette: p.silhouette, lines: { medium: p.medium, fine: p.fine } },
  ]
}

// ---------- pictures, menu, shelf ----------
function picturesLayer() {
  const frames = [[410, 118, 70, 82], [488, 152, 64, 86]]
  let silhouette = '', medium = '', fine = '', marks = ''
  for (const [x, y, w, h] of frames) {
    silhouette += poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
    marks += circle(x + w / 2, y - 9, 2)
    medium += rectD(x + 6, y + 6, w - 12, h - 12) + lineD(x + w / 2, y - 9, x + 4, y) + lineD(x + w / 2, y - 9, x + w - 4, y)
    fine += rectD(x + 12, y + 12, w - 24, h - 24) + lineD(x, y, x + 6, y + 6) + lineD(x + w, y, x + w - 6, y + 6) + lineD(x + w, y + h, x + w - 6, y + h - 6) + lineD(x, y + h, x + 6, y + h - 6)
  }
  // picture A: small landscape; picture B: a coffee cup sketch
  fine += curveD([[423, 172], [434, 160], [446, 168], [456, 158], [467, 166]]) + hand(423, 180, 467, 180, .6)
  for (let x = 425; x < 466; x += 6) fine += `M${x} 186q1 -4 3 -6`
  fine += `M508 196L511 214A9 3 0 0 0 529 214L532 196` + `M532 200C542 198 542 211 531 210` + curveD([[516, 186], [514, 178], [518, 172]]) + curveD([[524, 186], [522, 179], [526, 172]]) + hand(502, 221, 538, 221, .5)
  const fineMarks = circle(455, 144, 5) + ellipse(520, 196, 12, 4)
  return { id: 'pictures', silhouette, lines: { medium: path(medium) + marks, fine: path(fine) + fineMarks } }
}

function menuLayer() {
  const x = 650, y = 112, w = 160, h = 165
  const silhouette = poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
  const hook = circle(x + w / 2, y - 14, 2), cupRim = ellipse(x + 36, y + 150, 9, 3)
  let medium = rectD(x + 8, y + 8, w - 16, h - 16) + `M${x + w / 2 - 9} ${y}Q${x + w / 2} ${y - 20} ${x + w / 2 + 9} ${y}`
  medium += scribble(x + 48, y + 28, x + 112, 4) + hand(x + 38, y + 38, x + 122, y + 38, .8)
  let fine = ''
  for (let i = 0; i < 7; i++) {
    const ly = y + 54 + i * 14, words = [[x + 18, x + 18 + between(random, 18, 32)], [0, 0], [x + w - 42, x + w - 22]]
    words[1] = [words[0][1] + 7, words[0][1] + 7 + between(random, 14, 36)]
    for (const [a, b] of words) fine += scribble(a, ly, b, 1.4)
    if (i === 3) fine += dashesD(x + 16, ly + 7, x + w - 16, ly + 7, 6, 4)
  }
  fine += `M${x + 27} ${y + 150}L${x + 29} ${y + 161}A7 2.5 0 0 0 ${x + 43} ${y + 161}L${x + 45} ${y + 150}` + `M${x + 45} ${y + 153}C${x + 52} ${y + 152} ${x + 52} ${y + 160} ${x + 44} ${y + 159}`
  fine += curveD([[x + 32, y + 144], [x + 30, y + 138], [x + 33, y + 133]]) + curveD([[x + 39, y + 144], [x + 37, y + 138], [x + 40, y + 133]])
  for (let i = 0; i < 3; i++) { const sx = x + 100 + i * 14, sy = y + 152; fine += `M${sx} ${sy - 4}L${sx} ${sy + 4}M${sx - 4} ${sy}L${sx + 4} ${sy}M${sx - 3} ${sy - 3}L${sx + 3} ${sy + 3}M${sx + 3} ${sy - 3}L${sx - 3} ${sy + 3}` }
  fine += rectD(x + 3, y + 3, w - 6, h - 6)
  return { id: 'menu', silhouette, lines: { medium: path(medium) + hook, fine: path(fine) + cupRim } }
}

function bottle(cx, base, w, h, nw, nh) {
  const top = base - h, sh = top + nh + 10
  const d = `M${fmt(cx - w / 2)} ${fmt(base)}L${fmt(cx - w / 2)} ${fmt(sh + 8)}C${fmt(cx - w / 2)} ${fmt(sh)} ${fmt(cx - nw / 2)} ${fmt(sh - 2)} ${fmt(cx - nw / 2)} ${fmt(top + nh)}L${fmt(cx - nw / 2)} ${fmt(top)}L${fmt(cx + nw / 2)} ${fmt(top)}L${fmt(cx + nw / 2)} ${fmt(top + nh)}C${fmt(cx + nw / 2)} ${fmt(sh - 2)} ${fmt(cx + w / 2)} ${fmt(sh)} ${fmt(cx + w / 2)} ${fmt(sh + 8)}L${fmt(cx + w / 2)} ${fmt(base)}Z`
  const medium = lineD(cx - nw / 2, top + 5, cx + nw / 2, top + 5) + rectD(cx - w / 2 + 3, sh + 16, w - 6, h * .32)
  let fine = lineD(cx - w / 2 + 3, sh + 12, cx - w / 2 + 3, base - 4) + arcD(cx - w / 2 + 2, sh + 12, cx + w / 2 - 2, sh + 12, w / 2, 2.5, 0, 0)
  for (let i = 0; i < 3; i++) fine += lineD(cx - w / 2 + 6, sh + 21 + i * 5, cx + w / 2 - 6 - (i === 2 ? 5 : 0), sh + 21 + i * 5)
  return { silhouette: path(d), medium, fine, stripR: [[cx + w / 2 - 4, sh + 8], [cx + w / 2, sh + 8], [cx + w / 2, base], [cx + w / 2 - 4, base]], stripL: [[cx - w / 2, sh + 8], [cx - w / 2 + 4, sh + 8], [cx - w / 2 + 4, base], [cx - w / 2, base]] }
}
function jar(cx, base, w, h, lidH = 7) {
  const top = base - h, l = cx - w / 2, r = cx + w / 2
  const body = `M${fmt(l)} ${fmt(top + lidH)}L${fmt(r)} ${fmt(top + lidH)}L${fmt(r)} ${fmt(base - 4)}Q${fmt(r)} ${fmt(base)} ${fmt(r - 4)} ${fmt(base)}L${fmt(l + 4)} ${fmt(base)}Q${fmt(l)} ${fmt(base)} ${fmt(l)} ${fmt(base - 4)}Z`
  const lid = rectD(l - 2, top, w + 4, lidH)
  const medium = lineD(l - 2, top + 3, r + 2, top + 3) + rectD(l + 5, top + lidH + 9, w - 10, 15)
  let fine = lineD(l + 3, top + lidH + 4, l + 3, base - 6) + lineD(l + 9, top + lidH + 14, r - 9, top + lidH + 14) + lineD(l + 9, top + lidH + 19, r - 14, top + lidH + 19)
  for (let i = 0; i < 9; i++) { const bx = between(random, l + 5, r - 9), by = between(random, top + lidH + 28, base - 6); fine += `M${fmt(bx)} ${fmt(by)}q2 -3 4 0` }
  return { silhouette: path(body) + path(lid), medium, fine, stripR: [[r - 4, top + lidH], [r, top + lidH], [r, base - 2], [r - 4, base - 2]], stripL: [[l, top + lidH], [l + 4, top + lidH], [l + 4, base - 2], [l, base - 2]] }
}
function cupStack(cx, base, w, n) {
  const ch = 11, right = [], left = []
  let medium = '', fine = ''
  for (let i = 0; i < n; i++) {
    const yTop = base - (n - i) * ch, yBot = yTop + ch
    right.push([cx + w / 2, yTop], [cx + w / 2 - 2, yBot]); left.push([cx - w / 2, yTop], [cx - w / 2 + 2, yBot])
    medium += arcD(cx - w / 2, yTop, cx + w / 2, yTop, w / 2, 3, 0, 0) + `M${fmt(cx + w / 2 - 1)} ${fmt(yTop + 3)}c8 -1 8 7 0 7`
    fine += lineD(cx - w / 2 + 4, yTop + 4, cx - w / 2 + 4, yBot - 2)
  }
  return { silhouette: poly([...right, ...left.reverse()]), medium, fine, stripR: [[cx + w / 2 - 4, base - n * ch], [cx + w / 2, base - n * ch], [cx + w / 2 - 2, base], [cx + w / 2 - 6, base]], stripL: [[cx - w / 2, base - n * ch], [cx - w / 2 + 4, base - n * ch], [cx - w / 2 + 6, base], [cx - w / 2 + 2, base]] }
}
const SHELF_Y = 298
const shelfItems = [cupStack(642, SHELF_Y + 1, 36, 3), bottle(681, SHELF_Y + 1, 24, 76, 10, 18), jar(723, SHELF_Y + 1, 36, 50), bottle(765, SHELF_Y + 1, 18, 58, 8, 14), jar(810, SHELF_Y + 1, 40, 44), cupStack(858, SHELF_Y + 1, 32, 2), jar(893, SHELF_Y + 1, 20, 26, 5)]
function shelfItemsLayer() {
  return { id: 'shelf-items', silhouette: shelfItems.map(i => i.silhouette).join(''), lines: { medium: path(shelfItems.map(i => i.medium).join('')), fine: path(shelfItems.map(i => i.fine).join('')) } }
}
function shelfLayer() {
  const x0 = 600, x1 = 912, y = SHELF_Y
  const board = poly([[x0, y], [x1, y], [x1, y + 10], [x0, y + 10]])
  const under = poly([[x0, y + 10], [x1, y + 10], [x1 - 8, y + 16], [x0 + 8, y + 16]])
  let brackets = '', medium = '', fine = hand(x0 + 4, y + 5, x1 - 4, y + 5, .6)
  for (const bx of [610, 876]) {
    brackets += path(curveD([[bx, y + 16], [bx, y + 44], [bx + 10, y + 32], [bx + 22, y + 22], [bx + 32, y + 16]], { close: true, tension: .6 }))
    medium += lineD(bx + 4, y + 16, bx + 4, y + 38)
    fine += hatchD([[bx + 5, y + 18], [bx + 24, y + 18], [bx + 5, y + 38]], 45, 5)
  }
  fine += ticksD(x0 + 6, y + 13, x1 - 6, y + 13, 24, 4)
  return { id: 'shelf', silhouette: board + under + brackets, lines: { medium: path(medium), fine: path(fine) } }
}

// ---------- hanging plant and lamp ----------
function hangingPlantLayers() {
  const cx = 890, knot = 96
  const p = potBody(cx, 160, 50, 42, 38, 6)
  let medium = lineD(cx, 55, cx, knot) + `M${cx - 4} ${knot - 4}L${cx + 4} ${knot + 4}M${cx + 4} ${knot - 4}L${cx - 4} ${knot + 4}`
  const bead = circle(cx, 208, 4)
  const ends = [[cx - 22, 162], [cx, 166], [cx + 22, 162]]
  for (const [x, y] of ends) {
    medium += curveD([[cx, knot], [lerp(cx, x, .5) + (x < cx ? -5 : x > cx ? 5 : 0), lerp(knot, y, .5)], [x, y]])
    medium += curveD([[x, y], [lerp(x, cx, .35), 190], [cx, 208]])
  }
  let fine = ticksD(cx, knot + 5, cx, knot + 26, 4.5, 7) + ticksD(cx - 22, 120, cx - 22, 134, 4.5, 6) + ticksD(cx + 22, 120, cx + 22, 134, 4.5, 6)
  for (let i = 0; i < 7; i++) fine += curveD([[cx, 211], [cx + (i - 3) * 2.5, 224], [cx + (i - 3) * 4.5, 238 + between(random, -3, 3)]])
  const vines = [
    sprig(cx - 16, 165, 106, 118, random, { leaves: 6, leafLen: 25, leafWidth: 18, kind: 'heart', curl: 24 }),
    sprig(cx + 12, 165, 92, 84, random, { leaves: 6, leafLen: 22, leafWidth: 16, kind: 'heart', curl: 20 }),
    sprig(cx - 3, 170, 70, 100, random, { leaves: 5, leafLen: 19, leafWidth: 14, kind: 'heart', curl: 18 }),
  ]
  return [
    { id: 'hanging-pot', silhouette: p.silhouette, lines: { medium: path(medium) + bead + p.medium, fine: path(fine) + p.fine } },
    { id: 'hanging-vines', silhouette: vines.map(v => v.shape).join(''), lines: { medium: vines.map(v => v.lines).join('') } },
  ]
}

// Pendant lamp: cord from the top edge, a cone shade whose rim (centre y 234, x 485-645) hangs
// well clear of the wall shelf at y 298 and of the bottle at x >= 662, bulb peeking under the rim.
const LAMP = { cx: 565, rim: 234 }
function lampLayers() {
  const { cx, rim } = LAMP
  const shade = `M547 154C536 180 507 206 485 ${rim}A80 20 0 0 0 645 ${rim}C623 206 594 180 583 154Z`
  const silhouette = path(shade) + poly([[553, 144], [577, 144], [577, 155], [553, 155]])
  let medium = hand(cx, 55, cx, 144, .5) + arcD(485, rim, 645, rim, 80, 20, 0, 1) + arcD(530, 184, 600, 184, 35, 8, 0, 0) + lineD(553, 149, 577, 149)
  let fine = curveD([[551, 164], [536, 190], [518, 210], [500, 227]]) + hatchD([[576, 164], [582, 160], [638, 228], [626, rim]], 68, 6) + arcD(490, rim - 4, 640, rim - 4, 75, 16, 0, 0)
  const bulb = circle(cx, rim + 4, 11)
  const bulbLines = rectD(cx - 6, rim - 18, 12, 12) + lineD(cx - 4, rim - 6, cx + 4, rim - 6)
  const bulbFine = `M${cx - 4} ${rim + 5}Q${cx} ${rim - 4} ${cx + 4} ${rim + 5}` + lineD(cx - 2, rim - 6, cx - 2, rim - 1) + lineD(cx + 2, rim - 6, cx + 2, rim - 1)
  return [
    { id: 'lamp', silhouette, lines: { medium: path(medium), fine: path(fine) } },
    { id: 'lamp-bulb', silhouette: bulb, lines: { medium: path(bulbLines), fine: path(bulbFine) } },
  ]
}

// ---------- floor plant (monstera) ----------
/**
 * Monstera leaf: a broad cordate blade (len x w) pointing along angleDeg, with `splits` deep rounded
 * incisions per side running 40-60 % of the way to the midrib, a curved midrib, one vein into each
 * lobe and `holes` small oval fenestrations between the inner veins. Returns closed shape + lines.
 */
function monsteraLeaf(x, y, len, w, angleDeg, random, { splits = 3, holes = 1, bend = 0 } = {}) {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (px, py) => [x + px * c - py * s, y + px * s + py * c]
  const midY = t => bend * len * Math.sin(Math.PI * t)
  const hw = t => w / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, .1 + .9 * t)), .6)
  const at = (t, side, f = 1) => T(len * t, midY(t) + side * hw(t) * f)
  const notch = 13 / len, gap = 5 / len, skew = .025
  const sideLobes = sign => {
    const ts = []
    for (let i = 0; i < splits; i++) ts.push(.18 + (i + .5) * .64 / splits + (random() - .5) * .04)
    const pts = [T(-len * .07, sign * w * .19), at(.07, sign, .9)], veins = []
    let t = .1
    for (let i = 0; i <= splits; i++) {
      const tEnd = i < splits ? ts[i] - notch / 2 : .95
      veins.push((t + tEnd) / 2)
      // rounded finger: the lobe's two ends sit a little inside the profile, its middle a little outside
      for (let k = 0; k <= 2; k++) pts.push(at(lerp(t, tEnd, k / 2), sign, (k === 1 ? 1.03 : .91) + (random() - .5) * .04))
      if (i < splits) {
        const d = between(random, .42, .6), tc = ts[i] + skew
        pts.push(at(tc - gap / 2, sign, 1 - d), at(tc + gap / 2, sign, 1 - d))
        t = ts[i] + notch / 2
      }
    }
    return { pts, veins }
  }
  const R = sideLobes(1), L = sideLobes(-1), tip = T(len, midY(1))
  const d = curveD([T(0, 0), ...R.pts, tip, ...L.pts.reverse()], { close: true, tension: .65 })
  let medium = curveD([T(0, 0), ...[.25, .5, .75].map(t => T(len * t, midY(t))), tip])
  let fine = ''
  for (const [sign, side] of [[1, R], [-1, L]]) {
    for (const vt of side.veins) {
      const from = T(len * Math.max(.02, vt - .1), midY(Math.max(.02, vt - .1))), ctrl = at(vt - .03, sign, .4), to = at(vt, sign, .82)
      fine += `M${fmt(from[0])} ${fmt(from[1])}Q${fmt(ctrl[0])} ${fmt(ctrl[1])} ${fmt(to[0])} ${fmt(to[1])}`
    }
  }
  let holeEls = ''
  for (let j = 0; j < holes; j++) {
    const sign = j % 2 ? -1 : 1, t = .3 + j * .18 + between(random, 0, .08), [hx, hy] = at(t, sign, .3)
    holeEls += ellipse(hx, hy, 4.2, 2.6, angleDeg + sign * 68)
  }
  return { shape: path(d), medium: path(medium) + holeEls, fine: path(fine) }
}

function floorPlantLayers() {
  const cx = 858, potTop = 482, potH = 78
  const p = potBody(cx, potTop, 112, potH, 84, 11, { rim: .15 })
  const soil = [cx, potTop + 4]
  const spec = [
    { id: 'plant-leaf-a', base: [845, 470], len: 112, w: 82, a: -126, bend: .12, splits: 4, holes: 1 },
    { id: 'plant-leaf-b', base: [875, 470], len: 104, w: 74, a: -60, bend: -.1, splits: 3, holes: 1 },
    { id: 'plant-leaf-f', base: [871, 468], len: 118, w: 78, a: -70, bend: .1, splits: 3, holes: 1 },
    { id: 'plant-leaf-c', base: [859, 466], len: 138, w: 96, a: -98, bend: -.08, splits: 4, holes: 2 },  // tip stays ~15 px under the shelf
  ]
  let stems = ''
  for (const s of spec) stems += curveD([soil, lerpPt(soil, s.base, .5), s.base])
  const front = [
    { id: 'plant-leaf-d', base: [839, 480], len: 104, w: 76, a: -152, bend: .18, splits: 3, holes: 1 },
    { id: 'plant-leaf-e', base: [875, 484], len: 84, w: 68, a: -48, bend: .2, splits: 2, holes: 0 },
  ]
  const leafLayer = s => { const l = monsteraLeaf(s.base[0], s.base[1], s.len, s.w, s.a, random, { splits: s.splits, holes: s.holes, bend: s.bend }); return { id: s.id, silhouette: l.shape, lines: { medium: l.medium, fine: l.fine } } }
  const young = leaf(879, 472, 62, 14, -84, { kind: 'lance', veins: 2, bend: .1 })
  const layers = [{ id: 'plant-stems', silhouette: ellipse(soil[0], soil[1], 44, 7), lines: { medium: path(stems) } }, ...spec.map(leafLayer)]
  layers.push({ id: 'plant-pot', silhouette: p.silhouette, lines: { medium: p.medium, fine: p.fine } })
  const d = leafLayer(front[0]); d.silhouette += young.shape; d.lines.fine += young.veins; d.lines.medium += path(curveD([[873, 478], [876, 474], [879, 472]]))
  layers.push(d, leafLayer(front[1]))
  return { layers, pot: p, cx, bottom: potTop + potH }
}

// ---------- bentwood chair ----------
function chair(name, cx, fy, s, thetaDeg) {
  const th = thetaDeg * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), k = .42
  const Pt = (u, v, w) => [cx + (u * c - w * sn) * s, fy + (-v + (u * sn + w * c) * k) * s]
  const leg = ([u, w]) => {
    const t = Pt(u, 149, w), b = Pt(u * 1.07, 0, w * 1.07), ht = 5.2 * s, hb = 3.9 * s
    const quad = [[t[0] - ht, t[1]], [t[0] + ht, t[1]], [b[0] + hb, b[1]], [b[0] - hb, b[1]]]
    let medium = ''
    for (const v of [34, 96]) {
      const f = v / 149, m = lerpPt(b, t, f), hw = lerp(hb, ht, f) + 1.3
      medium += arcD(m[0] - hw, m[1], m[0] + hw, m[1], hw, 2.4, 0, 0) + arcD(m[0] - hw, m[1] + 5 * s, m[0] + hw, m[1] + 5 * s, hw, 2.4, 0, 0)
    }
    const g0 = lerpPt([t[0] - ht * .35, t[1]], [b[0] - hb * .35, b[1]], .1), g1 = lerpPt([t[0] - ht * .35, t[1]], [b[0] - hb * .35, b[1]], .9)
    const fine = lineD(g0[0], g0[1], g1[0], g1[1])
    return {
      quad, medium, fine, foot: b,
      stripR: [[t[0] + ht - 3, t[1]], [t[0] + ht, t[1]], [b[0] + hb, b[1]], [b[0] + hb - 2.6, b[1]]],
      stripL: [[t[0] - ht, t[1]], [t[0] - ht + 3, t[1]], [b[0] - hb + 2.6, b[1]], [b[0] - hb, b[1]]],
    }
  }
  // a 40 cm bentwood seat beside a 60-70 cm bistro table: seat diameter ~0.55 of the table top
  const L = { fl: leg([-60, 48]), fr: leg([60, 48]), rl: leg([-60, -48]), rr: leg([60, -48]) }
  const ring = Pt(0, 88, 0), RR = 80
  const ringEl = ellipse(ring[0], ring[1], RR * s, RR * k * s)
  const ringFront = arcD(ring[0] - RR * s, ring[1], ring[0] + RR * s, ring[1], RR * s, RR * k * s + 3 * s, 0, 0)
  // back hoop and inner hoop, drawn in the rear plane w = -48
  const wide = ([u, v]) => [u * 1.15, v]
  const hoopC = [[-56, 146], [-64, 190], [-64, 236], [-54, 280], [-30, 308], [0, 316], [30, 308], [54, 280], [64, 236], [64, 190], [56, 146]].map(wide)
  const innerC = [[-36, 150], [-42, 196], [-39, 238], [-24, 264], [0, 271], [24, 264], [39, 238], [42, 196], [36, 150]].map(wide)
  const band = (cl, d) => {
    const { outer, inner } = offsetBand(cl, d)
    const o = outer.map(([u, v]) => Pt(u, v, -48)), i = inner.map(([u, v]) => Pt(u, v, -48))
    return { o, i, el: path(curveD([...o, ...i.slice().reverse()], { close: true, tension: .7 })) }
  }
  const hoop = band(hoopC, 5.5), inner = band(innerC, 4)
  const mid = offsetBand(hoopC, 1.5).outer.map(([u, v]) => Pt(u, v, -48))
  const hoopStripR = [...hoop.o.slice(5), ...mid.slice(5).reverse()], hoopStripL = [...hoop.o.slice(0, 6), ...mid.slice(0, 6).reverse()]
  const highlight = offsetBand(hoopC, -2).outer.slice(1, 10).map(([u, v]) => Pt(u, v, -48))
  const innerMid = innerC.slice(1, 8).map(([u, v]) => Pt(u, v, -48))
  let backMedium = lineD(...hoop.o[1], ...hoop.i[1]) + lineD(...hoop.o[9], ...hoop.i[9]) + lineD(...hoop.o[2], ...hoop.i[2]) + lineD(...hoop.o[8], ...hoop.i[8])
  const backFine = curveD(highlight, { tension: .8 }) + curveD(innerMid, { tension: .8 })
  // seat
  const R = 90, sc = Pt(0, 150, 0), seat = discBand(sc[0], sc[1], R * s, R * k * s, 9 * s)
  const frame = ellipse(sc[0], sc[1], (R - 8) * s, (R - 8) * k * s)
  const weavePoly = ellipsePts(sc[0], sc[1], (R - 14) * s, (R - 14) * k * s, 28)
  const weave = hatchD(weavePoly, 48, 9 * s) + hatchD(weavePoly, -42, 9 * s)
  return {
    layers: [
      { id: `${name}-rear`, silhouette: poly(L.rl.quad) + poly(L.rr.quad), lines: { medium: path(L.rl.medium + L.rr.medium) + ringEl, fine: path(L.rl.fine + L.rr.fine + ringFront) } },
      { id: `${name}-back`, silhouette: hoop.el + inner.el, lines: { medium: path(backMedium), fine: path(backFine) } },
      { id: `${name}-front`, silhouette: poly(L.fl.quad) + poly(L.fr.quad), lines: { medium: path(L.fl.medium + L.fr.medium), fine: path(L.fl.fine + L.fr.fine) } },
      { id: `${name}-seat`, silhouette: seat.silhouette, lines: { medium: frame, fine: path(weave) + seat.edge } },
    ],
    footprint: [L.fl.foot, L.fr.foot, L.rr.foot, L.rl.foot, ...ellipsePts(cx, fy, R * s, R * k * s, 12)],
    feet: [L.fl.foot, L.fr.foot, L.rr.foot, L.rl.foot],
    stripsR: [L.fl.stripR, L.fr.stripR, L.rl.stripR, L.rr.stripR, hoopStripR, seat.stripR],
    stripsL: [L.fl.stripL, L.fr.stripL, L.rl.stripL, L.rr.stripL, hoopStripL, seat.stripL],
  }
}

// ---------- table and tableware ----------
const T = { cx: 485, cy: 440, rx: 170, ry: 44, t: 13, fy: 667 }
function tableLayers() {
  const { cx, cy, rx, ry, t, fy } = T
  const top = discBand(cx, cy, rx, ry, t)
  let medium = '', fine = ''
  // plank seams and grain across the top
  const xAt = y => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))
  for (const dy of [-26, -9, 8, 25]) { const y = cy + dy, hw = xAt(y); medium += hand(cx - hw + 2, y, cx + hw - 2, y, .7) }
  for (const dy of [-34, -18, -1, 16, 33]) {
    const y = cy + dy, hw = xAt(y)
    for (const [a, b] of [[.06, .42], [.5, .94]]) {
      const pts = []
      for (let i = 0; i <= 4; i++) { const f = lerp(a, b, i / 4); pts.push([cx - hw + 2 * hw * f, y + (random() - .5) * 2.2]) }
      fine += curveD(pts)
    }
  }
  fine += arcD(cx - rx + 3, cy + 3, cx + rx - 3, cy + 3, rx - 3, ry - 2, 0, 0)
  // pedestal: a turned column entering a collar on a heavy cast-iron disc base
  const col = `M472 453L498 453C497 520 497 585 505 ${fy - 14}A20 5 0 0 1 465 ${fy - 14}C473 585 473 520 472 453Z`
  const colMedium = arcD(469, 482, 501, 482, 16, 4, 0, 0) + arcD(469, 487, 501, 487, 16, 4, 0, 0) + arcD(467, 632, 503, 632, 18, 5, 0, 0) + arcD(466, 640, 504, 640, 19, 5, 0, 0)
  const colFine = hatchD([[488, 460], [497, 460], [504, fy - 18], [493, fy - 18]], 84, 6) + hand(478, 462, 472, fy - 20, .5)
  const base = discBand(cx, fy - 2, 58, 15, 8), collar = discBand(cx, fy - 14, 27, 8, 8)
  const baseFine = ellipse(cx, fy - 2, 48, 12) + base.edge + path(hatchD([[cx + 20, fy + 8], [cx + 56, fy - 2], [cx + 57, fy + 6], [cx + 22, fy + 18]], 75, 5))
  // facet strips hug the column's actual curved edges (sampled from the silhouette beziers), 8 px wide inward
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]] }
  const edgeR = Array.from({ length: 7 }, (_, i) => bez([498, 453], [497, 520], [497, 585], [505, fy - 14], i / 6))
  const edgeL = Array.from({ length: 7 }, (_, i) => bez([472, 453], [473, 520], [473, 585], [465, fy - 14], i / 6))
  const colStripR = [...edgeR.map(([x, y]) => [x - 1, y]), ...edgeR.map(([x, y]) => [x - 9, y]).reverse()]
  const colStripL = [...edgeL.map(([x, y]) => [x + 1, y]), ...edgeL.map(([x, y]) => [x + 9, y]).reverse()]
  return {
    layers: [
      { id: 'table-base', silhouette: base.silhouette, lines: { fine: baseFine } },
      { id: 'table-collar', silhouette: collar.silhouette, lines: { fine: collar.edge + path(hatchD([[cx + 8, fy - 4], [cx + 26, fy - 12], [cx + 27, fy - 4], [cx + 10, fy + 4]], 75, 5)) } },
      { id: 'table-column', silhouette: path(col), lines: { medium: path(colMedium), fine: path(colFine) } },
      { id: 'table-top', silhouette: top.silhouette, lines: { medium: path(medium), fine: path(fine) + top.edge } },
    ],
    stripsR: [colStripR, top.stripR, base.stripR, collar.stripR],
    stripsL: [colStripL, top.stripL, base.stripL, collar.stripL],
    // contact shadow on the floor around the base's bottom rim (the base band ends at fy + 21)
    contact: ellipse(cx, fy + 21, 60, 6),
  }
}

function tablewareLayers() {
  const layers = [], stripsR = [], stripsL = []
  // folded napkin at the front left
  const nap = [[372, 458], [412, 452], [424, 466], [384, 473]]
  layers.push({ id: 'napkin', silhouette: poly(nap), lines: { medium: path(lineD(378, 465, 418, 459)), fine: path(lineD(386, 470, 420, 464) + dashesD(380, 461, 408, 457, 4, 3)) } })
  // saucer, cup with handle, spoon, steam
  const saucer = discBand(432, 436, 31, 9, 3)
  layers.push({ id: 'saucer', silhouette: saucer.silhouette, lines: { fine: ellipse(432, 436, 21, 6) } })
  const cup = `M412 406A20 7 0 0 1 452 406L446 432A14 5 0 0 1 418 432Z`
  const handle = `M450 412C468 408 471 429 447 428L448 423C462 423 462 414 450 417Z`
  layers.push({
    id: 'cup', silhouette: path(cup) + path(handle),
    lines: { medium: path(arcD(412, 406, 452, 406, 20, 7, 0, 0)), fine: ellipse(432, 407, 15, 4.5) + path(hatchD([[437, 414], [446, 412], [444, 428], [438, 430]], 80, 5) + `M426 396C420 388 432 382 426 371M437 396C432 388 443 382 438 370`) },
  })
  layers.push({ id: 'spoon', silhouette: ellipse(455, 442, 6, 3, 10), lines: { medium: path(lineD(460, 443, 476, 448)), fine: path(lineD(452, 441, 457, 443)) } })
  stripsR.push([[446, 412], [451, 412], [446, 432], [441, 432]]); stripsL.push([[413, 412], [418, 412], [423, 432], [418, 432]])
  // sugar jar at the back
  const lid = discBand(500, 392, 16, 5, 5)
  const jarBody = `M486 397L486 418A14 4 0 0 0 514 418L514 397Z`
  layers.push({ id: 'sugar-jar', silhouette: path(jarBody) + lid.silhouette + circle(500, 384, 3.5), lines: { medium: path(rectD(491, 403, 18, 9)), fine: path(lineD(494, 406, 505, 406) + lineD(494, 409, 502, 409) + lineD(489, 400, 489, 414)) } })
  stripsR.push([[509, 397], [514, 397], [514, 418], [509, 418]]); stripsL.push([[486, 397], [491, 397], [491, 418], [486, 418]])
  // plate with a croissant
  const plate = discBand(548, 452, 44, 14, 3)
  layers.push({ id: 'plate', silhouette: plate.silhouette, lines: { fine: ellipse(548, 452, 33, 10) } })
  const cc = [548, 446]
  const crescent = [[-35, 8], [-32, -3], [-20, -12], [0, -16], [20, -12], [32, -3], [35, 8], [30, 12], [19, 3], [0, -1], [-19, 3], [-30, 12]].map(([x, y]) => [cc[0] + x, cc[1] + y])
  let segs = ''
  for (const [x0, y0, x1, y1] of [[-26, -8, -29, 8], [-13, -14, -14, 2], [0, -16, 0, -1], [13, -14, 14, 2], [26, -8, 29, 8]]) segs += `M${fmt(cc[0] + x0)} ${fmt(cc[1] + y0)}Q${fmt(cc[0] + (x0 + x1) / 2 + 2)} ${fmt(cc[1] + (y0 + y1) / 2)} ${fmt(cc[0] + x1)} ${fmt(cc[1] + y1)}`
  let crust = ''
  for (let i = 0; i < 12; i++) { const x = cc[0] - 28 + i * 5, y = cc[1] + 6 - Math.abs(i - 5.5) * 1.2; crust += `M${fmt(x)} ${fmt(y)}l2 -4` }
  layers.push({ id: 'croissant', silhouette: path(curveD(crescent, { close: true, tension: .8 })), lines: { medium: path(segs), fine: path(crust) } })
  const byId = Object.fromEntries(layers.map(l => [l.id, l]))
  return { layers: [merge('tableware-back', byId.napkin, byId.saucer, byId['sugar-jar'], byId.plate), merge('tableware-front', byId.cup, byId.spoon, byId.croissant)], stripsR, stripsL }
}

/** Merge parts that never overlap into one layer. */
const merge = (id, ...parts) => ({ id, silhouette: parts.map(p => p.silhouette).join(''), lines: { medium: parts.map(p => p.lines.medium ?? '').join(''), fine: parts.map(p => p.lines.fine ?? '').join('') } })

// ---------- assemble ----------
const leftChair = chair('chair-left', 290, 634, .86, -15)
const rightChair = chair('chair-right', 690, 668, 1, 15)
const table = tableLayers()
const plant = floorPlantLayers()
const tableware = tablewareLayers()

const layers = [
  wallLayer(), floorLayer(), windowLayer(), curtainLayer(), ...succulentLayers(), merge('wall-decor', picturesLayer(), menuLayer()),
  shelfItemsLayer(), shelfLayer(), ...hangingPlantLayers(), ...lampLayers(), ...plant.layers,
  ...leftChair.layers, ...table.layers, ...tableware.layers, ...rightChair.layers,
]
const layerById = Object.fromEntries(layers.map(l => [l.id, l]))
const index = Object.fromEntries(layers.map((l, i) => [l.id, i]))

const ids = prefix => layers.map(l => l.id).filter(id => id.startsWith(prefix))

const regions = [
  { id: 'wall', label: '카페 벽과 창문', material: 'stone', wash: '#ebe3cf', layers: ['wall', 'window', 'curtain', 'wall-decor'] },
  { id: 'floor', label: '카페 바닥', material: 'wood', wash: '#dcc7a6', layers: ['floor'] },
  { id: 'shelf', label: '벽 선반', material: 'wood', wash: '#d4b58f', layers: ['shelf'] },
  { id: 'lamp', label: '펜던트 조명', material: 'other', wash: '#e8d49a', layers: ['lamp', 'lamp-bulb'] },
  { id: 'plants', label: '창가의 초록', material: 'foliage', wash: '#bfd0a6', layers: ['succulent', 'succulent-pot', 'hanging-pot', 'hanging-vines', ...ids('plant-')] },
  { id: 'chairs', label: '카페 의자', material: 'fabric', wash: '#cfb28a', layers: [...ids('chair-left'), ...ids('chair-right')] },
  { id: 'table', label: '원형 테이블', material: 'wood', wash: '#d9b88c', layers: ['table-base', 'table-collar', 'table-column', 'table-top'] },
  { id: 'tableware', label: '컵과 접시', material: 'ceramic', wash: '#eee8dc', layers: ['shelf-items', 'tableware-back', 'tableware-front'] },
]

// ---------- shadows and facets ----------
const dirs = { 'upper-left': [62, 34], 'upper-right': [-62, 34], left: [96, 10], right: [-96, 10] }
const floorCasters = [
  { pts: leftChair.footprint, h: 1 },
  { pts: rightChair.footprint, h: 1 },
  { pts: ellipsePts(T.cx, T.fy, T.rx, T.ry, 16), h: 1.1 },
  { pts: [...ellipsePts(plant.cx, plant.bottom, 44, 10, 12), ...ellipsePts(plant.cx, plant.bottom, 72, 16, 12)], h: 1.5 },
]
// tall things on the table sweep their base footprint (hull); flat dishes only get a band beyond the rim
const tableCasters = [
  { pts: ellipsePts(432, 432, 14, 5, 10), h: .45 },
  { pts: ellipsePts(500, 417, 15, 4.5, 10), h: .3 },
]
const flatCasters = [
  { pts: ellipsePts(432, 436, 31, 9, 16), h: .12 },
  { pts: ellipsePts(548, 452, 44, 14, 16), h: .12 },
  { pts: [[372, 458], [412, 452], [424, 466], [384, 473]], h: .06 },
]
const sillCasters = [{ pts: ellipsePts(160, 413, 12, 3, 8), h: .2 }]
/** Shadow band swept from a flat object's outline: only the edges facing the sweep, so the object's own top stays unshaded. */
function sweepBandD(pts, dx, dy) {
  let area = 0, d = ''
  const n = pts.length
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1] }
  const sgn = area > 0 ? 1 : -1
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1]
    if (sgn * ey * dx - sgn * ex * dy <= 0) continue
    d += polyD([p, q, [q[0] + dx, q[1] + dy], [p[0] + dx, p[1] + dy]])
  }
  return d
}
// contact shadows: chair feet, the table base rim on the floor, the pot's bottom and thin slivers under the dish rims
const contacts = [...leftChair.feet, ...rightChair.feet].map(([x, y]) => ellipse(x, y, 8, 3)).join('') + table.contact + ellipse(plant.cx, plant.bottom + 6, 44, 6) + ellipse(432, 448, 28, 3.5) + ellipse(548, 469, 40, 5)
function shadowsFor(mult) {
  const out = {}
  for (const [dir, [dx, dy]] of Object.entries(dirs)) {
    let d = ''
    for (const { pts, h } of floorCasters) {
      const p = clipPoly(hull([...pts, ...pts.map(([x, y]) => [x + dx * mult * h, y + dy * mult * h])]), FLOOR_BOX)
      if (p.length > 2) d += polyD(p)
    }
    for (const { pts, h } of [...tableCasters, ...sillCasters]) d += polyD(hull([...pts, ...pts.map(([x, y]) => [x + dx * mult * h, y + dy * mult * h])]))
    for (const { pts, h } of flatCasters) d += sweepBandD(pts, dx * mult * h, dy * mult * h)
    out[dir] = path(d) + contacts
  }
  return out
}
const shadows = shadowsFor(1), longShadows = shadowsFor(2.5)

const lampStripR = [[583, 154], [577, 161], [630, 231], [645, LAMP.rim]], lampStripL = [[547, 154], [553, 161], [500, 231], [485, LAMP.rim]]
const facetPolys = {
  left: [...leftChair.stripsR, ...rightChair.stripsR, ...table.stripsR, ...tableware.stripsR, plant.pot.stripR, lampStripR, ...shelfItems.map(i => i.stripR)],
  right: [...leftChair.stripsL, ...rightChair.stripsL, ...table.stripsL, ...tableware.stripsL, plant.pot.stripL, lampStripL, ...shelfItems.map(i => i.stripL)],
}
const facets = { left: path(facetPolys.left.map(p => polyD(p)).join('')), right: path(facetPolys.right.map(p => polyD(p)).join('')) }

export const scene = { id: 'cafe-corner', indoor: true, wash: '#eadcc6', layers, regions, shadows, longShadows, facets }
