// Garden path: a winding flagstone path between two big trees, picket fence and flower bed on the left,
// a wooden bench and watering can on the right, a lamp post by the path. Layered back to front so the
// generator removes hidden lines (sky, lawn, path, hedge, fence, trees, flowers, lamp, bushes, bench, can).
// Everything deterministic (rng seeds only).
import { fmt, path, ellipse, lineD, polyD, curveD, rng, between, jitter, lerp, lerpPt, hull, hatchD, ticksD, leaf, canopyD, foliageD, cloudD, grassD, grainD } from './helpers.mjs'

const FR = { x0: 55, y0: 55, x1: 945, y1: 705 }
const TAU = Math.PI * 2
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const cont = d => d.replace(/^M/, 'L')
const add = (p, q) => [p[0] + q[0], p[1] + q[1]]
const L = (heavy = '', medium = '', fine = '') => ({ heavy, medium, fine })

/** Sutherland-Hodgman clip of a polygon to the paper frame. */
function clipFrame(points, inset = 2) {
  const planes = [[0, 1, FR.x0 + inset], [0, -1, FR.x1 - inset], [1, 1, FR.y0 + inset], [1, -1, FR.y1 - inset]]
  let out = points
  for (const [axis, sign, v] of planes) {
    const input = out; out = []
    const inside = p => sign > 0 ? p[axis] >= v : p[axis] <= v
    for (let k = 0; k < input.length; k++) {
      const cur = input[k], prev = input[(k + input.length - 1) % input.length]
      const hit = () => lerpPt(prev, cur, (v - prev[axis]) / (cur[axis] - prev[axis]))
      if (inside(cur)) { if (!inside(prev)) out.push(hit()); out.push(cur) } else if (inside(prev)) out.push(hit())
    }
  }
  return out
}
const clippedPoly = points => points.length >= 3 ? polyD(points) : ''
const castClip = (fp, dx, dy) => clippedPoly(clipFrame(hull([...fp, ...fp.map(([x, y]) => [x + dx, y + dy])])))
const ellipsePoly = (cx, cy, rx, ry, n = 10) => Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry] })
/** Crescent band between an outer and an inner arc of an ellipse (degrees, SVG orientation). */
function ring(cx, cy, rx, ry, a0, a1, k = .55, n = 9) {
  const pts = []
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]) }
  for (let i = n; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]) }
  return clippedPoly(clipFrame(pts))
}
/** Irregular rounded blob (stones, pebbles). */
function blobD(cx, cy, rx, ry, random, { n = 8, amp = .14 } = {}) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU + (random() - .5) * (Math.PI / n) * .7, k = 1 + (random() - .5) * 2 * amp
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k])
  }
  return curveD(pts, { close: true, tension: .9 })
}
/** Wavy scallop line between two points, suggesting a layer of leaves inside a canopy. */
function scallopD(x0, y0, x1, y1, bumps, depth, random) {
  const pts = []
  for (let i = 0; i <= bumps * 2; i++) {
    const m = lerpPt([x0, y0], [x1, y1], i / (bumps * 2))
    pts.push([m[0] + (random() - .5) * 2, m[1] + (i % 2 ? -depth : depth * .3) + (random() - .5)])
  }
  return curveD(pts, { tension: .9 })
}
/** Tapered branch as a closed polygon along a bent chord; bend sags toward the chord normal. */
function branchD(p0, p1, w0, w1, bend, random) {
  const dir = [p1[0] - p0[0], p1[1] - p0[1]], len = Math.hypot(dir[0], dir[1]), n = [-dir[1] / len, dir[0] / len]
  const up = [], dn = []
  for (let i = 0; i <= 5; i++) {
    const t = i / 5, m = lerpPt(p0, p1, t), s = Math.sin(Math.PI * t) * bend, w = lerp(w0, w1, t) / 2
    const c = [m[0] + n[0] * s + (random() - .5), m[1] + n[1] * s + (random() - .5)]
    up.push([c[0] + n[0] * w, c[1] + n[1] * w]); dn.push([c[0] - n[0] * w, c[1] - n[1] * w])
  }
  return curveD([...up, ...dn.reverse()], { close: true, tension: .7 })
}
/** Hatch the lower part of an ellipse (shade under a cluster); `from` is where the shade starts, as a fraction of ry below the centre. */
const underHatch = (cx, cy, rx, ry, angle = 30, spacing = 6.5, from = .12) => hatchD(ellipsePoly(cx, cy, rx * .82, ry * .8, 14).filter(p => p[1] > cy + ry * from), angle, spacing)

// ---------- ground and path geometry ----------
const PATH_CTRL = [[370, 503], [385, 512], [410, 520], [450, 512], [500, 488], [550, 462], [600, 452], [650, 468], [705, 500]]
const pathCenter = y => {
  for (let i = 1; i < PATH_CTRL.length; i++) { const [y0, x0] = PATH_CTRL[i - 1], [y1, x1] = PATH_CTRL[i]; if (y <= y1) return lerp(x0, x1, (y - y0) / (y1 - y0)) }
  return PATH_CTRL.at(-1)[1]
}
const pathWidth = y => 66 + 354 * Math.pow(clamp((y - 370) / 335, 0, 1), 1.35)
const pathLeft = y => pathCenter(y) - pathWidth(y) / 2
const pathRight = y => pathCenter(y) + pathWidth(y) / 2
const edgeYs = [370, 390, 415, 450, 490, 535, 585, 640, 705]
const edgeR = rng(11)
const edgeJ = i => (i === 0 || i === edgeYs.length - 1 ? 0 : between(edgeR, -4, 4))
const leftPts = edgeYs.map((y, i) => [pathLeft(y) + edgeJ(i), y])
const rightPts = edgeYs.map((y, i) => [pathRight(y) + edgeJ(i), y])
const leftD = curveD(leftPts), rightUpD = curveD([...rightPts].reverse())
// The far end is a rounded cap that vanishes behind a hedge shrub (the hedge layers come after the path) instead of a sawn-off edge.
const CAP_X = pathCenter(370)
const capPts = [[CAP_X - 19, 361], [CAP_X - 7, 355], [CAP_X + 7, 355], [CAP_X + 19, 361]]
const pathSilD = curveD([...[...leftPts].reverse(), ...capPts, ...rightPts]) + 'Z'
const pathMaskD = curveD([...[...leftPts].reverse(), ...capPts.map(([x, y]) => [x, y + 7]), ...rightPts]) + 'Z'   // paint mask ends under the shrub
const grassRegionD = `M55 340H945V705L${fmt(rightPts.at(-1)[0])} 705` + cont(curveD([...[...rightPts].reverse(), ...[...capPts].reverse(), ...leftPts])) + 'L55 705Z'

