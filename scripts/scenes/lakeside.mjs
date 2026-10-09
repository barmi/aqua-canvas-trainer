// Lakeside: a big tree on the near-left shore, two mountain ranges, a conifer far shore, a wooden
// dock receding from the right bank with a moored rowboat, and a pebbly foreground shore.
// Layers back to front: sky, farRange, nearRange, treelineBack, treeline, water, dock, dockPosts, boat,
// oars, shore, rocks, trunk, canopy1..6, sprigs. All coordinates are absolute in the 1000 x 760 canvas.
import { path, polyD, curveD, lineD, ellipse, ellipseD, rng, between, hull, hatchD, canopyD, foliageD, cloudD, grassD, sprig, fmt } from './helpers.mjs'

const F = { x0: 55, y0: 55, x1: 945, y1: 705 }
const HORIZON = 362
const VP = [300, HORIZON]        // vanishing point of the dock's long edges
const VP2 = [3700, HORIZON]      // vanishing point of the dock's cross planks (far to the right)

// ---------- small utilities ----------
const pt = ([x, y]) => `${fmt(x)} ${fmt(y)}`
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k]
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
/** Clip a polygon against a half-plane: keep points where coord[axis] (>= or <=) value. */
function clipHalf(pts, axis, value, keepGreater) {
  const inside = p => keepGreater ? p[axis] >= value : p[axis] <= value
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b)
    if (ia) out.push(a)
    if (ia !== ib) { const t = (value - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
  }
  return out
}
/** Clip a polygon to one side of the directed line p->q: keep points whose cross product with the line has the given sign. */
function clipSide(pts, p, q, sign) {
  const s = ([x, y]) => ((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) * sign
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], sa = s(a), sb = s(b)
    if (sa >= 0) out.push(a)
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
  }
  return out
}
const clipFrame = pts => { let p = clipHalf(pts, 0, F.x0, true); p = p.length ? clipHalf(p, 0, F.x1, false) : p; p = p.length ? clipHalf(p, 1, F.y0, true) : p; return p.length ? clipHalf(p, 1, F.y1, false) : p }
const ellipsePts = (cx, cy, rx, ry, n = 20, random = null, amp = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, k = 1 + (random ? (random() - .5) * amp : 0); return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] })
/** Join several open d strings into one closed subpath with sharp corners between them. */
const joinClosed = parts => parts.map((d, i) => (i ? d.replace(/^M/, 'L') : d)).join('') + 'Z'
/** Wobbly stroke between two points. */
const wobbleD = (a, b, random, amp = 1.5, n = 4) => curveD(Array.from({ length: n + 1 }, (_, i) => { const m = mix(a, b, i / n); return i === 0 || i === n ? m : [m[0] + (random() - .5) * 2 * amp, m[1] + (random() - .5) * 2 * amp] }))
/** Subdivide a polyline with jitter so ridges and banks look hand drawn. */
function roughen(points, random, { sub = 3, amp = 2 } = {}) {
  const out = [points[0]]
  for (let i = 1; i < points.length; i++) {
    for (let k = 1; k <= sub; k++) {
      const m = mix(points[i - 1], points[i], k / sub)
      out.push(k === sub ? m : [m[0] + (random() - .5) * 2 * amp, m[1] + (random() - .5) * 2 * amp])
    }
  }
  return out
}
const yOnPolyline = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1) } return pts[pts.length - 1][1] }
/** Vertical zigzag reflection stroke. */
const zigzagD = (x, y, len, random, amp = 2.5, step = 7) => { let d = `M${fmt(x)} ${fmt(y)}`; for (let s = step, k = 1; s <= len; s += step, k++) d += `L${fmt(x + (k % 2 ? amp : -amp) + (random() - .5))} ${fmt(y + s)}`; return d }
/** Short wavy horizontal ripple. */
const rippleD = (x, y, len) => `M${fmt(x)} ${fmt(y)}q${fmt(len / 4)} ${fmt(-1.6)} ${fmt(len / 2)} 0q${fmt(len / 4)} ${fmt(1.6)} ${fmt(len / 2)} 0`
/** Hatch lines as segments (same geometry as helpers.hatchD) so they can be broken into pen strokes. */
function hatchSegments(polygon, angleDeg, spacing, inset = 0) {
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  const proj = polygon.map(([x, y]) => x * nx + y * ny)
  const tmin = Math.min(...proj), tmax = Math.max(...proj), out = []
  for (let t = tmin + spacing / 2; t < tmax; t += spacing) {
    const hits = []
    for (let i = 0; i < polygon.length; i++) {
      const [x1, y1] = polygon[i], [x2, y2] = polygon[(i + 1) % polygon.length]
      const p1 = x1 * nx + y1 * ny, p2 = x2 * nx + y2 * ny
      if (p1 === p2 || (p1 < t) === (p2 < t)) continue
      const f = (t - p1) / (p2 - p1)
      hits.push((x1 + (x2 - x1) * f) * dx + (y1 + (y2 - y1) * f) * dy)
    }
    hits.sort((p, q) => p - q)
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const s0 = hits[i] + inset, s1 = hits[i + 1] - inset
      if (s1 - s0 < 1) continue
      out.push([nx * t + dx * s0, ny * t + dy * s0, nx * t + dx * s1, ny * t + dy * s1])
    }
  }
  return out
}
/** Pen-drawn hatch: every hatch line is broken into 4-9 px strokes, some dropped, each with a little angle jitter. */
function brokenHatchD(polygon, angleDeg, spacing, random, { inset = 2, drop = .4, jitterDeg = 8 } = {}) {
  let d = ''
  for (const [x0, y0, x1, y1] of hatchSegments(polygon, angleDeg, spacing, inset)) {
    const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len
    for (let s = between(random, 0, 3); s < len - 3;) {
      const piece = Math.min(between(random, 4, 9), len - s)
      if (random() >= drop) {
        const a = (random() - .5) * 2 * jitterDeg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a)
        const px = x0 + ux * s, py = y0 + uy * s
        d += lineD(px, py, px + (ux * c - uy * sn) * piece, py + (ux * sn + uy * c) * piece)
      }
      s += piece + between(random, 2, 5)
    }
  }
  return d
}