// ---------- sky, lawn, hedge ----------
function sky() {
  const r = rng(3)
  let medium = cloudD(488, 140, 150, 46, r, { bumps: 6 }) + cloudD(505, 213, 96, 32, r, { bumps: 5 })
  for (const [x, y, w] of [[590, 112, 9], [612, 100, 8], [575, 96, 7]]) medium += `M${fmt(x - w)} ${fmt(y)}q${fmt(w * .5)} ${fmt(-w * .7)} ${fmt(w)} 0q${fmt(w * .5)} ${fmt(-w * .7)} ${fmt(w)} 0`
  let fine = ''
  for (const [x, y, w] of [[445, 171, 42], [508, 176, 34], [484, 232, 32], [430, 148, 20]]) fine += lineD(x, y, x + w, y + 1)
  return { id: 'sky', silhouette: path('M55 55H945V705H55Z'), lines: L('', path(medium), path(fine)) }
}
function lawn() {
  const r = rng(31)
  let fine = ''
  for (let y = 358; y < 700;) {
    const t = (y - 330) / 375, step = 18 + 54 * t, h = 4.5 + 15 * t
    for (let x = 60 + between(r, 0, step); x < 938; x += step * between(r, .7, 1.3)) {
      if (r() < .42) continue
      fine += grassD(x, clamp(y + between(r, -3, 3), 356, 702), r() < .5 ? 2 : 3, r, { height: h, spread: h * .9 })
    }
    y += 8 + 26 * t
  }
  // outline:false and occludes:false: the sky layer draws the paper border, and the lawn must not mask it away
  return { id: 'grass', silhouette: path(polyD([[55, 330], [945, 330], [945, 705], [55, 705]])), outline: false, occludes: false, lines: L('', '', path(fine)) }
}
function shrubRow() {
  const r = rng(41)
  const make = (id, specs) => {
    let sil = '', medium = '', fine = ''
    for (const [cx, cy, rx, ry] of specs) {
      const c = clamp(cx, 55 + rx * 1.06 + 3, 945 - rx * 1.06 - 3)
      const d = canopyD(c, cy, rx, ry, r, { lobes: Math.round(rx / 7), depth: .1, steps: Math.max(20, Math.round(rx / 2.6)) })
      sil += d; medium += d + scallopD(c - rx * .5, cy + ry * .3, c + rx * .45, cy + ry * .25, 3, 4, r)
      fine += foliageD(c, cy - 2, rx * .8, ry * .72, r, { count: Math.round(rx * ry / 125), size: 7 }) + underHatch(c, cy, rx, ry, 35, 7)
    }
    return { id, silhouette: path(sil), outline: false, lines: L('', path(medium), path(fine)) }
  }
  const back = [], front = []
  for (let x = 80; x < 960; x += between(r, 92, 118)) back.push([x, 318 + between(r, -7, 7), between(r, 58, 74), between(r, 30, 40)])
  for (let x = 120; x < 940; x += between(r, 84, 112)) { const spec = [x, 342 + between(r, -3, 3), between(r, 34, 48), between(r, 17, 23)]; if (Math.abs(x - CAP_X) > 66) front.push(spec) }
  front.push([CAP_X, 350, 44, 22])   // the shrub the path disappears behind
  return [make('hedgeBack', back), make('hedgeFront', front)]
}

// ---------- flagstone path ----------
function flagstones() {
  const r = rng(23)
  let medium = '', fine = ''
  const rows = []
  for (let y = 703, h = 66; y - 377 > 5; h = Math.max(6.5, h * .8)) { const yF = Math.max(377, y - h); rows.push([y, yF]); y = yF }
  const inner = y => pathLeft(y) + pathWidth(y) * .05, innerW = y => pathWidth(y) * .9
  // One gently wavy seam per row boundary, shared by the stones on either side: joints never line up straight
  // across the path, yet neighbouring stones can never overlap.
  const seam = (y0, h) => { const amp = !h ? 0 : h < 13 ? clamp(h * .09, .4, 1.2) : clamp(h * .11, .5, 6), wl = h < 13 ? between(r, 30, 60) : between(r, 70, 140), ph = between(r, 0, TAU); return x => y0 + amp * Math.sin(x / wl * TAU + ph) }
  const seams = rows.map(([yN, yF], j) => seam(yN, j ? yN - yF : 0))
  seams.push(seam(rows.at(-1)[1], rows.at(-1)[0] - rows.at(-1)[1]))
  const tufts = [], pebbles = []
  rows.forEach(([yN, yF], j) => {
    const ym = (yN + yF) / 2, h = yN - yF, W = innerW(ym)
    const far = h < 13, count = far ? clamp(Math.round(W / (h * 3.4)), 1, 2) : clamp(Math.round(W / (h * 1.6)), 1, h < 22 ? 4 : 6)
    // cell widths from random weights; the partial first cell alternates narrow / wide so the courses stagger
    const w = [j % 2 ? between(r, .15, .45) : between(r, .55, .95)]
    for (let k = 0; k < count; k++) w.push(far ? between(r, .5, 1.9) : between(r, .6, 1.5))
    const total = w.reduce((s, v) => s + v, 0), raw = [0]
    for (const v of w) raw.push(raw.at(-1) + v / total)
    const minW = Math.max(10, h * .45) / W, f = [0]
    for (let i = 1; i < raw.length; i++) if (raw[i] - f.at(-1) >= minW || i === raw.length - 1) f.push(raw[i])
    if (f.length > 2 && f.at(-1) - f.at(-2) < minW) f.splice(f.length - 2, 1)
    if (f.length > 3 && r() < (far ? .4 : .15)) f.splice(1 + Math.floor(r() * (f.length - 2)), 1)   // two cells become one long stone
    const gapX = clamp(h * .09, .8, 5.5), gapY = clamp(h * .08, .7, 4.5), jx = Math.min(h * .15, 9)
    const jit = Math.min(gapX * .4, gapY * .4, 2), wob = Math.min(h * .06, gapY * .6)
    const edge = (y, i) => inner(y) + innerW(y) * f[i] + (i === 0 || i === f.length - 1 ? 0 : (r() - .5) * 2 * jx)
    const xN = f.map((_, i) => edge(yN, i)), xF = f.map((_, i) => edge(yF, i))
    const sN = seams[j], sF = seams[j + 1]
    const J = p => [p[0] + (r() - .5) * 2 * jit, p[1] + (r() - .5) * 2 * jit]
    for (let k = 0; k + 1 < f.length; k++) {
      const gL = k === 0 ? 1 : gapX, gR = k + 2 === f.length ? 1 : gapX
      let x0F = xF[k] + gL, x1F = xF[k + 1] - gR, x0N = xN[k] + gL, x1N = xN[k + 1] - gR
      // sometimes a cell holds one big stone plus a small filler stone beside it
      if (h > 20 && x1N - x0N > 60 && r() < .22) {
        const cut = between(r, .62, .72), left = r() < .5
        let fx0F, fx1F, fx0N, fx1N
        if (left) {
          fx0F = x0F; fx1F = lerp(x0F, x1F, 1 - cut) - gapX; fx0N = x0N; fx1N = lerp(x0N, x1N, 1 - cut) - gapX
          x0F = lerp(x0F, x1F, 1 - cut) + gapX; x0N = lerp(x0N, x1N, 1 - cut) + gapX
        } else {
          fx0F = lerp(x0F, x1F, cut) + gapX; fx1F = x1F; fx0N = lerp(x0N, x1N, cut) + gapX; fx1N = x1N
          x1F = lerp(x0F, x1F, cut) - gapX; x1N = lerp(x0N, x1N, cut) - gapX
        }
        const cx = (fx0F + fx1F + fx0N + fx1N) / 4, cy = (sF(cx) + sN(cx)) / 2 + between(r, -h * .12, h * .12)
        const frx = Math.max(5, Math.min(fx1N - fx0N, fx1F - fx0F) * .42)
        medium += blobD(cx, cy, frx, Math.min((sN(cx) - sF(cx)) * .24, frx * 1.1), r, { n: 7, amp: .12 })
      }
      const c0 = [x0F, sF(x0F) + gapY], c1 = [x1F, sF(x1F) + gapY], c2 = [x1N, sN(x1N) - gapY], c3 = [x0N, sN(x0N) - gapY]
      const mt = (c0[0] + c1[0]) / 2, mb = (c2[0] + c3[0]) / 2
      const pts = h < 10
        ? [c0, [mt, sF(mt) + gapY + wob * r()], c1, c2, [mb, sN(mb) - gapY - wob * r()], c3]
        : [c0, [mt, sF(mt) + gapY + (r() - .5) * 2 * wob], c1, lerpPt(c1, c2, .5), c2, [mb, sN(mb) - gapY + (r() - .5) * 2 * wob], c3, lerpPt(c3, c0, .5)]
      const d = curveD(pts.map(J), { close: true, tension: h < 10 ? .7 : .85 })
      if (h < 10) fine += d; else medium += d
      if (h > 24) {
        const c = [(c0[0] + c1[0] + c2[0] + c3[0]) / 4, (c0[1] + c1[1] + c2[1] + c3[1]) / 4], sw = x1N - x0N
        if (r() < .75) { const x = c[0] + between(r, -sw * .3, sw * .3), y = c[1] + between(r, -h * .2, h * .2), l = between(r, 8, 18); fine += `M${fmt(x)} ${fmt(y)}q${fmt(l * .3)} ${fmt(between(r, 2, 5))} ${fmt(l)} ${fmt(between(r, -3, 3))}` }
        if (r() < .5) { const x = c[0] + between(r, -sw * .35, sw * .35), y = c[1] + between(r, -h * .25, h * .25); fine += `M${fmt(x)} ${fmt(y)}a2.5 2 0 1 0 5 0` }
        if (r() < .45) fine += hatchD([c3, lerpPt(c3, c0, .35), lerpPt(c2, c1, .35), c2].map(p => [p[0] + 3, p[1] - 2]), 25, 6, { inset: 4 })
      }
      // grass in the joints: vertical gaps at the near seam, horizontal gaps along the far seam; pebbles in the front rows
      if (h >= 12 && k + 2 < f.length && r() < .36) tufts.push([xN[k + 1], sN(xN[k + 1]) - 1, h])
      if (h >= 12 && r() < .3) { const x = lerp(c0[0], c1[0], between(r, .25, .75)); tufts.push([x, sF(x) + 1, h * .8]) }
      if (j < 3 && k + 2 < f.length && r() < .6) pebbles.push([xF[k + 1] + (r() - .5) * 4, sF(xF[k + 1]) + (r() - .5) * 2])
    }
  })
  for (const [x, y, h] of tufts) fine += grassD(x, y, 3, r, { height: 4 + h * .16, spread: 7 })
  for (const [x, y] of pebbles.slice(0, 5)) medium += blobD(x, y, between(r, 3, 4.5), between(r, 2.2, 3.2), r, { n: 6, amp: .12 })
  // far blur: a squiggle suggesting stones beyond the last row, just before the shrub
  fine += scallopD(pathLeft(377) + 5, 377, pathRight(377) - 5, 377, 4, 1.5, r)
  // grass tufts along both edges
  for (let y = 384; y < 698; y += between(r, 16, 28)) {
    const h = 5 + (y - 370) / 335 * 15
    fine += grassD(pathLeft(y) - 4, y, 3, r, { height: h, spread: 9 }) + grassD(pathRight(y) + 4, y + 6, 3, r, { height: h, spread: 9 })
  }
  // stepping stones on the lawn at the bottom left, and tufts along the bottom edge
  let stones = ''
  for (const [cx, cy, rx, ry] of [[118, 640, 28, 13], [178, 668, 33, 15], [128, 693, 30, 10]]) {
    stones += blobD(cx, cy, rx, ry, r, { n: 9, amp: .1 })
    fine += `M${fmt(cx - rx * .5)} ${fmt(cy + 1)}q${fmt(rx * .3)} 3 ${fmt(rx * .7)} -1` + grassD(cx + rx + 3, cy + ry * .5, 3, r, { height: 9, spread: 8 })
  }
  for (let x = 62; x < 938; x += between(r, 14, 30)) {
    if (x > 300 && x < 700 && r() < .6) continue
    fine += grassD(x, 702, 3, r, { height: x < 300 || x > 700 ? between(r, 14, 32) : between(r, 8, 16), spread: 12 })
  }
  return { id: 'path', silhouette: path(pathSilD + stones), lines: L('', path(medium), path(fine)), mask: path(pathMaskD + stones) }
}

// ---------- trees ----------
const ellipsePathD = (cx, cy, rx, ry) => `M${fmt(cx - rx)} ${fmt(cy)}a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(rx * 2)} 0a${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(-rx * 2)} 0`
/** Tapered trunk with root flare, bark grain, knots. Returns the layer plus visible edge rows for facets. */
function trunk(id, { x, base, top, hwBase, hwTop, lean, seed, visibleFrom }) {
  const r = rng(seed), left = [], right = [], n = 9
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = lerp(top, base, t), cx = x + lean * (1 - t) * (1 - t)
    const hw = lerp(hwTop, hwBase, Math.pow(t, 1.4)) + (t > .86 ? ((t - .86) / .14) ** 2 * hwBase * .6 : 0)
    left.push([cx - hw + (r() - .5) * 3, y]); right.push([cx + hw + (r() - .5) * 3, y])
  }
  const sil = curveD([...left, ...[...right].reverse()], { close: true, tension: .75 })
  let medium = '', fine = ''
  for (const f of [.3, .55, .74]) {
    const pts = []
    for (let i = 1; i <= n; i++) { const p = lerpPt(left[i], right[i], f + (r() - .5) * .08); pts.push([p[0], p[1] + (r() - .5) * 4]) }
    medium += curveD(pts, { tension: .8 })
  }
  for (let i = 1; i < n; i++) {
    const strokes = 3 + Math.floor(r() * 3)
    for (let k = 0; k < strokes; k++) {
      const f = r() < .6 ? between(r, .55, .95) : between(r, .08, .45), t = between(r, .05, .8)
      const p = lerpPt(lerpPt(left[i], right[i], f), lerpPt(left[i + 1], right[i + 1], f), t), len = between(r, 6, 15)
      fine += `M${fmt(p[0])} ${fmt(p[1])}q${fmt((r() - .5) * 3)} ${fmt(len / 2)} ${fmt((r() - .5) * 2)} ${fmt(len)}`
    }
  }
  for (const i of [5, 7]) {
    const p = lerpPt(left[i], right[i], between(r, .3, .7)), ry = between(r, 5, 7)
    medium += ellipsePathD(p[0], p[1], ry * .55, ry) + ellipsePathD(p[0], p[1], ry * .3, ry * .55)
  }
  medium += `M${fmt(left[n][0] + 2)} ${fmt(base - 9)}q-8 6 -22 11M${fmt(right[n][0] - 2)} ${fmt(base - 8)}q9 5 20 10M${fmt(lerp(left[n][0], right[n][0], .45))} ${fmt(base)}q2 4 6 7`
  fine += grassD(left[n][0] - 6, base + 2, 4, r, { height: 10, spread: 14 }) + grassD(right[n][0] + 6, base + 2, 4, r, { height: 10, spread: 14 })
  const rows = left.map((p, i) => [p, right[i]]).filter(([p]) => p[1] >= visibleFrom)
  return { layer: { id, silhouette: path(sil), lines: L('', path(medium), path(fine)) }, rows }
}
/** Scalloped canopy outline points (same recipe as helpers.canopyD, but keeping the angle of each point). */
function canopyPts(cx, cy, rx, ry, random, { lobes = 11, depth = .13, steps = 40 } = {}) {
  const pts = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps * TAU, k = 1 - depth * Math.abs(Math.sin(lobes * t / 2)) + (random() - .5) * .06
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k, t])
  }
  return pts
}
const shrink = (pts, cx, cy, k) => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])
const inEllipse = ([x, y], cx, cy, rx, ry, k = 1) => ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 <= 1
/** Split a polyline into the runs of points that pass `keep`, dropping runs shorter than three points. */
const runsOf = (pts, keep) => { const runs = []; let cur = []; for (const p of pts) { if (keep(p)) cur.push(p); else { if (cur.length >= 3) runs.push(cur); cur = [] } } if (cur.length >= 3) runs.push(cur); return runs }
/** Cloud-like lower edge of a leaf clump: the arc of an ellipse between two angles with small scallops bulging outward. */
function clumpEdge(cx, cy, rx, ry, a0, a1, random, bump) {
  const n = Math.max(2, Math.round((a1 - a0) * (rx + ry) / 2 / 22)), pts = []
  for (let k = 0; k <= n * 2; k++) {
    const a = a0 + (a1 - a0) * k / (n * 2), out = k % 2 ? bump : -bump * .35
    pts.push([cx + Math.cos(a) * (rx + out) + (random() - .5) * .6, cy + Math.sin(a) * (ry + out) + (random() - .5) * .6])
  }
  return pts
}
/** One layer of several foliage clusters: scalloped outline (heavy); short scallop arcs anchored on the lower rim with a
 *  hatched wedge under each (stacked leaf layers); overlapping sub-clumps drawn as cloud-like lower edges, hidden where a
 *  clump in front overlaps them and shaded underneath; leaf squiggles and small leaves. */