// ---------- sky ----------
function buildSky(random, farRidge, nearRidge) {
  const xs = [...new Set([...farRidge, ...nearRidge].map(p => p[0]))].sort((a, b) => a - b)
  const envelope = xs.map(x => [x, Math.min(yOnPolyline(farRidge, x), yOnPolyline(nearRidge, x))])
  const silhouette = path(polyD([[F.x0, F.y0], [F.x1, F.y0], ...envelope.reverse()]))
  const heavy = lineD(F.x0, F.y0, F.x1, F.y0) + lineD(F.x0, F.y0, F.x0, yOnPolyline(farRidge, F.x0)) + lineD(F.x1, F.y0, F.x1, yOnPolyline(farRidge, F.x1))
  let medium = '', fine = ''
  // all clouds sit in open sky, well above the far ridge (minimum y 172 at x 400, 220 at x 850)
  const clouds = [[560, 150, 190, 54, 5], [765, 112, 230, 62, 6], [872, 168, 118, 36, 4], [420, 108, 130, 38, 4]]
  for (const [cx, cy, w, h, bumps] of clouds) {
    medium += cloudD(cx, cy, w, h, random, { bumps })
    const base = cy + h / 2
    for (let k = 0; k < 3; k++) { const len = between(random, 18, 34), x = between(random, cx - w * .32, cx + w * .3 - len), y = base - 5 - k * 6; fine += rippleD(x, y, len) }
    fine += rippleD(cx - w * .05, base - 24, 22)
  }
  // a flock in the empty upper-left sky plus a small distant pair; every bird stays >= 12 px above the ridges
  for (const [bx, by, s] of [[378, 152, 13], [404, 140, 14], [432, 158, 11], [456, 146, 9], [522, 98, 8], [541, 104, 7]]) {
    const ridge = Math.min(yOnPolyline(farRidge, bx - s), yOnPolyline(farRidge, bx + s), yOnPolyline(nearRidge, bx))
    const y = Math.min(by, ridge - 14)
    fine += `M${fmt(bx - s)} ${fmt(y)}q${fmt(s * .5)} ${fmt(-s * .55)} ${fmt(s)} 0q${fmt(s * .5)} ${fmt(-s * .55)} ${fmt(s)} 0`
  }
  return { id: 'sky', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- mountains ----------
function buildRange(id, ridge, random, { spacing = 7, angle = 68, extra = '', avoid = [] } = {}) {
  const silhouette = path(polyD([...ridge, [F.x1, HORIZON + 2], [F.x0, HORIZON + 2]]))
  let medium = '', fine = extra
  for (let i = 1; i < ridge.length - 1; i++) {
    const p = ridge[i]
    if (!(p[1] < ridge[i - 1][1] && p[1] < ridge[i + 1][1])) continue   // local peak
    let j = i + 1
    while (j < ridge.length - 1 && ridge[j + 1][1] > ridge[j][1]) j++
    const foot = ridge[j]
    if (foot[0] - p[0] < 24 || foot[1] - p[1] < 14) continue
    const slopeEnd = mix(p, foot, .78), inner = [p[0] + (foot[0] - p[0]) * .12, p[1] + (slopeEnd[1] - p[1]) * 1.05]
    fine += hatchD([p, slopeEnd, [slopeEnd[0] - (foot[0] - p[0]) * .25, slopeEnd[1] + 4], inner], angle, spacing, { inset: 2 })
    medium += wobbleD(p, [p[0] + (foot[0] - p[0]) * .3, p[1] + (foot[1] - p[1]) * .55], random, 1.2, 3)
    if (random() < .7) medium += wobbleD([p[0] - 2, p[1] + 3], [p[0] - (p[0] - ridge[i - 1][0]) * .35, p[1] + (foot[1] - p[1]) * .4], random, 1.2, 3)
  }
  for (let i = 2; i < ridge.length - 2; i += 2) {
    const p = ridge[i], down = ridge[i + 1][1] > ridge[i - 1][1] ? 1 : -1
    const len = between(random, 14, 30), a = (down > 0 ? 55 : 125) * Math.PI / 180 + (random() - .5) * .4
    const start = [p[0] + (random() - .5) * 8, p[1] + between(random, 6, 18)]
    if (start[1] + Math.sin(a) * len > HORIZON - 8) continue
    if (avoid.some(([x0, y0, x1, y1]) => start[0] >= x0 && start[0] <= x1 && start[1] >= y0 && start[1] <= y1)) continue
    fine += wobbleD(start, [start[0] + Math.cos(a) * len, start[1] + Math.sin(a) * len], random, 1.2, 3)
    if (random() < .5) fine += wobbleD([start[0] + 6, start[1] + 10], [start[0] + 6 + Math.cos(a) * len * .6, start[1] + 10 + Math.sin(a) * len * .6], random, 1, 2)
  }
  return { id, silhouette, lines: { medium: path(medium), fine: path(fine) } }
}

/** Far-shore firs: 8-10 clumps separated by gaps of bare shoreline, each tree a single ragged sawtooth. */
function buildTreeline(random) {
  const back = { silhouette: '', fine: '' }, front = { silhouette: '', fine: '' }
  let x = F.x0 + 3
  while (x < F.x1 - 14) {
    const count = Math.round(between(random, 4, 10))
    for (let i = 0; i < count; i++) {
      const near = x > 560 && x < 770                      // the clump nearest the dock is taller and darker
      const w = between(random, 10, 18) * (near ? 1.15 : 1)
      let h = between(random, 8, 24) * (near ? 1.3 : 1)
      if (random() < .14) h += between(random, 6, 12)        // occasional spire
      h = Math.min(h, 36)
      if (x + w > F.x1 - 2) break
      const apex = [x + w / 2 + (random() - .5) * 2, HORIZON - h]
      const steps = Math.max(2, Math.min(6, Math.round(h / 5.5)))
      const L = [], R = []
      for (let k = 1; k <= steps; k++) {
        const f = k / steps, hw = w / 2 * (.3 + .7 * f) * (1 + (random() - .5) * .16), y = HORIZON - h + h * f, dy = h / steps
        const tipY = y - dy * between(random, .12, .32), notchY = k === steps ? HORIZON : y + dy * .04
        L.push([apex[0] - hw, tipY], [apex[0] - hw * between(random, .6, .78), notchY])
        R.push([apex[0] + hw * (1 + (random() - .5) * .1), tipY + (random() - .5) * 1.5], [apex[0] + hw * between(random, .6, .78), notchY])
      }
      const overlapNext = random() < .3, target = overlapNext ? back : front   // the overlapped tree goes behind
      target.silhouette += polyD([apex, ...L, ...[...R].reverse()])
      target.fine += polyD([...[...L].reverse(), apex, ...R], false)
      if (near && h > 14) for (let s = 0; s < 1 + (random() < .6 ? 1 : 0); s++) { const ox = (random() - .5) * w * .4; target.fine += lineD(apex[0] + ox, HORIZON - h * between(random, .35, .6), apex[0] + ox + .5, HORIZON - 1.5) }
      x += w * (overlapNext ? between(random, .55, .75) : between(random, .95, 1.08))
    }
    x += between(random, 10, 25)                           // bare shoreline between clumps
  }
  return [
    { id: 'treelineBack', silhouette: path(back.silhouette), outline: false, lines: { fine: path(back.fine) } },
    { id: 'treeline', silhouette: path(front.silhouette), outline: false, lines: { fine: path(front.fine) } },
  ]
}

// ---------- water ----------
const REEDS = { x0: 60, x1: 182, y: 428 }                  // clear-water box around the reed clump
function buildWater(random, shoreTop, reflections) {
  const silhouette = path(polyD([[F.x0, HORIZON], [F.x1, HORIZON], ...[...shoreTop].reverse()]))
  // the water layer has no outline: the far shore is a fine broken wobble and the bank line belongs to the shore layer
  let heavy = lineD(F.x0, HORIZON, F.x0, shoreTop[0][1]) + lineD(F.x1, HORIZON, F.x1, shoreTop[shoreTop.length - 1][1])
  let medium = '', fine = ''
  for (let x = F.x0; x < F.x1 - 8;) { const len = Math.min(F.x1 - x, between(random, 90, 180)); fine += wobbleD([x, HORIZON + 1.5], [x + len, HORIZON + 1.5], random, 1, Math.max(2, Math.round(len / 28))); x += len + between(random, 4, 9) }
  const inReeds = (x0, x1, y) => y > REEDS.y && x1 > REEDS.x0 && x0 < REEDS.x1
  for (let i = 0; i < 44; i++) { const x = between(random, 60, 940); fine += lineD(x, HORIZON + 3, x + (random() - .5) * 2, HORIZON + between(random, 5, 10)) }
  for (let i = 0; i < 24; i++) fine += rippleD(between(random, 60, 900), between(random, 368, 400), between(random, 14, 30))
  let y = 376
  while (y < 605) {
    const t = (y - 376) / 224
    const count = Math.round(between(random, 4, 7) + t * 4)
    for (let k = 0; k < count; k++) {
      const len = between(random, 16, 36) + t * between(random, 20, 60), x = between(random, 58, 942 - len), yy = y + (random() - .5) * 6
      if (yy > yOnPolyline(shoreTop, x) - 6 || yy > yOnPolyline(shoreTop, x + len) - 6) continue
      if (inReeds(x, x + len, yy)) continue
      if (t > .45 && random() < .35) medium += rippleD(x, yy, len); else fine += rippleD(x, yy, len)
    }
    y += 14 - t * 6
  }
  for (const [x, top, len, w] of reflections) { const d = zigzagD(x, top, len, random, w > 1 ? 3 : 2.2, 7); if (w > 1) medium += d; else fine += d }
  // the big tree mirrored: broken vertical zigzags under the canopy mass, shorter ones under the right limb
  for (let i = 0; i < 8; i++) { const x = 236 + i * 12.5 + between(random, -3, 3), top = between(random, 368, 380), len = between(random, 30, 75); const d = zigzagD(x, top, len, random, 2.4, 7); if (i % 3 === 1) medium += d; else fine += d }
  for (const x of [306, 322, 338]) fine += zigzagD(x + between(random, -2, 2), between(random, 368, 376), between(random, 14, 26), random, 1.8, 6)
  for (let i = 0; i < 14; i++) { const x = between(random, 100, 330), yy = between(random, 372, 460), len = between(random, 14, 34); if (!inReeds(x, x + len, yy)) fine += rippleD(x, yy, len) }
  return { id: 'water', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- dock ----------
const toward = (p, vp, t) => mix(p, vp, t)   // walk from p toward a vanishing point
function buildDock(random, bankAt) {
  const D = [826, 608], C = [930, 598]                         // near cap: front and back corners, 8-13 px above the bank
  const tFar = .56
  const B = toward(D, VP, tFar)                                // far front corner
  // far back corner: on the line C->VP at the depth where a cross line from B (toward VP2) meets it
  const dir = [VP2[0] - B[0], VP2[1] - B[1]]
  let A = B
  { const cx = C[0] - VP[0], cy = C[1] - VP[1], dx = dir[0], dy = dir[1]
    const den = dx * cy - dy * cx, s = ((C[0] - B[0]) * cy - (C[1] - B[1]) * cx) / den
    A = [B[0] + dx * s, B[1] + dy * s] }
  const thick = t => 13 - 9 * t, gapWater = t => 22 - 14 * t
  const B2 = [B[0], B[1] + thick(tFar)], D2 = [D[0], D[1] + thick(0)], C2 = [C[0], C[1] + thick(0)]
  const silhouette = path(polyD([A, C, C2, D2, B2, B]))
  let heavy = lineD(...B, ...D) + lineD(...D, ...C), medium = lineD(...D, ...D2), fine = ''
  // long beam lines inset along both edges and a seam on the front face
  const inset = 5
  medium += wobbleD(toward(mix(D, C, inset / 104), VP, .02), toward(mix(D, C, inset / 104), VP, tFar - .01), random, .8, 4)
  medium += wobbleD(toward(mix(C, D, inset / 104), VP, .02), toward(mix(C, D, inset / 104), VP, tFar - .01), random, .8, 4)
  medium += lineD(B2[0], B2[1] - thick(tFar) * .45, D2[0], D2[1] - thick(0) * .45) + lineD(D2[0], D2[1] - thick(0) * .45, C2[0], C2[1] - thick(0) * .45)
  // cross planks at equal 3D spacing (perspective interpolation along the front edge)
  const uNear = 1 / (D[0] - VP[0]), uFar = 1 / (B[0] - VP[0]), n = 18, planks = []
  for (let k = 1; k < n; k++) {
    const x = VP[0] + 1 / (uNear + (uFar - uNear) * k / n) + (random() - .5) * 1.5
    const t = (D[0] - x) / (D[0] - B[0]) * tFar                 // fraction of the way to the vanishing point
    const f = toward(D, VP, t), b = toward(C, VP, t)
    planks.push([t, f, b])
    medium += wobbleD(f, b, random, .6, 2)
    fine += lineD(f[0], f[1], f[0], f[1] + thick(t) * .45)      // plank end on the front face
  }
  for (let k = 0; k < planks.length - 1 && k < 9; k++) {   // wood grain on the nearer planks
    const [, f0, b0] = planks[k], [, f1, b1] = planks[k + 1]
    for (let g = 0; g < 2 + (k < 4 ? 1 : 0); g++) {
      const u = between(random, .18, .82), v = between(random, .2, .8), a = mix(f0, f1, u), b = mix(b0, b1, v)
      fine += wobbleD(mix(a, b, between(random, .05, .25)), mix(a, b, between(random, .7, .95)), random, 1, 3)
    }
    if (random() < .5) { const c = mix(mix(f0, f1, .5), mix(b0, b1, .5), between(random, .3, .7)); fine += ellipseD(c[0], c[1], 2.4, 1.6) }
  }
  fine += lineD(B2[0], B2[1] - thick(tFar) * .45, B2[0] + 1, B2[1])
  medium += wobbleD([B2[0] + 2, B2[1] + gapWater(tFar) * .5], [D2[0] - 2, D2[1] + gapWater(0) * .5], random, .7, 3)   // stringer beam under the deck
  fine += lineD(B2[0] + 2, B2[1] + gapWater(tFar) * .5 + 3, D2[0] - 2, D2[1] + gapWater(0) * .5 + 4)
  // a small cleat block on the deck edge between the two far posts
  { const c = toward(D, VP, tFar * .84), q = [[c[0] - 4.5, c[1] - 1.6], [c[0] + 4.5, c[1] - 2.4], [c[0] + 5, c[1] + 1.2], [c[0] - 4, c[1] + 1.8]]
    medium += polyD(q); fine += lineD(c[0] - 1, c[1] + 1.8, c[0] - 1, c[1] + 4.2) }
  // posts: chamfered square timbers with a cap line, vertical grain and a crack or two (no rungs)
  const posts = [], deckPosts = [], postShapes = [], postPolys = []
  let pHeavy = '', pMedium = '', pFine = ''
  for (const t of [.04, .36, .68, .97].map(k => k * tFar)) {
    const w = 13 - 8 * t, up = 46 - 34 * t
    for (const [edge, front] of [[toward(C, VP, t), false], [toward(D, VP, t), true]]) {
      const waterFoot = edge[1] + thick(t) + gapWater(t), inWater = waterFoot < bankAt(edge[0])
      const top = edge[1] - up, bottom = front ? (inWater ? waterFoot : bankAt(edge[0]) + 2) : edge[1] + 2
      const x0 = edge[0] - w / 2, x1 = edge[0] + w / 2, ch = Math.min(2.4, w * .22)
      postShapes.push([[x0, top], [x1, top], [x1, bottom], [x0, bottom]])
      postPolys.push([[x0 + ch, top], [x1 - ch, top + .5], [x1, top + ch + .6], [x1, bottom], [x0, bottom], [x0, top + ch]])
      pMedium += lineD(x0 - .4, top + 5, x1 + .4, top + 5.5)                                      // cap line
      pMedium += wobbleD([x0 + w * .38, top + 7], [x0 + w * .38 + between(random, -.8, .8), bottom - 1.5], random, .6, 5)   // corner edge
      if (w >= 9) pFine += wobbleD([x0 + w * .72, top + 8], [x0 + w * .72 + between(random, -.8, .8), bottom - 2], random, .6, 5)
      for (let k = 0, cracks = 1 + (random() < .5 ? 1 : 0); k < cracks; k++) {
        const y = between(random, top + 12, bottom - 10), x = x0 + w * between(random, .15, .45)
        pFine += wobbleD([x, y], [x + w * between(random, .3, .45), y + between(random, 4, 9)], random, .5, 2)
      }
      if (front) {
        posts.push({ x: edge[0], water: bottom, w, t, faceBottom: edge[1] + thick(t) })
        if (inWater) pFine += rippleD(x0 - 7, bottom + 1, w + 14) + rippleD(x0 - 10, bottom + 5, w * .8)
      } else deckPosts.push({ x: edge[0], foot: bottom, w })
    }
  }
  // mooring ring on the far front post, just under the deck face where the rope can hang over open water
  const ring = posts[3], ringY = ring.faceBottom + 6
  pHeavy += ellipseD(ring.x, ringY, ring.w * .55, 2.3)
  const dock = { id: 'dock', silhouette, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
  const dockPosts = { id: 'dockPosts', silhouette: path(postPolys.map(q => polyD(q)).join('')), lines: { heavy: path(pHeavy), medium: path(pMedium), fine: path(pFine) } }
  return { dock, dockPosts, posts, deckPosts, postShapes, slab: [A, C, C2, D2, B2, B], ringAt: [ring.x - ring.w * .55, ringY] }
}

// ---------- boat ----------
function buildBoat(random, ringAt) {
  const P0 = [518, 519], P1 = [682, 574]                      // alongside the far half of the dock, over open water
  const len = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), u = [(P1[0] - P0[0]) / len, (P1[1] - P0[1]) / len], nrm = [-u[1], u[0]]
  const c = t => mix(P0, P1, t)
  const widthTable = [[0, 0], [.1, 11], [.25, 19], [.45, 23], [.65, 23], [.82, 19], [.95, 13], [1, 11]]
  const w = t => { for (let i = 1; i < widthTable.length; i++) if (t <= widthTable[i][0]) { const [t0, w0] = widthTable[i - 1], [t1, w1] = widthTable[i]; return w0 + (w1 - w0) * (t - t0) / (t1 - t0) } return 10 }
  const far = (t, k = 1) => add(c(t), nrm, -w(t) * .78 * k), near = (t, k = 1) => add(c(t), nrm, w(t) * k)
  const depth = t => Math.max(24 * Math.pow(Math.sin(Math.PI * t), .55), 17 * Math.pow(t, 4))
  const bottom = t => add(near(t), [0, depth(t)])
  const ts = [.06, .12, .2, .3, .42, .55, .68, .8, .9, .96, 1]
  const farPts = [P0, ...ts.map(t => far(t))], nearPts = [P0, ...ts.map(t => near(t))], bottomPts = [P0, ...ts.map(t => bottom(t))]
  const transom = [far(1), add(far(1), [0, depth(1) * .85]), bottom(1), near(1)]
  const silhouette = path(joinClosed([curveD(farPts, { tension: .8 }), polyD([transom[0], transom[1], transom[2]], false), curveD([...bottomPts].reverse(), { tension: .8 })]))
  let heavy = curveD(nearPts, { tension: .8 }), medium = '', fine = ''
  heavy += curveD([P0, ...ts.slice(0, -1).map(t => far(t))], { tension: .8 })
  // inner gunwale (one closed lens inset 4px)
  const innerTs = [.1, .2, .3, .42, .55, .68, .8, .9, .97]
  medium = curveD([add(c(.05), nrm, -1), ...innerTs.map(t => add(c(t), nrm, -(w(t) * .78 - 4))), add(c(.99), nrm, -(w(1) * .78 - 4)), add(c(.99), nrm, w(1) - 4), ...innerTs.map(t => add(c(t), nrm, w(t) - 4)).reverse()], { close: true, tension: .8 })
  medium += polyD([transom[0], transom[3]], false) + polyD([transom[3], transom[2]], false)
  // keel, ribs and thwarts
  medium += curveD([.1, .3, .5, .7, .9].map(t => add(c(t), nrm, 1.5)), { tension: .9 })
  for (const t of [.18, .26, .42, .5, .58, .74, .84]) medium += curveD([add(c(t), nrm, -(w(t) * .78 - 4)), add(c(t), u, 3), add(c(t), nrm, w(t) - 4)], { tension: 1 })
  for (const t of [.33, .65]) {
    const a = add(c(t), nrm, -(w(t) * .78 - 3)), b = add(c(t), nrm, w(t) - 3)
    medium += polyD([add(a, u, -4), add(a, u, 4), add(b, u, 4), add(b, u, -4)])
    fine += lineD(...add(b, u, 4), ...add(add(b, u, 4), [0, 3])) + lineD(...add(b, u, -4), ...add(add(b, u, -4), [0, 3]))
  }
  // hull side: lapstrake lines and hatching toward the bottom
  for (const k of [.36, .68]) fine += curveD(ts.slice(1).map(t => add(near(t), [0, depth(t) * k])), { tension: .8 })
  const band = [...ts.slice(1, -1).map(t => add(near(t), [0, depth(t) * .68])), ...ts.slice(1, -1).map(t => bottom(t)).reverse()]
  fine += hatchD(band, 28, 6, { inset: 1.5 })
  fine += hatchD([transom[0], transom[1], transom[2], transom[3]], 20, 6, { inset: 2 })
  // water around the hull
  for (const t of [.2, .4, .6, .8]) { const b = bottom(t); fine += zigzagD(b[0] + between(random, -4, 4), b[1] + 3, between(random, 9, 14), random, 1.8, 5) }
  for (const t of [.25, .55, .85]) { const b = bottom(t); medium += rippleD(b[0] - 14, b[1] + 2.5, 28) }
  // mooring rope: from the stem out over the water to the ring on the far post, with a slight sag
  const bow = add(P0, u, -2)
  const ctrl = [(bow[0] + ringAt[0]) / 2 + 8, (bow[1] + ringAt[1]) / 2 + 4]
  medium += `M${pt(bow)}Q${pt(ctrl)} ${pt(ringAt)}`
  for (let s = .12; s < .95; s += .16) {
    const q = [(1 - s) ** 2 * bow[0] + 2 * (1 - s) * s * ctrl[0] + s * s * ringAt[0], (1 - s) ** 2 * bow[1] + 2 * (1 - s) * s * ctrl[1] + s * s * ringAt[1]]
    const tx = 2 * (1 - s) * (ctrl[0] - bow[0]) + 2 * s * (ringAt[0] - ctrl[0]), ty = 2 * (1 - s) * (ctrl[1] - bow[1]) + 2 * s * (ringAt[1] - ctrl[1]), tl = Math.hypot(tx, ty)
    const ax = (-ty * .85 + tx * .5) / tl * 2.2, ay = (tx * .85 + ty * .5) / tl * 2.2   // twisted-strand ticks
    fine += lineD(q[0] - ax, q[1] - ay, q[0] + ax, q[1] + ay)
  }
  const boat = { id: 'boat', silhouette, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
  // oars as a separate layer so they lie on top of ribs and the gunwale
  const oarD = (a, b, bladeLen, bladeW) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ou = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], on = [-ou[1], ou[0]]
    const shaftEnd = add(b, ou, -bladeLen)
    const shaft = polyD([add(a, on, 2.4), add(shaftEnd, on, 2.4), add(shaftEnd, on, -2.4), add(a, on, -2.4)])
    const blade = curveD([add(shaftEnd, on, 2.4), add(mix(shaftEnd, b, .4), on, bladeW / 2), add(mix(shaftEnd, b, .85), on, bladeW * .4), b, add(mix(shaftEnd, b, .85), on, -bladeW * .4), add(mix(shaftEnd, b, .4), on, -bladeW / 2), add(shaftEnd, on, -2.4)], { close: true, tension: .8 })
    const vein = lineD(...add(shaftEnd, ou, 2), ...add(b, ou, -4))
    return { shape: shaft + blade, vein, shaftEnd }
  }
  const o1 = oarD(add(c(.1), nrm, -4), add(c(.93), nrm, -3), 26, 10)
  const lock = near(.5), tip = add(lock, [-50, 22])
  const o2 = oarD(add(lock, [41, -18]), tip, 26, 10)
  const oarsShape = o1.shape + o2.shape
  let oFine = o1.vein + o2.vein + ellipseD(lock[0], lock[1] + 1, 3.5, 2)
  oFine += rippleD(tip[0] - 16, tip[1] + 5, 32) + rippleD(tip[0] - 8, tip[1] + 10, 20)
  const oars = { id: 'oars', silhouette: path(oarsShape), outline: false, lines: { medium: path(oarsShape), fine: path(oFine) } }
  const footprint = ts.slice(1, -1).map(t => bottom(t))
  const hullSide = [...ts.slice(1).map(t => near(t)), ...ts.slice(1).map(t => bottom(t)).reverse()]
  return { boat, oars, footprint, hullSide, P0, P1 }
}

// ---------- shore ----------
const SHORE_SEED = [[55, 598], [150, 591], [250, 601], [340, 606], [430, 597], [520, 605], [600, 613], [700, 619], [800, 616], [880, 615], [945, 611]]
function buildShore(random, shoreTop, rocks) {
  const heads = []
  let medium = '', fine = ''
  // wet-sand line 9 px below the bank edge, drawn in pieces, and a few dashes lower down
  for (let i = 0; i + 1 < shoreTop.length; i += 2) if (random() < .78) fine += wobbleD([shoreTop[i][0] + 2, shoreTop[i][1] + 9], [shoreTop[i + 1][0] - 2, shoreTop[i + 1][1] + 9], random, .7, 2)
  for (let i = 1; i < shoreTop.length; i += 3) { const a = shoreTop[i - 1], b = shoreTop[i]; if (random() < .7) fine += `M${fmt(a[0] + 5)} ${fmt(a[1] + 15)}L${fmt(mix(a, b, .6)[0])} ${fmt(mix(a, b, .6)[1] + 15)}` }
  // pebbles, bigger toward the bottom of the frame, kept off the rocks, the trunk base and each other
  const blocked = [...rocks.map(r => [r.cx, r.cy, r.w * .55, r.h * .6]), [208, 652, 48, 16]]
  const pebbles = []
  let tries = 0
  while (pebbles.length < 64 && tries++ < 1600) {
    const x = between(random, 62, 938), top = yOnPolyline(shoreTop, x), y = between(random, top + 9, F.y1 - 7)
    const s = (5.5 + 8 * (y - top) / (F.y1 - top)) * between(random, .75, 1.25)
    if (blocked.some(([bx, by, rx, ry]) => ((x - bx) / (rx + s)) ** 2 + ((y - by) / (ry + s)) ** 2 < 1)) continue
    if (x + s > F.x1 - 3 || y + s * .7 > F.y1 - 3) continue
    if (pebbles.some(p => Math.hypot(p.x - x, p.y - y) < p.s + s + 2)) continue
    const ry = s * between(random, .45, .7), buried = random() < .2
    pebbles.push({ x, y, s, ry })
    let d
    if (buried) {   // only the upper two thirds shows above the sand
      const pts = Array.from({ length: 9 }, (_, k) => { const a = (165 + 210 * k / 8) * Math.PI / 180, kk = 1 + (random() - .5) * .2; return [x + Math.cos(a) * s * kk, y + Math.sin(a) * ry * kk] })
      d = curveD(pts, { tension: .9 })
    } else d = curveD(ellipsePts(x, y, s, ry, 7, random, .22), { close: true, tension: .9 })
    if (s > 9.5) medium += d; else fine += d
    if (!buried && s > 7) fine += `M${fmt(x - s * .1)} ${fmt(y + ry + 1.6)}q${fmt(s * .35)} ${fmt(1.4)} ${fmt(s * .7)} ${fmt(-.4)}`   // ground contact under the lower right
    if (!buried && s > 8 && random() < .4) fine += `M${fmt(x - s * .4)} ${fmt(y + ry * .35)}q${fmt(s * .4)} ${fmt(ry * .3)} ${fmt(s * .8)} 0`
  }
  // grass tufts along the bank
  for (const [x, dy] of [[300, 12], [372, 9], [470, 14], [612, 11], [690, 15], [760, 9], [838, 13], [905, 10], [255, 30], [655, 52]]) fine += grassD(x, yOnPolyline(shoreTop, x) + dy, 7, random, { height: 17, spread: 18 })
  // reeds and cattails at the left: eight stalks all leaning the same way, one blade each hugging its stalk
  for (let i = 0; i < 8; i++) {
    const x = 70 + i * 10.5 + between(random, -2.5, 2.5), base = yOnPolyline(shoreTop, x) + between(random, 2, 12), h = between(random, 95, 150), lean = between(random, 2, 12)
    const top = [x + lean, base - h]
    medium += `M${fmt(x)} ${fmt(base)}Q${fmt(x + lean * .3)} ${fmt(base - h * .55)} ${pt(top)}`
    if (i % 3 !== 1) { const ang = Math.atan2(lean, -h) * 180 / Math.PI; heads.push(ellipse(top[0], top[1] - 9, 3.6, 11, ang)); fine += lineD(top[0], top[1] - 20, top[0] + lean * .05, top[1] - 26) }
    const bl = between(random, 55, 110), side = random() < .7 ? 1 : -1, peel = between(random, 8, 18), k = bl / h
    fine += `M${fmt(x + side * 1.5)} ${fmt(base - 2)}Q${fmt(x + lean * k * .3 + side * 3)} ${fmt(base - bl * .6)} ${fmt(x + lean * k + side * peel)} ${fmt(base - bl)}`
  }
  for (const [bx, bh, dir] of [[82, 72, 1], [131, 90, 1]]) {   // two bent blades for character
    const base = yOnPolyline(shoreTop, bx) + 6, kink = [bx + 4, base - bh]
    fine += `M${fmt(bx)} ${fmt(base)}Q${fmt(bx + 2)} ${fmt(base - bh * .55)} ${pt(kink)}q${fmt(8 * dir)} ${fmt(1)} ${fmt(15 * dir)} ${fmt(11)}`
  }
  const silhouette = path(polyD([...shoreTop, [F.x1, F.y1], [F.x0, F.y1]])) + heads.join('')
  return { id: 'shore', silhouette, lines: { medium: path(medium), fine: path(fine) } }
}

function buildRocks(random) {
  const specs = [{ cx: 420, cy: 646, w: 118, h: 58 }, { cx: 540, cy: 672, w: 78, h: 42 }, { cx: 332, cy: 612, w: 66, h: 34 }, { cx: 800, cy: 668, w: 56, h: 30 }]
  let silhouette = '', medium = '', fine = ''
  const rocks = []
  for (const r of specs) {
    const n = 9, pts = []
    for (let i = 0; i < n; i++) {
      const a = Math.PI + i / (n - 1) * Math.PI            // top arc from left to right
      const k = 1 + (random() - .5) * .22
      pts.push([r.cx + Math.cos(a) * r.w / 2 * k, r.cy - Math.abs(Math.sin(a)) * r.h * k])
    }
    const base = [[r.cx + r.w * .46, r.cy + 2], [r.cx + r.w * .15, r.cy + 4], [r.cx - r.w * .2, r.cy + 4], [r.cx - r.w * .47, r.cy + 1]]
    const outline = [...pts, ...base]
    silhouette += curveD(outline, { close: true, tension: .55 })
    // crack lines and a facet ridge
    medium += wobbleD([r.cx - r.w * .32, r.cy - r.h * .62], [r.cx + r.w * .1, r.cy - r.h * .3], random, 1.5, 3)
    medium += wobbleD([r.cx + r.w * .1, r.cy - r.h * .3], [r.cx + r.w * .42, r.cy - r.h * .05], random, 1.5, 3)
    medium += wobbleD([r.cx + r.w * .1, r.cy - r.h * .3], [r.cx + r.w * .02, r.cy + 1], random, 1.5, 3)
    if (r.w > 70) medium += wobbleD([r.cx - r.w * .42, r.cy - r.h * .1], [r.cx - r.w * .2, r.cy - r.h * .45], random, 1.2, 3)
    const shade = [[r.cx + r.w * .1, r.cy - r.h * .3], [r.cx + r.w * .42, r.cy - r.h * .08], [r.cx + r.w * .46, r.cy + 1], [r.cx + r.w * .02, r.cy + 2]]
    fine += hatchD(shade, 38, 6, { inset: 1.5 })
    const lower = [[r.cx - r.w * .45, r.cy - r.h * .12], [r.cx + r.w * .02, r.cy - r.h * .2], [r.cx + r.w * .02, r.cy + 2], [r.cx - r.w * .46, r.cy]]
    fine += hatchD(lower, 150, 7.5, { inset: 2 })
    fine += `M${fmt(r.cx - r.w * .5)} ${fmt(r.cy + 3)}q${fmt(r.w * .25)} ${fmt(3)} ${fmt(r.w * .55)} ${fmt(2)}`
    rocks.push({ ...r, footprint: [[r.cx - r.w * .47, r.cy], [r.cx - r.w * .2, r.cy + 4], [r.cx + r.w * .15, r.cy + 4], [r.cx + r.w * .46, r.cy + 1], [r.cx + r.w * .3, r.cy - r.h * .3], [r.cx - r.w * .3, r.cy - r.h * .3]], outline })
  }
  return { layer: { id: 'rocks', silhouette: path(silhouette), lines: { medium: path(medium), fine: path(fine) } }, rocks }
}

// ---------- tree ----------
const TRUNK = [
  [168, 653], [176, 646], [183, 634], [182, 618], [187, 598], [184, 572], [186, 544], [183, 516], [185, 488], [183, 460], [185, 434], [186, 412],
  [176, 396], [164, 378], [152, 358], [140, 338], [130, 318], [122, 300], [118, 290], [126, 288], [134, 304], [144, 322], [156, 342], [168, 362], [180, 380], [190, 396],
  [194, 376], [198, 350], [203, 320], [208, 290], [213, 260], [217, 232], [220, 214], [228, 216], [226, 240], [223, 268], [220, 298], [218, 326], [217, 354], [216, 378], [216, 394],
  [228, 384], [246, 366], [264, 346], [284, 324], [302, 302], [316, 282], [326, 268], [334, 276], [322, 294], [306, 314], [288, 336], [268, 358], [250, 378], [234, 398], [222, 414],
  [219, 438], [217, 464], [219, 492], [218, 520], [221, 548], [219, 578], [222, 606], [226, 628], [234, 642], [246, 650], [254, 653],
]
function buildTrunk(random) {
  const pts = TRUNK.map(([x, y], i) => (i === 0 || i === TRUNK.length - 1) ? [x, y] : [x + (random() - .5) * 1.6, y + (random() - .5) * 1.6])
  const silhouette = path(curveD(pts, { close: true, tension: .55 }))
  let medium = '', fine = ''
  // bark fissures broken into two or three segments with gaps
  for (const [x0, y0, x1, y1] of [[194, 640, 191, 440], [208, 646, 205, 444], [216, 598, 213, 468]]) {
    const segs = 2 + (random() < .5 ? 1 : 0)
    let s = between(random, 0, .05)
    for (let k = 0; k < segs; k++) {
      const e = (k + 1) / segs - (k < segs - 1 ? between(random, .05, .1) : 0)
      medium += wobbleD(mix([x0, y0], [x1, y1], s), mix([x0, y0], [x1, y1], e), random, 2, 4)
      s = e + between(random, .03, .07)
    }
  }
  // scattered short bark ticks, mostly on the right (shaded) side, curving with the cylinder
  for (let y = 428; y < 640; y += between(random, 5, 11)) {
    const l = 184 + (y > 600 ? (y - 600) * .18 : 0), r = 219 + (y > 600 ? (y - 600) * .3 : 0)
    const len = between(random, 4, 10), x0 = Math.min(Math.max(l + (r - l) * between(random, .4, 1) - len, l + 1), r - len - 1)
    fine += `M${fmt(x0)} ${fmt(y)}q${fmt(len / 2)} ${fmt(between(random, 2, 4))} ${fmt(len)} ${fmt(between(random, -.5, 1))}`
    if (random() < .25) { const a = l + between(random, 1.5, 3), b = a + between(random, 4, 7); fine += `M${fmt(a)} ${fmt(y + 3)}q${fmt((b - a) / 2)} ${fmt(-1.5)} ${fmt(b - a)} ${fmt(0)}` }
  }
  // ticks along the limbs at irregular spacing
  for (const [a, b, side] of [[[190, 396], [126, 290], 1], [[216, 394], [226, 218], 1], [[222, 414], [334, 276], -1]]) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], n = [-u[1] * side, u[0] * side]
    for (let s = 10; s < l - 8; s += between(random, 7, 14)) { const p = add(a, u, s), k = between(random, 2.5, 5); const q = add(p, n, k), r = add(p, n, -k * .5); fine += lineD(q[0], q[1], r[0] + u[0] * 2, r[1] + u[1] * 2) }
  }
  // knots with V-shaped bark marks flowing around them, and roots
  for (const [kx, ky] of [[203, 562], [213, 484]]) {
    medium += ellipseD(kx, ky, 4.5, 6.5); fine += `M${fmt(kx - 2)} ${fmt(ky - 3)}q${fmt(3)} ${fmt(2)} ${fmt(1)} ${fmt(6)}`
    fine += `M${fmt(kx - 7)} ${fmt(ky - 14)}L${fmt(kx)} ${fmt(ky - 9)}L${fmt(kx + 6)} ${fmt(ky - 14)}M${fmt(kx - 7)} ${fmt(ky + 14)}L${fmt(kx)} ${fmt(ky + 9)}L${fmt(kx + 6)} ${fmt(ky + 14)}`
  }
  medium += `M${fmt(170)} ${fmt(652)}q${fmt(-14)} ${fmt(1)} ${fmt(-26)} ${fmt(5)}M${fmt(253)} ${fmt(652)}q${fmt(12)} ${fmt(0)} ${fmt(24)} ${fmt(5)}M${fmt(176)} ${fmt(646)}q${fmt(-8)} ${fmt(6)} ${fmt(-18)} ${fmt(9)}`
  // secondary branches that show between the canopy clusters
  for (const [a, b] of [[[150, 352], [108, 318]], [[160, 350], [150, 300]], [[205, 300], [170, 262]], [[212, 270], [252, 236]], [[280, 328], [272, 292]], [[300, 304], [340, 290]], [[262, 348], [300, 352]], [[138, 336], [96, 342]], [[226, 232], [248, 200]], [[244, 368], [250, 330]]]) {
    medium += wobbleD(a, b, random, 2, 3)
    const m = mix(a, b, .6); fine += wobbleD(m, add(m, [(b[0] - a[0]) * .3 + 8, (b[1] - a[1]) * .3 - 6]), random, 1.5, 2)
  }
  return { id: 'trunk', silhouette, lines: { medium: path(medium), fine: path(fine) } }
}

/** Open scalloped arc inside a cluster, from angle a0 to a1 (degrees, clockwise from +x). */
function lobeArcD(cx, cy, rx, ry, a0, a1, random, lobes = 6) {
  const pts = [], n = 18
  for (let i = 0; i <= n; i++) { const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180, k = 1 - .12 * Math.abs(Math.sin(lobes * t / 2)) + (random() - .5) * .05; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]) }
  return curveD(pts, { tension: .9 })
}
function buildCanopies(random) {
  const specs = [[240, 155, 92, 78], [132, 228, 72, 58], [330, 222, 64, 54], [190, 294, 88, 54], [96, 316, 36, 28], [300, 318, 62, 42]]
  return specs.map(([cx, cy, rx, ry], i) => {
    const d = canopyD(cx, cy, rx, ry, random, { lobes: 9 + (i % 3), depth: .12, steps: 40 })
    let medium = '', fine = ''
    const area = rx * ry / (92 * 78)
    // stacked scalloped arcs in the lower half: each is the shaded underside of a leaf mass
    const rings = rx > 50 ? [[.8, 18, 162, 6], [.64, 26, 154, 5], [.5, 38, 142, 4]] : [[.78, 20, 160, 5], [.56, 34, 146, 4]]
    for (const [k, a0, a1, lobes] of rings) medium += lobeArcD(cx + (random() - .5) * 4, cy + (random() - .5) * 3, rx * k, ry * k, a0, a1, random, lobes)
    if (rx > 60) medium += lobeArcD(cx + rx * .2, cy - ry * .18, rx * .34, ry * .36, 30, 165, random, 4)   // an upper inner lobe
    // leaf squiggles: sparse and legible overall, denser in the band between the lower arcs
    fine += foliageD(cx, cy, rx * .9, ry * .9, random, { count: Math.round(18 + 31 * area), size: 11.5 })
    fine += foliageD(cx + rx * .04, cy + ry * .44, rx * .74, ry * .32, random, { count: Math.round(6 + 24 * area), size: 12 })
    // pen-broken hatch in the outer crescent below the lowest arc
    const crescent = [...Array.from({ length: 11 }, (_, k) => { const a = (24 + 132 * k / 10) * Math.PI / 180; return [cx + Math.cos(a) * rx * .95, cy + Math.sin(a) * ry * .95] }), ...Array.from({ length: 11 }, (_, k) => { const a = (156 - 132 * k / 10) * Math.PI / 180; return [cx + Math.cos(a) * rx * .8, cy + Math.sin(a) * ry * .8] })]
    fine += brokenHatchD(crescent, 62, 6.5, random, { inset: 1.5, drop: .4, jitterDeg: 8 })
    return { id: `canopy${i + 1}`, silhouette: path(d), lines: { medium: path(medium), fine: path(fine) } }
  })
}
function buildSprigs(random) {
  let shape = '', lines = '', fine = ''
  for (const [x, y, len, ang, n] of [[152, 344, 48, 76, 4], [262, 350, 46, 88, 4], [110, 338, 36, 84, 3]]) {
    const s = sprig(x, y, len, ang, random, { leaves: n, leafLen: 21, leafWidth: 13, kind: 'oval', curl: 26 })
    shape += s.shape; lines += s.lines
  }
  return { id: 'sprigs', silhouette: shape, outline: false, lines: { medium: shape + lines, fine: path(fine) } }
}