function foliageMass(id, specs, seed, { rimLeaves = 0 } = {}) {
  const r = rng(seed)
  let sil = '', medium = '', fine = ''
  for (const [cx, cy, rx, ry] of specs) {
    const pts = canopyPts(cx, cy, rx, ry, r, { lobes: clamp(Math.round(rx / 9), 6, 13), depth: .13, steps: clamp(Math.round(rx / 2.8), 22, 40) })
    sil += curveD(pts.map(p => [p[0], p[1]]), { close: true, tension: .9 })
    const n = pts.length, at = a => { const f = ((a % TAU) + TAU) % TAU / TAU * n, i = Math.floor(f) % n; return lerpPt(pts[i], pts[(i + 1) % n], f - Math.floor(f)) }
    // short scallop arcs that start and end on the outline, bowing inward, each with a hatched wedge beneath
    const nArcs = rx >= 100 ? 5 : rx >= 55 ? 4 : 3
    let a = between(r, .3, .55)
    for (let i = 0; i < nArcs && a < 2.5; i++) {
      const len = between(r, 32, Math.min(78, rx * 1.1)), a1 = Math.min(2.85, a + len / ((rx + ry) / 2))
      const P0 = at(a), P1 = at(a1), chord = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), bumps = chord > 60 ? 3 : 2
      const depth = chord * between(r, .16, .24), bump = clamp(chord * .06, 2.5, 4)
      const arc = []
      for (let k = 0; k <= bumps * 2; k++) {
        const t = k / (bumps * 2), m = lerpPt(P0, P1, t), d = Math.hypot(cx - m[0], cy - m[1]) || 1
        const s = k === 0 || k === bumps * 2 ? 0 : Math.sin(Math.PI * t) * depth - (k % 2 ? bump : 0) + (r() - .5) * .8
        arc.push([m[0] + (cx - m[0]) / d * s, m[1] + (cy - m[1]) / d * s])
      }
      medium += curveD(arc, { tension: .9 })
      const rim = pts.filter(p => p[2] >= a && p[2] <= a1).map(p => [p[0], p[1]])
      const wedge = [...arc, ...shrink(rim, cx, cy, .96).reverse()]
      if (wedge.length > 5) fine += hatchD(wedge, 35, 7, { inset: 2 })
      a = a1 + between(r, .12, .45)
    }
    // overlapping sub-clumps inside the mass: each is a smaller ellipse whose cloud-like lower edge is drawn only where it
    // is inside the mass and not covered by a clump listed after it (in front); a hatch band under the edge gives it volume
    const nSub = rx >= 100 ? 3 : rx >= 55 ? 2 : 1, subs = []
    for (let i = 0; i < nSub; i++) { const s = between(r, .45, .6); subs.push([cx + between(r, -1, 1) * rx * (.8 - s), cy + between(r, -.5, 1) * ry * (.8 - s), rx * s, ry * s]) }
    const keepIn = p => { const f = Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry); return f <= .94 ? p : [cx + (p[0] - cx) * .94 / f, cy + (p[1] - cy) * .94 / f] }
    subs.forEach(([sx, sy, srx, sry], i) => {
      const visible = p => inEllipse(p, cx, cy, rx, ry, .9) && subs.slice(i + 1).every(([qx, qy, qrx, qry]) => !inEllipse(p, qx, qy, qrx, qry, .92))
      const band = Math.min(13, ry * .2)
      for (const run of runsOf(clumpEdge(sx, sy, srx, sry, .45, Math.PI - .45, r, clamp(srx * .06, 2.5, 4)), visible)) {
        medium += curveD(run, { tension: .9 })
        fine += hatchD([...run, ...run.map(([x, y]) => [x, y + band]).reverse()].map(keepIn), 22, 7, { inset: 3 })
      }
    })
    if (rx < 90) {
      const arc = pts.filter(p => p[2] > .35 && p[2] < 1.25)
      const wedge = [...shrink(arc, cx, cy, .95), ...shrink(arc, cx, cy, .66).reverse()]
      if (wedge.length > 5) fine += hatchD(wedge, 35, 8, { inset: 2 })
    }
    fine += foliageD(cx, cy - ry * .18, rx * .8, ry * .62, r, { count: Math.round(rx * ry / 127), size: 9 })
    // small leaves drawn inside the mass, biased toward the lower rim, so the scale of the foliage reads
    for (let i = 0, cnt = clamp(Math.round(rx / 11), 5, 12); i < cnt; i++) {
      const ang = between(r, 15, 165) * Math.PI / 180, k = between(r, .5, .9)
      const lf = leaf(cx + Math.cos(ang) * rx * k, cy + Math.sin(ang) * ry * k, between(r, 10, 14), 6, between(r, 0, 360), { kind: r() < .5 ? 'oval' : 'lance', veins: 0 })
      medium += lf.d; fine += lf.veinsD
    }
    for (let i = 0; i < rimLeaves; i++) {
      const ang = between(r, 25, 155), rad = ang * Math.PI / 180
      const lf = leaf(cx + Math.cos(rad) * rx * .9, cy + Math.sin(rad) * ry * .9, between(r, 11, 15), 6.5, ang + between(r, -25, 25), { kind: 'oval', veins: 0 })
      medium += lf.d; fine += lf.veinsD
    }
  }
  return { id, silhouette: path(sil), lines: L('', path(medium), path(fine)) }
}
const twigsD = (p0, p1, twigs) => twigs.map(([t, len, ang]) => { const m = lerpPt(p0, p1, t), a = ang * Math.PI / 180; return `M${fmt(m[0])} ${fmt(m[1])}q${fmt(Math.cos(a) * len * .5 + 3)} ${fmt(Math.sin(a) * len * .5)} ${fmt(Math.cos(a) * len)} ${fmt(Math.sin(a) * len)}` }).join('')
function limbs(id, specs, seed) {
  const r = rng(seed)
  let sil = '', medium = ''
  for (const [p0, p1, w0, w1, bend, twigs] of specs) { sil += branchD(p0, p1, w0, w1, bend, r); medium += twigsD(p0, p1, twigs) }
  return { id, silhouette: path(sil), lines: L('', path(medium), '') }
}
function leftTree() {
  const t = trunk('trunkL', { x: 175, base: 560, top: 215, hwBase: 24, hwTop: 13, lean: -8, seed: 101, visibleFrom: 300 })
  const layers = [
    foliageMass('canLBack', [[200, 145, 128, 80], [118, 210, 62, 50], [300, 200, 62, 48]], 111),
    t.layer,
    foliageMass('canLFront', [[160, 262, 84, 48], [262, 262, 66, 42]], 112, { rimLeaves: 4 }),
    limbs('limbsL', [[[190, 330], [352, 268], 12, 5, 8, [[.45, 18, -70], [.7, 14, 50]]], [[166, 330], [112, 300], 9, 4, -5, [[.5, 12, -150]]], [[188, 382], [238, 332], 8, 4, 4, [[.5, 10, -40]]]], 113),
    foliageMass('canLEnds', [[368, 262, 54, 38], [248, 318, 36, 24], [104, 280, 44, 32]], 114, { rimLeaves: 3 }),
  ]
  return { layers, rows: t.rows }
}
// The right trunk stands clear of the bench: base centred at x=842 (root flare 807-877), leaning left to x=810 under the canopy.
const TRUNK_R = { x: 842, base: 545 }
function rightTree() {
  const t = trunk('trunkR', { x: TRUNK_R.x, base: TRUNK_R.base, top: 225, hwBase: 22, hwTop: 12, lean: -32, seed: 201, visibleFrom: 296 })
  const layers = [
    foliageMass('canRBack', [[805, 160, 128, 82], [876, 222, 60, 48], [712, 212, 58, 46]], 211),
    t.layer,
    foliageMass('canRFront', [[822, 250, 80, 46], [732, 246, 60, 40]], 212, { rimLeaves: 4 }),
    limbs('limbsR', [[[827, 322], [650, 278], 11, 5, -8, [[.4, 16, -120], [.7, 12, 60]]], [[829, 338], [760, 310], 8, 4, 3, [[.5, 10, -90]]]], 213),
    foliageMass('canREnds', [[632, 266, 56, 40], [748, 308, 36, 24], [892, 266, 44, 32]], 214, { rimLeaves: 3 }),
  ]
  return { layers, rows: t.rows }
}
/** Hanging branch with big leaves from the top-right corner, in front of the right canopy. */
function hangingBranch() {
  const r = rng(301)
  const p0 = [938, 62], p1 = [690, 158]
  const bd = branchD(p0, p1, 9, 3, 14, r)
  let sil = bd, medium = '', fine = ''
  const along = t => { const m = lerpPt(p0, p1, t), sag = Math.sin(Math.PI * t) * 14; return [m[0] - .36 * sag, m[1] + .93 * sag] }
  const stops = [.1, .22, .34, .46, .58, .7, .82, .94]
  stops.forEach((t, i) => {
    const base = along(t), side = i % 2 ? 1 : -1
    const ang = 98 + side * between(r, 12, 28), len = between(r, 30, 42) * (1 - t * .2)
    const lf = leaf(base[0], base[1], len, len * .48, ang, { kind: 'oval', bend: side * .12, veins: 3, side: 1 })
    sil += lf.d; medium += lf.d; fine += lf.veinsD + `M${fmt(base[0])} ${fmt(base[1])}l${fmt(side * 3)} -4`
  })
  for (const [t, len, ang] of [[.3, 26, 150], [.62, 22, 140], [.9, 18, 160]]) {
    const b = along(t), a = ang * Math.PI / 180, e = [b[0] + Math.cos(a) * len, b[1] + Math.sin(a) * len]
    medium += `M${fmt(b[0])} ${fmt(b[1])}Q${fmt(b[0] + Math.cos(a) * len * .5)} ${fmt(b[1] + Math.sin(a) * len * .5 + 4)} ${fmt(e[0])} ${fmt(e[1])}`
    const lf = leaf(e[0], e[1], 20, 10, ang + 30, { kind: 'oval', veins: 0 }); sil += lf.d; medium += lf.d; fine += lf.veinsD
  }
  return { id: 'hangingBranch', silhouette: path(sil), outline: false, lines: L(path(bd), path(medium), path(fine)) }
}

// ---------- fence (ends at x=290, leaving a clear gap to the lamp post at x=340) ----------
const FENCE_POSTS = [[58, 15, 76], [278, 12, 58]]
const fenceYBase = x => 505 - 45 * (x - 55) / 277, fenceScale = x => 1 - .27 * (x - 55) / 277
const postTop = ([x, w, h]) => fenceYBase(x + w / 2) + 2 - h
function fence() {
  const r = rng(51)
  const yBase = fenceYBase, scale = fenceScale, railY = (x, f) => yBase(x) - 60 * scale(x) * f
  let sil = '', medium = '', fine = '', heavy = ''
  const pickets = []
  for (let x = 78; x < 266;) {
    const s = scale(x), w = 13 * s, h = 60 * s, yb = yBase(x) + (r() - .5) * 1.5, top = yb - h, sh = w * .55
    const p = [[x, yb], [x + w, yb], [x + w, top + sh], [x + w / 2, top], [x, top + sh]]
    pickets.push(p)
    sil += polyD(p); medium += polyD(jitter(p, .4, r))
    if (r() < .7) fine += `M${fmt(x + w * .4)} ${fmt(top + sh + 5)}q${fmt((r() - .5) * 2)} ${fmt(h * .3)} ${fmt(w * .08)} ${fmt(h - sh - 12)}`
    if (r() < .35) fine += `M${fmt(x + w * .3)} ${fmt(yb - h * .5)}a1.6 1.6 0 1 0 3.2 0`
    x += (13 + 9.5) * s
  }
  const railAt = (p, f) => p[0][1] - (p[0][1] - p[3][1]) * f
  for (let i = 0; i + 1 < pickets.length; i++) {
    const a = pickets[i], b = pickets[i + 1], gx0 = a[1][0], gx1 = b[0][0], th = 6.5 * scale(gx0)
    for (const f of [.3, .7]) medium += lineD(gx0, railAt(a, f), gx1, railAt(b, f)) + lineD(gx0, railAt(a, f) + th, gx1, railAt(b, f) + th)
  }
  const first = pickets[0], last = pickets.at(-1), x0 = first[0][0] - 8, x1 = FENCE_POSTS[1][0] + 3
  for (const f of [.3, .7]) {
    sil += polyD([[x0, railY(x0, f)], [x1, railY(x1, f)], [x1, railY(x1, f) + 6], [x0, railY(x0, f) + 6.5]])
    medium += lineD(last[1][0], railAt(last, f), x1, railY(x1, f)) + lineD(last[1][0], railAt(last, f) + 5.2, x1, railY(x1, f) + 5.2)
  }
  for (const post of FENCE_POSTS) {
    const [x, w, h] = post, yb = yBase(x + w / 2) + 2, top = yb - h
    const p = [[x, yb], [x + w, yb], [x + w, top], [x + w / 2, top - w * .5], [x, top]]
    sil += polyD(p); heavy += polyD(p)
    medium += lineD(x, top, x + w, top) + lineD(x + w * .5, top, x + w * .5, top + 5)
    fine += grainD([x + 3, top + 8], [x + 3, yb - 4], [x + w - 3, top + 8], [x + w - 3, yb - 4], 2, r) + grassD(x + w / 2, yb + 1, 4, r, { height: 9, spread: w + 6 })
  }
  for (const p of pickets) if (r() < .4) fine += grassD(p[0][0] + 6, p[0][1] + 1, 3, r, { height: 7, spread: 9 })
  return { id: 'fence', silhouette: path(sil), outline: false, lines: L(path(heavy), path(medium), path(fine)) }
}