// ---------- assembly ----------
const FAR_SEED = [[55, 268], [110, 246], [160, 222], [205, 198], [250, 226], [300, 242], [345, 212], [400, 172], [445, 206], [495, 228], [540, 204], [590, 240], [640, 222], [700, 214], [750, 246], [800, 232], [850, 220], [900, 250], [945, 262]]
const NEAR_SEED = [[55, 318], [100, 302], [150, 286], [200, 300], [250, 278], [300, 294], [350, 258], [400, 288], [450, 262], [500, 284], [560, 296], [620, 274], [680, 292], [740, 280], [800, 300], [860, 286], [910, 304], [945, 298]]
const farRidge = roughen(FAR_SEED, rng(11), { sub: 3, amp: 2.5 })
const nearRidge = roughen(NEAR_SEED, rng(12), { sub: 3, amp: 2 })
const shoreTop = roughen(SHORE_SEED, rng(13), { sub: 3, amp: 1.5 })

const sky = buildSky(rng(21), farRidge, nearRidge)
const farRange = buildRange('farRange', farRidge, rng(22), { spacing: 7.5, angle: 70 })
const nearRange = buildRange('nearRange', nearRidge, rng(23), { spacing: 6.5, angle: 64, avoid: [[296, 236, 364, 300]] })   // keep the gap between canopy3 and canopy6 clean
const treelines = buildTreeline(rng(24))
const dockParts = buildDock(rng(25), x => yOnPolyline(shoreTop, x))
const boatParts = buildBoat(rng(26), dockParts.ringAt)
const reflections = dockParts.posts.flatMap(p => [[p.x - 2, p.water + 6, 52 - 28 * p.t, p.t < .5 ? 2 : 1], [p.x + 4, p.water + 10, 30 - 14 * p.t, 1]])
const water = buildWater(rng(27), shoreTop, reflections)
const rockParts = buildRocks(rng(28))
const shore = buildShore(rng(29), shoreTop, rockParts.rocks)
const trunk = buildTrunk(rng(30))
const canopies = buildCanopies(rng(31))
const sprigs = buildSprigs(rng(32))