// ---------- flower bed (all helpers return d strings) ----------
function tulip(x, yBase, h, r) {
  const top = yBase - h, w = 15, ht = 19, lean = between(r, -4, 4)
  const head = `M${fmt(x - w / 2)} ${fmt(top + ht)}Q${fmt(x - w / 2 - 1.5)} ${fmt(top + 4)} ${fmt(x - w / 2 + 1)} ${fmt(top)}L${fmt(x - w / 4)} ${fmt(top + 5)}L${fmt(x)} ${fmt(top - 1)}L${fmt(x + w / 4)} ${fmt(top + 5)}L${fmt(x + w / 2 - 1)} ${fmt(top)}Q${fmt(x + w / 2 + 1.5)} ${fmt(top + 4)} ${fmt(x + w / 2)} ${fmt(top + ht)}Q${fmt(x)} ${fmt(top + ht + 5)} ${fmt(x - w / 2)} ${fmt(top + ht)}Z`
  const headSil = polyD([[x - w / 2, top + ht], [x - w / 2, top], [x, top - 1], [x + w / 2, top], [x + w / 2, top + ht], [x, top + ht + 4]])
  const stem = `M${fmt(x)} ${fmt(top + ht + 3)}Q${fmt(x + lean)} ${fmt(top + ht + h * .5)} ${fmt(x + lean)} ${fmt(yBase)}`
  const lf = leaf(x + lean, yBase, 26, 7.5, between(r, -118, -95), { kind: 'lance', bend: .12, veins: 0 })
  const lf2 = leaf(x + lean + 1, yBase - 2, 19, 6.5, between(r, -80, -62), { kind: 'lance', bend: -.1, veins: 0 })
  return { sil: headSil, medium: head + stem + lf.d + lf2.d, fine: `M${fmt(x - w / 4)} ${fmt(top + 5)}l1 ${fmt(ht - 3)}` + lf.veinsD }
}
function daisy(x, y, r) {
  const rc = 3.8, petals = 7, pl = 7.5, pw = 4.6, rot = r() * Math.PI
  let d = ellipsePathD(x, y, rc, rc)
  for (let i = 0; i < petals; i++) {
    const a = rot + i / petals * TAU, cx = x + Math.cos(a) * (rc + pl / 2 - .5), cy = y + Math.sin(a) * (rc + pl / 2 - .5), c = Math.cos(a), s = Math.sin(a)
    const P = (u, v) => `${fmt(cx + u * c - v * s)} ${fmt(cy + u * s + v * c)}`
    d += `M${P(-pl / 2, 0)}Q${P(0, -pw * .75)} ${P(pl / 2, 0)}Q${P(0, pw * .75)} ${P(-pl / 2, 0)}Z`
  }
  const stem = `M${fmt(x)} ${fmt(y + rc + pl)}q${fmt(between(r, -3, 3))} 6 ${fmt(between(r, -2, 2))} ${fmt(12 + r() * 6)}`
  return { sil: ellipsePathD(x, y, rc + pl, rc + pl) + 'Z', medium: d + stem, fine: `M${fmt(x - 1.5)} ${fmt(y - 1)}l1 2` }
}
function lavender(x, yBase, h, r) {
  const top = yBase - h, sw = 8, sh = 28, lean = between(r, -3, 3)
  const spike = curveD([[x, top], [x + sw / 2, top + sh * .3], [x + sw / 2 - .5, top + sh * .78], [x, top + sh], [x - sw / 2 + .5, top + sh * .78], [x - sw / 2, top + sh * .3]], { close: true, tension: .8 })
  const stem = `M${fmt(x)} ${fmt(top + sh)}Q${fmt(x + lean)} ${fmt(top + sh + (h - sh) * .5)} ${fmt(x + lean)} ${fmt(yBase)}`
  return { sil: spike, medium: spike + stem, fine: ticksD(x, top + 5, x, top + sh - 3, 5, 5.5) + grassD(x + lean, yBase, 3, r, { height: 12, spread: 8 }) }
}
const soilPts = [[204, 482], [262, 472], [332, 464], [378, 472], [388, 498], [352, 548], [318, 592], [296, 614], [246, 620], [206, 604], [196, 540]]
const soilD = curveD(soilPts, { close: true, tension: .8 })
function flowersBack() {
  const r = rng(71)
  let sil = soilD, medium = '', fine = ''
  // five lavender spikes, low enough to sit below the fence rails and well left of the lamp post
  for (let i = 0; i < 5; i++) { const p = lavender(224 + i * 22 + between(r, -3, 3), 522 + (i % 2) * 6 + between(r, 0, 4), between(r, 40, 48), r); sil += p.sil; medium += p.medium; fine += p.fine }
  // low stone edging along the front of the bed
  const edge = [[196, 540], [206, 604], [246, 620], [296, 614], [318, 592], [352, 548], [380, 505]]
  for (let i = 0; i + 1 < edge.length; i++) {
    const a = edge[i], b = edge[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 17))
    for (let k = 0; k < n; k++) { const m = lerpPt(a, b, (k + .5) / n); const d = blobD(m[0], m[1], 8, 4.5, r, { n: 7, amp: .12 }); sil += d; medium += d }
  }
  for (let i = 0; i < 16; i++) fine += `M${fmt(between(r, 215, 350))} ${fmt(between(r, 556, 606))}l${fmt(between(r, 4, 9))} ${fmt(between(r, -1.5, 1.5))}`
  return { id: 'flowersBack', silhouette: path(sil), outline: false, lines: L('', path(medium), path(fine)) }
}
function flowersFront() {
  const r = rng(72)
  let sil = '', medium = '', fine = ''
  const rows = [[[244, 270, 296, 320], 550, 40], [[214, 240, 266, 292, 316], 582, 36]]
  for (const [xs, y, h] of rows) for (const x of xs) { const p = tulip(x + between(r, -2, 2), y + between(r, -4, 4), h + between(r, -4, 6), r); sil += p.sil; medium += p.medium; fine += p.fine }
  for (const [x, y] of [[222, 603], [246, 606], [270, 604], [292, 598], [306, 588], [326, 572]]) { const p = daisy(x + between(r, -2, 2), y + between(r, -2, 2), r); sil += p.sil; medium += p.medium; fine += p.fine }
  return { id: 'flowersFront', silhouette: path(sil), outline: false, lines: L('', path(medium), path(fine)) }
}
function bushD(cx, cy, rx, ry, r) {
  const d = canopyD(cx, cy, rx, ry, r, { lobes: 9, depth: .12, steps: 26 })
  const fine = foliageD(cx, cy, rx * .82, ry * .78, r, { count: Math.round(rx * ry / 95), size: 8 }) + underHatch(cx, cy, rx, ry, 35, 6)
  return { sil: d, medium: scallopD(cx - rx * .5, cy + ry * .25, cx + rx * .45, cy + ry * .2, 3, 4, r), fine }
}
function bushLayer(id, specs, seed) {
  const r = rng(seed)
  let sil = '', medium = '', fine = ''
  for (const [cx, cy, rx, ry] of specs) { const b = bushD(cx, cy, rx, ry, r); sil += b.sil; medium += b.medium; fine += b.fine }
  return { id, silhouette: path(sil), lines: L('', path(medium), path(fine)) }
}
const BUSHES = [[424, 430, 24, 16], [895, 640, 42, 28]], BUSH1 = [220, 522, 30, 22]

// ---------- lamp post and watering can ----------
const LAMP = { x: 340, base: 530, top: 530 - 172 }
function lampPostD() {
  const { x, base, top } = LAMP
  const plinth1 = [[x - 16, base], [x + 16, base], [x + 14, base - 7], [x - 14, base - 7]]
  const plinth2 = [[x - 11, base - 7], [x + 11, base - 7], [x + 9, base - 17], [x - 9, base - 17]]
  const post = [[x - 4.5, base - 17], [x + 4.5, base - 17], [x + 3.5, top], [x - 3.5, top]]
  const collar = [[x - 7, base - 40], [x + 7, base - 40], [x + 7, base - 34], [x - 7, base - 34]]
  const bracket = [[x - 10, top], [x + 10, top], [x + 8, top - 7], [x - 8, top - 7]]
  const body = [[x - 9, top - 7], [x + 9, top - 7], [x + 14, top - 44], [x - 14, top - 44]]
  const cap = [[x - 18, top - 44], [x + 18, top - 44], [x, top - 60]]
  const sil = [plinth1, plinth2, post, collar, bracket, body, cap].map(p => polyD(p)).join('') + ellipsePathD(x, top - 64, 3.6, 3.6) + 'Z'
  const heavy = polyD(plinth1) + polyD(post) + polyD(body) + polyD(cap)
  const medium = polyD(plinth2) + polyD(collar) + polyD(bracket) + lineD(x - 4.5, top - 7, x - 8, top - 44) + lineD(x + 4.5, top - 7, x + 8, top - 44) + lineD(x - 11.5, top - 26, x + 11.5, top - 26) + ellipsePathD(x, top - 64, 3.6, 3.6) + lineD(x - 14, top - 47, x + 14, top - 47) + lineD(x - 6, top - 44, x, top - 58) + lineD(x + 6, top - 44, x, top - 58) + `M${fmt(x - 14)} ${fmt(base)}q14 4 28 0`
  const fine = hatchD([[x + 4.5, top - 7], [x + 9, top - 7], [x + 14, top - 44], [x + 8, top - 44]], 70, 5) + hatchD([[x + .5, base - 20], [x + 4.5, base - 20], [x + 3.5, top + 4], [x + .5, top + 4]], 85, 7)
  return { sil, heavy, medium, fine }
}
function lamp() {
  const a = lampPostD()
  return { id: 'lamp', silhouette: path(a.sil), outline: false, lines: L(path(a.heavy), path(a.medium), path(a.fine)) }
}
const CAN = { cx: 684, base: 638, hw: 21 }
function wateringCanD(r = rng(81)) {
  const { cx, base, hw } = CAN, topY = base - 30
  const body = [[cx - hw, topY], [cx + hw, topY], [cx + hw + 4, base], [cx - hw - 4, base]]
  const spout = [[cx - hw + 2, topY + 8], [cx - hw + 2, topY + 16], [cx - hw - 24, base - 40], [cx - hw - 28, base - 46]]
  const rose = ellipsePathD(cx - hw - 28, base - 46, 5.5, 4) + 'Z'
  const handleTop = `M${fmt(cx - 13)} ${fmt(topY)}Q${fmt(cx)} ${fmt(topY - 22)} ${fmt(cx + 13)} ${fmt(topY)}L${fmt(cx + 9)} ${fmt(topY)}Q${fmt(cx)} ${fmt(topY - 16)} ${fmt(cx - 9)} ${fmt(topY)}Z`
  const handleSide = `M${fmt(cx + hw + 1)} ${fmt(topY + 6)}Q${fmt(cx + hw + 18)} ${fmt(topY + 15)} ${fmt(cx + hw + 3)} ${fmt(base - 6)}L${fmt(cx + hw + 3)} ${fmt(base - 10)}Q${fmt(cx + hw + 13)} ${fmt(topY + 15)} ${fmt(cx + hw + 1)} ${fmt(topY + 10)}Z`
  const sil = polyD(body) + polyD(spout) + rose + handleTop + handleSide
  const heavy = polyD(body) + polyD(spout) + handleTop + handleSide
  const medium = ellipsePathD(cx, topY, hw, 4.5) + rose + lineD(cx - hw - 1, topY + 10, cx + hw + 1, topY + 10) + lineD(cx - hw - 3, base - 8, cx + hw + 3, base - 8) + `M${fmt(cx - hw - 4)} ${fmt(base)}q25 4 50 0`
  const fine = hatchD([[cx + 8, topY + 12], [cx + hw, topY + 12], [cx + hw + 3, base - 9], [cx + 8, base - 9]], 80, 5) + ticksD(cx - hw - 26, base - 44, cx - hw - 30, base - 48, 3, 4) + grassD(cx - 18, base + 1, 3, r, { height: 8, spread: 10 }) + grassD(cx + 20, base + 1, 3, r, { height: 8, spread: 10 })
  return { sil, heavy, medium, fine }
}
function can() {
  const b = wateringCanD()
  return { id: 'can', silhouette: path(b.sil), outline: false, lines: L(path(b.heavy), path(b.medium), path(b.fine)) }
}

// ---------- bench (geometry shared by the layer, its shadows and its facets) ----------
const BENCH = (() => {
  const F0 = [590, 522], F1 = [770, 511], dep = [20, -24], th = 6, legH = 52
  const B0 = add(F0, dep), B1 = add(F1, dep)
  const leg = (p, x0, x1, extra = 0) => [[p[0] + x0, p[1] + th], [p[0] + x1, p[1] + th], [p[0] + x1, p[1] + th + legH + extra], [p[0] + x0, p[1] + th + legH + extra]]
  const legs = [leg(F0, 2, 9), leg(F1, -9, -2), leg(B0, 2, 9, 2), leg(B1, -9, -2, 2)]
  const upr = p => [[p[0], p[1]], [p[0] + 7, p[1]], [p[0] + 11, p[1] - 70], [p[0] + 4, p[1] - 70]]
  const slat = (h0, h1) => [[B0[0] + 7 + 4 * h0 / 70, B0[1] - h0], [B1[0] + 4 * h0 / 70, B1[1] - h0], [B1[0] + 4 * h1 / 70, B1[1] - h1], [B0[0] + 7 + 4 * h1 / 70, B0[1] - h1]]
  const arm = (f, b) => [[f[0] + 2, f[1] - 27], [b[0] + 2, b[1] - 27], [b[0] + 2, b[1] - 22], [f[0] + 2, f[1] - 22]]
  const sup = f => [[f[0] + 1, f[1] - 22], [f[0] + 6, f[1] - 22], [f[0] + 6, f[1]], [f[0] + 1, f[1]]]
  const sy = th + legH * .62
  const stretcher = [[F0[0] + 9, F0[1] + sy], [F1[0] - 9, F1[1] + sy], [F1[0] - 9, F1[1] + sy + 4], [F0[0] + 9, F0[1] + sy + 4]]
  const footprint = [legs[0][3], legs[1][2], legs[3][2], legs[2][3]]
  const contact = [add(legs[0][3], [4, -6]), add(legs[1][2], [-1, -6]), add(legs[3][2], [-2, 1]), add(legs[2][3], [2, 0])]
  return { F0, F1, B0, B1, th, legs, uprL: upr(B0), uprR: upr(B1), backSlats: [slat(9, 27), slat(37, 53), slat(59, 69)], armL: arm(F0, B0), armR: arm(F1, B1), supL: sup(F0), supR: sup(F1), stretcher, footprint, contact }
})()
function bench() {
  const r = rng(61)
  const { F0, F1, B0, B1, th, legs, uprL, uprR, backSlats, armL, armR, supL, supR, stretcher } = BENCH
  const seatBlock = [[F0[0], F0[1] + th], [F1[0], F1[1] + th], F1, B1, B0, F0]
  const parts = [seatBlock, ...legs, stretcher, uprL, uprR, ...backSlats, armL, armR, supL, supR]
  const sil = parts.map(p => polyD(p)).join('')
  const heavy = polyD(seatBlock) + legs.map(p => polyD(p)).join('') + polyD(uprL) + polyD(uprR) + polyD(backSlats[2]) + polyD(armL) + polyD(armR)
  let medium = polyD(stretcher) + polyD(backSlats[0]) + polyD(backSlats[1]) + polyD(supL) + polyD(supR)
  medium += lineD(F0[0], F0[1], B0[0], B0[1]) + lineD(F1[0], F1[1], B1[0], B1[1])
  for (const f of [.34, .67]) { const a = lerpPt(F0, B0, f), b = lerpPt(F1, B1, f); medium += lineD(a[0], a[1], b[0], b[1]) + lineD(a[0], a[1] + 2, b[0], b[1] + 2) }
  medium += lineD(F0[0], F0[1] + th, F1[0], F1[1] + th) + lineD(F0[0], F0[1] + th, B0[0], B0[1] + th)
  let fine = ''
  for (const f of [.17, .5, .84]) { const a = lerpPt(F0, B0, f), b = lerpPt(F1, B1, f); fine += grainD([a[0] + 12, a[1] - 1.2], [b[0] - 12, b[1] - 1.2], [a[0] + 12, a[1] + 1.2], [b[0] - 12, b[1] + 1.2], 1, r) }
  for (const s of backSlats.slice(0, 2)) fine += grainD([s[0][0] + 10, s[0][1] + 4], [s[1][0] - 10, s[1][1] + 4], [s[3][0] + 10, s[3][1] - 4], [s[2][0] - 10, s[2][1] - 4], 2, r)
  fine += hatchD([[F0[0], F0[1] + 1], [B0[0], B0[1] + 1], [B0[0], B0[1] + th], [F0[0], F0[1] + th]], 60, 5)
  fine += hatchD([[F0[0] + 2, F0[1] + th - 1], [F1[0] - 2, F1[1] + th - 1], [F1[0] - 2, F1[1] + 1], [F0[0] + 2, F0[1] + 1]], 0, 5)
  for (const p of legs) fine += hatchD([[p[0][0] + 3.5, p[0][1] + 4], [p[1][0], p[1][1] + 4], [p[2][0], p[2][1] - 3], [p[3][0] + 3.5, p[3][1] - 3]], 90, 5)
  medium += ellipsePathD(B0[0] + 4, B0[1] - 15, 2, 2) + ellipsePathD(B1[0] + 4, B1[1] - 15, 2, 2)
  for (const p of legs) fine += grassD(p[3][0] + 3, p[3][1] + 1, 3, r, { height: 8, spread: 12 })
  return { id: 'bench', silhouette: path(sil), outline: false, lines: L(path(heavy), path(medium), path(fine)) }
}