const layers = [sky, farRange, nearRange, ...treelines, water, dockParts.dock, dockParts.dockPosts, boatParts.boat, boatParts.oars, shore, rockParts.layer, trunk, ...canopies, sprigs]

// ---------- shadows and facets ----------
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy])
const sweep = (pts, dx, dy) => polyD(clipFrame(hull([...pts, ...shift(pts, dx, dy)])))
/**
 * Cast shadow of a raised convex slab: its silhouette translated along the light, minus the slab itself, as the
 * union of the pieces outside each slab edge. So the shadow only ever lands beyond the edges that face away from
 * the light (water past the back edge or the bank at the near end for left light, water in front for right light)
 * and never on the deck top.
 */
function slabShadowD(slab, dx, dy) {
  let area = 0
  for (let i = 0; i < slab.length; i++) { const p = slab[i], q = slab[(i + 1) % slab.length]; area += p[0] * q[1] - q[0] * p[1] }
  const outside = -Math.sign(area), moved = shift(slab, dx, dy)
  let d = ''
  for (let i = 0; i < slab.length; i++) {
    const piece = clipSide(moved, slab[i], slab[(i + 1) % slab.length], outside)
    if (piece.length > 2) d += polyD(clipFrame(piece))
  }
  return d
}
function buildShadows(direction, long) {
  const base = { 'upper-left': [85, 30], 'upper-right': [-85, 30], left: [120, 10], right: [-120, 10] }[direction]
  const k = long ? 2.5 : 1, dx = base[0] * k, dy = base[1] * k
  let d = ''
  const trunkFoot = ellipsePts(211, 650, 40, 7, 16)
  d += sweep(trunkFoot, dx, dy)
  // crown shadow swept from a near ellipse at the trunk foot to the far ellipse, so it stays attached and never leaves the frame
  d += polyD(clipFrame(hull([...ellipsePts(211 + dx * .6, 640 + dy * .35, 120, 26, 24), ...ellipsePts(211 + dx * 1.9, 634 + dy * .5, 150 + Math.abs(dx) * .3, 30, 28)])))
  d += polyD(ellipsePts(211, 652, 46, 6, 16))
  for (const p of dockParts.posts) {
    const foot = [[p.x - p.w / 2, p.water - 2], [p.x + p.w / 2, p.water - 2], [p.x + p.w / 2, p.water + 2], [p.x - p.w / 2, p.water + 2]]
    d += sweep(foot, dx * .3, dy * .3)
  }
  for (const p of dockParts.deckPosts) {   // back posts stand on the deck: a short sweep of their foot across the planks
    const foot = [[p.x - p.w / 2, p.foot - 1.5], [p.x + p.w / 2, p.foot - 1.5], [p.x + p.w / 2, p.foot + 1.5], [p.x - p.w / 2, p.foot + 1.5]]
    d += sweep(foot, dx * .2, dy * .2)
  }
  d += slabShadowD(dockParts.slab, dx * .25, dy * .3)
  d += sweep(boatParts.footprint, dx * .25, dy * .3)
  for (const r of rockParts.rocks) { d += sweep(r.footprint, dx * .3, dy * .3); d += polyD(ellipsePts(r.cx, r.cy + 3, r.w * .5, 5, 16)) }
  return path(d)
}
const shadows = {}, longShadows = {}
for (const direction of ['upper-left', 'upper-right', 'left', 'right']) { shadows[direction] = buildShadows(direction, false); longShadows[direction] = buildShadows(direction, true) }

function buildFacets(side) {
  // side 'left' = faces in shade when light comes from the left, i.e. right-hand faces
  let d = ''
  const right = side === 'left'
  const trunkEdge = right ? TRUNK.slice(55, 67) : TRUNK.slice(0, 12)
  d += polyD([...trunkEdge, ...trunkEdge.map(([x, y]) => [x + (right ? -12 : 12), y]).reverse()])
  const limbEdge = right ? TRUNK.slice(48, 56) : TRUNK.slice(12, 19)
  d += polyD([...limbEdge, ...limbEdge.map(([x, y]) => [x + (right ? -4 : 4), y - 5]).reverse()])
  for (const q of dockParts.postShapes) {
    const xm = (q[0][0] + q[1][0]) / 2
    d += right ? polyD([[xm, q[0][1]], q[1], q[2], [xm, q[3][1]]]) : polyD([q[0], [xm, q[1][1]], [xm, q[2][1]], q[3]])
  }
  for (const r of rockParts.rocks) d += polyD(right ? clipHalf(r.outline, 0, r.cx + r.w * .1, true) : clipHalf(r.outline, 0, r.cx - r.w * .1, false))
  const midX = (boatParts.P0[0] + boatParts.P1[0]) / 2
  d += polyD(right ? clipHalf(boatParts.hullSide, 0, midX + 8, true) : clipHalf(boatParts.hullSide, 0, midX - 8, false))
  return path(d)
}

export const scene = {
  id: 'lakeside',
  indoor: false,
  wash: '#e6edf0',
  layers,
  regions: [
    { id: 'sky', label: '하늘', material: 'other', wash: '#dfe9ee', layers: ['sky'] },
    { id: 'mountains', label: '먼 산', material: 'stone', wash: '#cdd6d8', layers: ['farRange', 'nearRange', 'treelineBack', 'treeline'] },
    { id: 'water', label: '호수의 수면', material: 'water', wash: '#d3e3e8', layers: ['water'] },
    { id: 'dock', label: '나무 선착장', material: 'wood', wash: '#e0cfb0', layers: ['dock', 'dockPosts'] },
    { id: 'boat', label: '작은 배', material: 'wood', wash: '#dfd0b8', layers: ['boat', 'oars'] },
    { id: 'shore', label: '앞쪽 물가', material: 'stone', wash: '#e3dcc4', layers: ['shore', 'rocks'] },
    { id: 'tree', label: '물가의 나무', material: 'foliage', wash: '#c9d8ae', layers: ['trunk', ...canopies.map(c => c.id), 'sprigs'] },
  ],
  shadows,
  longShadows,
  facets: { left: buildFacets('left'), right: buildFacets('right') },
}