// ---------- assembly ----------
const hedge = shrubRow(), treeL = leftTree(), treeR = rightTree(), pathLayer = flagstones()
const layers = [
  sky(), lawn(), pathLayer, ...hedge, fence(),
  ...treeL.layers, ...treeR.layers, hangingBranch(),
  flowersBack(), bushLayer('bush1', [BUSH1], 131), lamp(), flowersFront(),
  bushLayer('bushes', BUSHES, 132), bench(), can(),
]
const treeIds = [...hedge.map(l => l.id), ...treeL.layers.map(l => l.id), ...treeR.layers.map(l => l.id), 'hangingBranch', 'bushes']

// ---------- shadows ----------
const bushFoot = ([cx, cy, rx, ry]) => [ellipsePoly(cx, cy + ry * .75, rx * .9, 3.5, 8), Math.round(rx * .8)]
const footprints = [
  [ellipsePoly(175, 560, 30, 6, 8), 120], [ellipsePoly(TRUNK_R.x, TRUNK_R.base, 30, 6, 8), 120], [ellipsePoly(LAMP.x, LAMP.base, 16, 4, 8), 70],
  [BENCH.footprint, 52], [[[58, 507], [290, 470], [290, 473], [58, 510]], 34],
  bushFoot(BUSH1), bushFoot(BUSHES[0]), bushFoot(BUSHES[1]), [ellipsePoly(CAN.cx, CAN.base, 24, 4, 8), 18],
]
const bushContact = ([cx, cy, rx, ry]) => ellipse(cx, cy + ry * .75 + 1, rx * .95, 3.5)
const contacts = ellipse(175, 561, 31, 5) + ellipse(TRUNK_R.x, TRUNK_R.base + 1, 32, 4) + ellipse(LAMP.x, LAMP.base + 1, 17, 3) + path(polyD(BENCH.contact)) + ellipse(CAN.cx, CAN.base + 1, 25, 4)
  + bushContact(BUSH1) + bushContact(BUSHES[0]) + bushContact(BUSHES[1]) + ellipse(65, 508, 10, 3) + ellipse(284, 470, 8, 2.5)
const DIRS = { 'upper-left': [1, .38], 'upper-right': [-1, .38], left: [1, .12], right: [-1, .12] }
const shadowsFor = scale => Object.fromEntries(Object.entries(DIRS).map(([dir, [sx, sy]]) => [dir, footprints.map(([fp, len]) => path(castClip(fp, sx * len * scale, sy * len * scale))).join('') + contacts]))
const shadows = shadowsFor(1), longShadows = shadowsFor(2.6)

// ---------- facets: faces in shade for light from the left (right-hand faces) and from the right (left-hand faces) ----------
const trunkStrip = (rows, side) => {
  const groups = []
  let cur = []
  rows.forEach((row, i) => { cur.push(row); if (i === rows.length - 1 || rows[i + 1][0][1] - row[0][1] > 60) { groups.push(cur); cur = [] } })
  return groups.map(g => polyD(side === 'right' ? [...g.map(([, rr]) => rr), ...[...g].reverse().map(([l, rr]) => lerpPt(l, rr, .66))] : [...g.map(([l]) => l), ...[...g].reverse().map(([l, rr]) => lerpPt(l, rr, .34))])).join('')
}
const benchSide = side => {
  const { F0, F1, B0, B1, th, legs, uprL, uprR } = BENCH
  return side === 'right'
    ? polyD([[F1[0] - 22, F1[1] + th + 1.5], [F1[0], F1[1] + th], F1, B1, [B1[0] - 22, B1[1] + 1.5], [F1[0] - 22, F1[1] + 1.5]]) + polyD(legs[1]) + polyD(legs[3]) + polyD(uprR)
    : polyD([F0, B0, [B0[0], B0[1] + th], [F0[0], F0[1] + th]]) + polyD(legs[0]) + polyD(legs[2]) + polyD(uprL)
}
const lampSide = side => { const { x, base, top } = LAMP; return side === 'right'
  ? polyD([[x, top - 7], [x + 9, top - 7], [x + 14, top - 44], [x, top - 44]]) + polyD([[x, base - 17], [x + 4.5, base - 17], [x + 3.5, top], [x, top]])
  : polyD([[x - 9, top - 7], [x, top - 7], [x, top - 44], [x - 14, top - 44]]) + polyD([[x - 4.5, base - 17], [x, base - 17], [x, top], [x - 3.5, top]]) }
const canSide = side => { const { cx, base, hw } = CAN, topY = base - 30; return side === 'right'
  ? polyD([[cx + hw - 10, topY], [cx + hw, topY], [cx + hw + 4, base], [cx + hw - 10, base]])
  : polyD([[cx - hw, topY], [cx - hw + 10, topY], [cx - hw + 10, base], [cx - hw - 4, base]]) }
const postSides = side => FENCE_POSTS.map(post => { const [x, w] = post, top = postTop(post), yb = top + post[2], m = x + w / 2
  return side === 'right' ? polyD([[m, top], [x + w, top], [x + w, yb], [m, yb]]) : polyD([[x, top], [m, top], [m, yb], [x, yb]]) }).join('')
const crescents = side => {
  const arcs = side === 'right' ? [-55, 55] : [125, 235]
  return [[160, 262, 84, 48], [262, 262, 66, 42], [822, 250, 80, 46], [732, 246, 60, 40], [368, 262, 54, 38], [632, 266, 56, 40], BUSH1, ...BUSHES].map(([cx, cy, rx, ry]) => ring(cx, cy, rx, ry, arcs[0], arcs[1], .5)).join('')
}
const facets = {
  left: path(trunkStrip(treeL.rows, 'right') + trunkStrip(treeR.rows, 'right') + benchSide('right') + lampSide('right') + canSide('right') + postSides('right') + crescents('right')),
  right: path(trunkStrip(treeL.rows, 'left') + trunkStrip(treeR.rows, 'left') + benchSide('left') + lampSide('left') + canSide('left') + postSides('left') + crescents('left')),
}

export const scene = {
  id: 'garden-path',
  indoor: false,
  wash: '#e5e9ce',
  layers,
  regions: [
    { id: 'sky', label: '나무 사이 하늘', material: 'other', wash: '#dfe9ef', shape: path('M55 55H945V350H55Z') },
    { id: 'grass', label: '풀과 작은 잎', material: 'foliage', wash: '#d3dfae', shape: path(grassRegionD) },
    { id: 'path', label: '정원의 길', material: 'stone', wash: '#e9d8bc', shape: pathLayer.mask },
    { id: 'trees', label: '큰 나무와 가지', material: 'foliage', wash: '#c5d4a6', layers: treeIds },
    { id: 'fence', label: '울타리', material: 'wood', wash: '#e7dcc6', layers: ['fence'] },
    { id: 'flowers', label: '꽃', material: 'foliage', wash: '#e8d3dc', layers: ['flowersBack', 'bush1', 'flowersFront'] },
    { id: 'bench', label: '길 옆 벤치', material: 'wood', wash: '#dcc49c', layers: ['bench'] },
  ],
  shadows,
  longShadows,
  facets,
}
