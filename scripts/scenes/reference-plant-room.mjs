// Sunlit plant corner, the scene the reference video paints: a wooden slat wall with a tall window,
// hanging pothos from both top corners, a large lobed-leaf floor plant on the left, a two-tier plant
// stand with small pots, a rubber plant by the window, a folding lounge chair with a thick quilted
// cushion in front and a round tripod side table carrying a tea set.
// Everything that stands on the floor is built in metres through one small perspective camera
// (eye level y = 330) so scale and perspective agree; layers run back to front so the generator's
// hidden-line removal keeps background lines out of foreground objects, and regions declared by layer ids
// get the same occlusion so no wash or paint mask bleeds through the chair, table or tea set. Silhouettes
// are kept compact (integer polygons) because every occlusion mask references them.
import { path, ellipse, circle, lineD, polyD, rectD, curveD, rng, between, jitter, lerpPt, rotatePt, hull, hatchD, ticksD, leaf, pot, fmt } from './helpers.mjs'

// ---------- camera ----------
const FR = { x0: 55, y0: 55, x1: 945, y1: 705 }
const HORIZON = 330, CAM_H = 1.18, Z_WALL = 5, FLOOR_Y = 478
const F = (FLOOR_Y - HORIZON) * Z_WALL / CAM_H
const Z_NEAR = F * CAM_H / (FR.y1 - HORIZON)
/** world metres (X right, Y up, Z depth) to canvas pixels */
const P = (X, Y, Z) => [500 + F * X / Z, HORIZON - F * (Y - CAM_H) / Z]
const px = (metres, Z) => F * metres / Z

// ---------- scene-local helpers ----------
const pt = ([x, y]) => `${fmt(x)} ${fmt(y)}`
/** Hand-drawn straight stroke: end points kept, interior jittered. */
function seg(p, q, random, amp = .6) {
  const n = Math.max(2, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 45))
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(lerpPt(p, q, i / n))
  const j = jitter(pts, amp, random); j[0] = p; j[n] = q
  return curveD(j, { tension: .9 })
}
const sketchPoly = (points, random, amp = .5) => points.map((p, i) => seg(p, points[(i + 1) % points.length], random, amp)).join('')
/** Liang-Barsky clip of a segment to the paper frame (null when fully outside). */
function clipSeg([x1, y1], [x2, y2], m = 2) {
  const dx = x2 - x1, dy = y2 - y1
  let t0 = 0, t1 = 1
  for (const [p, q] of [[-dx, x1 - FR.x0 - m], [dx, FR.x1 - m - x1], [-dy, y1 - FR.y0 - m], [dy, FR.y1 - m - y1]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const r = q / p
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r } else { if (r < t0) return null; if (r < t1) t1 = r }
  }
  return [[x1 + dx * t0, y1 + dy * t0], [x1 + dx * t1, y1 + dy * t1]]
}
/** Sutherland-Hodgman clip of a polygon to the paper frame. */
function clipPoly(points, m = 2) {
  let out = points
  for (const [axis, limit, sign] of [[0, FR.x0 + m, 1], [0, FR.x1 - m, -1], [1, FR.y0 + m, 1], [1, FR.y1 - m, -1]]) {
    const input = out; out = []
    const inside = p => sign > 0 ? p[axis] >= limit : p[axis] <= limit
    const cross = (a, b) => lerpPt(a, b, (limit - a[axis]) / (b[axis] - a[axis]))
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length]
      if (inside(cur)) { if (!inside(prev)) out.push(cross(prev, cur)); out.push(cur) } else if (inside(prev)) out.push(cross(prev, cur))
    }
    if (!out.length) return []
  }
  return out
}
const shadowOf = (footprint, dx, dy) => { const pts = clipPoly(hull([...footprint, ...footprint.map(([x, y]) => [x + dx, y + dy])])); return pts.length ? path(polyD(pts)) : '' }
const facetOf = points => { const pts = clipPoly(points); return pts.length ? path(polyD(pts)) : '' }
const ring = (cx, cy, rx, ry, n = 10) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(i / n * Math.PI * 2), cy + ry * Math.sin(i / n * Math.PI * 2)])
function assertInside(points, name) {
  for (const [x, y] of points) if (x < FR.x0 + 2 || x > FR.x1 - 2 || y < FR.y0 + 2 || y > FR.y1 - 2) throw new Error(`${name} leaves the frame at ${fmt(x)} ${fmt(y)}`)
}
/** Samples the closed Catmull-Rom curve that curveD draws, so a polygon can stand in for it in masks. */
function sampleClosed(points, tension, per = 3) {
  const n = points.length, out = []
  const Pn = i => points[((i % n) + n) % n]
  for (let i = 0; i < n; i++) {
    const p0 = Pn(i - 1), p1 = Pn(i), p2 = Pn(i + 1), p3 = Pn(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 6, p1[1] + (p2[1] - p0[1]) * tension / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 6, p2[1] - (p3[1] - p1[1]) * tension / 6]
    for (let k = 0; k < per; k++) {
      const t = k / per, u = 1 - t
      out.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]])
    }
  }
  return out
}
const PROFILE = { oval: [[.2, .55], [.55, .95], [.85, .6]], lance: [[.25, .4], [.55, .75], [.85, .45]], heart: [[.08, .85], [.35, 1], [.7, .7]] }
/** Silhouette polygons only feed masks, so integer vertices are enough; they are copied into every earlier layer's mask. */
const silPolyD = pts => polyD(pts.map(([x, y]) => [Math.round(x), Math.round(y)]))
/** Same geometry as helpers.leaf, but returning the control points: silhouette polygon + drawn outline + veins. */
function simpleLeaf(x, y, len, width, angleDeg, { kind = 'oval', bend = 0, veins = 2, side = 0, per = 2 } = {}) {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (px_, py) => [x + px_ * c - py * s, y + px_ * s + py * c]
  const mid = t => T(len * t, bend * len * Math.sin(Math.PI * t))
  const edge = sign => PROFILE[kind].map(([t, k]) => { const m = mid(t); return [m[0] + sign * (-s) * width * k / 2, m[1] + sign * c * width * k / 2] })
  const pts = [T(0, 0), ...edge(1), mid(1), ...edge(-1).reverse()]
  const dense = sampleClosed(pts, .9, per)
  return { pts: dense, silD: silPolyD(dense), sil: path(silPolyD(dense)), outline: curveD(pts, { close: true, tension: .9 }), veins: leaf(x, y, len, width, angleDeg, { kind, bend, veins, side }).veinsD }
}
/** Penetration depth of two convex polygons (separating-axis theorem); 0 when they do not overlap. */
function overlapDepth(A, B) {
  let best = Infinity
  for (const poly of [A, B]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
    const nx = (p[1] - q[1]) / L, ny = (q[0] - p[0]) / L
    const proj = pts => pts.map(([x, y]) => x * nx + y * ny)
    const a = proj(A), b = proj(B)
    const d = Math.min(Math.max(...a) - Math.min(...b), Math.max(...b) - Math.min(...a))
    if (d <= 0) return 0
    best = Math.min(best, d)
  }
  return best
}
/** Leaves drawn in one layer cannot hide each other, so their hulls may share at most a tip (limit px). */
function assertSeparated(hulls, name, limit = 10) {
  for (let i = 0; i < hulls.length; i++) for (let j = i + 1; j < hulls.length; j++) {
    const d = overlapDepth(hulls[i][1], hulls[j][1])
    if (d > limit) throw new Error(`${name}: leaves ${hulls[i][0]} and ${hulls[j][0]} overlap by ${fmt(d)} px, move one to another depth layer`)
  }
}
/** Lobed leaf (same construction as helpers.lobedLeaf) returning points for a compact silhouette. */
function lobed(x, y, len, width, angleDeg, random, { lobes = 4, depth = .22, bend = 0 } = {}) {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (px_, py) => [x + px_ * c - py * s, y + px_ * s + py * c]
  const mid = t => [len * t, bend * len * Math.sin(Math.PI * t)]
  const edge = sign => { const points = []; for (let i = 1; i < 14; i++) { const t = i / 14, m = mid(t); const hw = width / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), .7) * (1 - depth * Math.abs(Math.sin(lobes * Math.PI * t))) * (1 + (random() - .5) * .08); points.push(T(m[0], m[1] + sign * hw)) } return points }
  const base = T(0, 0), tip = T(len, 0)
  const pts = [base, ...edge(-1), tip, ...edge(1).reverse()]
  let vd = curveD([base, ...[.25, .5, .75].map(t => { const m = mid(t); return T(m[0], m[1]) }), tip])
  for (let i = 0; i < lobes; i++) { const t = (i + .6) / lobes, m = mid(t), k = width * .38 * Math.sin(Math.PI * t); vd += `M${pt(T(m[0], m[1]))}L${pt(T(m[0] + k * .5, m[1] - k))}M${pt(T(m[0], m[1]))}L${pt(T(m[0] + k * .5, m[1] + k))}` }
  return { sil: path(silPolyD(sampleClosed(pts, .8, 1))), outline: curveD(pts, { close: true, tension: .8 }), veins: vd }
}
/** Rough extent of a leaf so every leaf can be kept inside the paper. */
function leafExtent(x, y, len, width, angleDeg) {
  const tip = rotatePt([len, 0], angleDeg), w1 = rotatePt([len * .45, width / 2], angleDeg), w2 = rotatePt([len * .45, -width / 2], angleDeg)
  return [[x + tip[0], y + tip[1]], [x + w1[0], y + w1[1]], [x + w2[0], y + w2[1]], [x, y]]
}
/** Two-line fleshy stem (petiole) from a to b, bulging sideways, wide at the base. */
function petiole(a, b, bulge, w, random) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
  const mid = [a[0] + dx * .5 + nx * bulge, a[1] + dy * .5 + ny * bulge]
  const q = [a[0] + dx * .8 + nx * bulge * .6, a[1] + dy * .8 + ny * bulge * .6]
  const side = s => curveD([[a[0] + nx * s * w / 2, a[1] + ny * s * w / 2], [mid[0] + nx * s * w * .38 + (random() - .5), mid[1] + ny * s * w * .38], [q[0] + nx * s * w * .3, q[1] + ny * s * w * .3 + (random() - .5)], b], { tension: .9 })
  return side(1) + side(-1)
}
/**
 * A small stem with alternating leaves (pothos / herb). The silhouette is one polygon per leaf plus a thin
 * stem strip (not a convex hull), so the gaps between leaves neither hide shelf edges nor spill the mask.
 */
function twig(x, y, length, angleDeg, random, { leaves = 5, leafLen = 14, leafWidth = 10, kind = 'heart', curl = 20 } = {}) {
  const nodes = []
  for (let i = 0; i <= leaves; i++) { const t = i / leaves, ang = angleDeg + curl * Math.sin(t * Math.PI) * (random() < .5 ? -1 : 1) * .5; const r = rotatePt([length * t, 0], ang); nodes.push([x + r[0], y + r[1]]) }
  let outline = '', lines = curveD(nodes), leafD = ''
  for (let i = 1; i <= leaves; i++) {
    const p = nodes[i], side = i % 2 ? 1 : -1, scale = 1 - .35 * (i / leaves)
    const l = simpleLeaf(p[0], p[1], leafLen * scale, leafWidth * scale, angleDeg + side * between(random, 45, 80), { kind, veins: 1, side, per: 1 })
    outline += l.outline; lines += l.veins; leafD += l.silD
  }
  const n = rotatePt([0, 1], angleDeg)
  const stem = [...nodes.map(([nx, ny]) => [nx - n[0], ny - n[1]]), ...[...nodes].reverse().map(([nx, ny]) => [nx + n[0], ny + n[1]])]
  return { sils: path(leafD) + path(silPolyD(stem)), outline, lines }
}

/** Line groups may mix element strings with bare path data: wrap every bare run in a <path>. */
const fix = str => str.split(/(<[^>]*>)/).map(part => part.startsWith('<') ? part : (part.trim() ? path(part.trim()) : '')).join('')
const layers = []
const addLayer = (id, silhouette, lines, extra = {}) => { layers.push({ id, silhouette: fix(silhouette), lines: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, fix(v)])), ...extra }); return id }

// ---------- back wall: slats, post, window ----------
const POST = { x0: 611, x1: 629 }
const WIN = { x: 640, y: 68, w: 262, h: 394, frame: 11 }
function wallLayer() {
  const random = rng(11)
  const sil = path(rectD(FR.x0, FR.y0, FR.x1 - FR.x0, FLOOR_Y - FR.y0))
  let heavy = '', medium = '', fine = ''
  const slat = 24
  let k = 0
  for (let x = FR.x0 + slat; x < POST.x0 - 6; x += slat, k++) {
    const d = seg([x + between(random, -1, 1), FR.y0], [x + between(random, -1, 1), 464], random, 1)
    if (k % 3) fine += d; else medium += d
    if (random() < .6) {
      const y0 = between(random, 70, 380), len = between(random, 40, 110), gx = x + between(random, 6, slat - 6)
      fine += curveD([[gx, y0], [gx + between(random, -2, 2), y0 + len * .35], [gx + between(random, -2, 2), y0 + len * .7], [gx + between(random, -1, 1), y0 + len]])
    }
  }
  // skirting board
  medium += seg([FR.x0, 464], [POST.x0, 464], random) + seg([POST.x1, 464], [WIN.x - 10, 464], random) + seg([WIN.x + WIN.w + 10, 464], [FR.x1, 464], random)
  fine += seg([FR.x0, 471], [POST.x0, 471], random) + seg([POST.x1, 471], [FR.x1, 471], random)
  // wooden post with a joint
  heavy += seg([POST.x0, FR.y0], [POST.x0, FLOOR_Y], random, .8) + seg([POST.x1, FR.y0], [POST.x1, FLOOR_Y], random, .8)
  for (const gx of [615, 620, 625]) fine += curveD([[gx, between(random, 60, 120)], [gx + 1.5, 200], [gx - 1.2, 300], [gx + 1, 400], [gx, FLOOR_Y - 8]])
  medium += seg([POST.x0, 118], [POST.x1, 118], random) + seg([POST.x0, 123], [POST.x1, 123], random)
  // window / glass door: outer frame, inner rebate, double mullions, handle, reflections, sill
  const { x, y, w, h, frame } = WIN
  heavy += sketchPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], random, .7)
  const ix = x + frame, iy = y + frame, iw = w - frame * 2, ih = h - frame * 2
  medium += sketchPoly([[ix, iy], [ix + iw, iy], [ix + iw, iy + ih], [ix, iy + ih]], random, .5)
  fine += sketchPoly([[ix - 4, iy - 4], [ix + iw + 4, iy - 4], [ix + iw + 4, iy + ih + 4], [ix - 4, iy + ih + 4]], random, .4)
  const cx = ix + iw / 2
  medium += seg([cx - 4, iy], [cx - 4, iy + ih], random, .4) + seg([cx + 4, iy], [cx + 4, iy + ih], random, .4)
  for (let r = 1; r < 3; r++) { const yy = iy + ih * r / 3; medium += seg([ix, yy - 3], [ix + iw, yy - 3], random, .4) + seg([ix, yy + 3], [ix + iw, yy + 3], random, .4) }
  medium += path(rectD(cx - 10, iy + ih * .52, 5, 26)) + path(rectD(cx + 5, iy + ih * .52, 5, 26))
  for (const [gx, gy, len] of [[ix + 22, iy + 12, 46], [ix + 34, iy + 10, 30], [cx + 20, iy + ih / 3 + 16, 40], [ix + iw - 40, iy + 2 * ih / 3 + 14, 44], [ix + iw - 28, iy + 2 * ih / 3 + 12, 28]]) fine += lineD(gx, gy + len, gx + len * .55, gy)
  const sy = y + h
  heavy += sketchPoly([[x - 10, sy], [x + w + 10, sy], [x + w + 10, sy + 9], [x - 10, sy + 9]], random, .5)
  fine += seg([x - 6, sy + 4], [x + w + 6, sy + 4], random, .4)
  return addLayer('wall', sil, { heavy, medium, fine })
}

// ---------- floor: planks converging to the eye ----------
function floorLayer() {
  const random = rng(12)
  const sil = path(rectD(FR.x0, FLOOR_Y, FR.x1 - FR.x0, FR.y1 - FLOOR_Y))
  let medium = '', fine = ''
  const W = .24, xs = []
  for (let k = -16; k <= 16; k++) xs.push(k * W + .09)
  for (const X of xs) { const s = clipSeg(P(X, 0, Z_NEAR - .15), P(X, 0, Z_WALL)); if (s) medium += seg(s[0], s[1], random, .7) }
  for (let k = 0; k + 1 < xs.length; k++) {
    let Z = between(random, 2.05, 3.2)
    while (Z < Z_WALL - .2) {
      const s = clipSeg(P(xs[k], 0, Z), P(xs[k + 1], 0, Z))
      if (s) medium += seg(s[0], s[1], random, .4)
      Z += between(random, 1.0, 2.3)
    }
    if (random() < .5) {
      const Z0 = between(random, 2.0, 4.0), Z1 = Z0 + between(random, .6, 1.4), t = between(random, .3, .7), X = xs[k] + W * t
      const pts = []
      for (let i = 0; i <= 4; i++) pts.push(P(X + (random() - .5) * .03, 0, Z0 + (Z1 - Z0) * i / 4))
      const s = pts.filter(p => p[0] > FR.x0 + 3 && p[0] < FR.x1 - 3 && p[1] > FLOOR_Y + 2 && p[1] < FR.y1 - 3)
      if (s.length > 2) fine += curveD(s)
    }
  }
  for (const [X, Z] of [[-.9, 2.3], [.3, 2.15], [1.2, 3.1], [-2.3, 4.2]]) { const [kx, ky] = P(X, 0, Z); fine += ellipse(kx, ky, px(.03, Z), px(.012, Z)) }
  return addLayer('floor', sil, { medium, fine })
}

// ---------- hanging pothos from both top corners ----------
function vineLayer(stems, seed) {
  const random = rng(seed)
  let sil = '', medium = '', fine = ''
  for (const { x, len, drift, leaves, size, sway } of stems) {
    const nodes = []
    for (let i = 0; i <= leaves; i++) { const t = i / leaves; nodes.push([x + drift * t + Math.sin(t * Math.PI * 1.4) * sway, FR.y0 + 2 + len * t]) }
    medium += curveD(nodes)
    for (let i = 1; i <= leaves; i++) {
      const p = nodes[i], prev = nodes[i - 1], side = i % 2 ? 1 : -1
      const stemAngle = Math.atan2(p[1] - prev[1], p[0] - prev[0]) * 180 / Math.PI
      const s = size * (1 - .45 * i / leaves)
      let angle = stemAngle + side * between(random, 35, 70)
      const baseOf = ang => [p[0] + Math.cos(ang * Math.PI / 180) * 6, p[1] + Math.sin(ang * Math.PI / 180) * 6]
      let base = baseOf(angle)
      if (leafExtent(base[0], base[1], s, s * .85, angle).some(([ex, ey]) => ex < FR.x0 + 4 || ex > FR.x1 - 4 || ey < FR.y0 + 4)) { angle = stemAngle - side * between(random, 35, 70); base = baseOf(angle) }
      assertInside(leafExtent(base[0], base[1], s, s * .85, angle), 'vine leaf')
      const l = simpleLeaf(base[0], base[1], s, s * .85, angle, { kind: 'heart', veins: 2, side: 0 })
      medium += lineD(p[0], p[1], base[0], base[1]) + l.outline
      sil += l.sil
      fine += l.veins
    }
  }
  return addLayer('vines', sil, { medium, fine: path(fine) }, { outline: false })
}

// ---------- big floor plant on the left (lobed leaves) ----------
function bigPlant() {
  const random = rng(13)
  const Z = 4.0, X = -2.1
  const [bx, by] = P(X, 0, Z)
  const potW = px(.44, Z), potH = px(.42, Z)
  const potTop = by - potH
  const p = pot(bx, potTop, potW, potH, { bottomW: potW * .74, rim: .2, lip: 1.1 })
  // leaves: [name, base, len, width, angle, lobes, depth, bend, group]
  const leaves = [
    ['L1', [152, 318], 110, 80, -126, 4, .22, .08, 'A'],
    ['L3', [206, 240], 138, 92, -66, 5, .22, .1, 'A'],
    ['L2', [166, 262], 130, 88, -98, 5, .24, -.05, 'B'],
    ['L4', [232, 300], 126, 86, -30, 4, .26, .06, 'B'],
    ['L6', [150, 374], 82, 64, 160, 4, .26, .12, 'B'],
    ['L7', [212, 402], 96, 70, 40, 4, .24, .1, 'B'],
    ['L8', [176, 338], 84, 62, -84, 4, .2, .08, 'C'],
    ['L9', [124, 410], 72, 54, 122, 3, .26, .1, 'C'],
  ]
  let stems = ''
  for (const [name, base, len, width, angle] of leaves) {
    assertInside(leafExtent(base[0], base[1], len, width, angle), name)
    const bulge = (base[0] < bx ? 1 : -1) * between(random, 10, 26)
    stems += petiole([bx + (base[0] - bx) * .12, potTop + 1], base, bulge, 6, random)
  }
  // ceramic pot: rim, two bands with short dashes, soil hatch, contact hatch
  const rimY = potTop + potH * .2
  const band = y => { const t = (y - rimY) / (by - rimY), hw = (potW / 2) * (1 - t) + (potW * .74 / 2) * t; return [[bx - hw + 2, y], [bx + hw - 2, y]] }
  let medium = p.lines + stems, fine = ''
  for (const y of [rimY + 14, rimY + 22, by - 12]) { const [a, b] = band(y); medium += seg(a, b, random, .5) }
  { const [a, b] = band(rimY + 18); fine += ticksD(a[0], a[1], b[0], b[1], 7, 6) }
  fine += hatchD([[bx - potW * .5 + 4, potTop + 2], [bx + potW * .5 - 4, potTop + 2], [bx + potW * .5 - 4, rimY - 2], [bx - potW * .5 + 4, rimY - 2]], 12, 5, { inset: 1 })
  fine += hatchD([[bx - potW * .37 + 2, by], [bx + potW * .37 - 2, by], [bx + potW * .37 + 10, by + 6], [bx - potW * .37 - 12, by + 6]], 0, 5)
  addLayer('bigBase', p.shape, { medium, fine: path(fine) })
  const groups = { A: { sil: '', heavy: '', fine: '' }, B: { sil: '', heavy: '', fine: '' }, C: { sil: '', heavy: '', fine: '' } }
  for (const [, base, len, width, angle, lobes, depth, bend, group] of leaves) {
    const l = lobed(base[0], base[1], len, width, angle, random, { lobes, depth, bend })
    groups[group].sil += l.sil; groups[group].heavy += l.outline; groups[group].fine += l.veins
  }
  for (const g of ['A', 'B', 'C']) addLayer(`bigLeaves${g}`, groups[g].sil, { heavy: path(groups[g].heavy), fine: path(groups[g].fine) }, { outline: false })
  return { footprint: ring(bx, by - 2, potW * .37, px(.1, Z), 10), facetLeft: facetOf([[bx + potW * .18, rimY + 1], [bx + potW * .5 - 1, rimY + 1], [bx + potW * .37, by - 1], [bx + potW * .12, by - 1]]), facetRight: facetOf([[bx - potW * .5 + 1, rimY + 1], [bx - potW * .18, rimY + 1], [bx - potW * .12, by - 1], [bx - potW * .37, by - 1]]) }
}

// ---------- two-tier plant stand ----------
const STAND = { x0: -.95, x1: .6, z0: 3.65, z1: 3.95, shelves: [.55, 1.1], top: 1.2, postW: .065, thick: .06 }
function standLayer() {
  const random = rng(14)
  const { x0, x1, z0, z1, shelves, top, postW, thick } = STAND
  let sil = '', heavy = '', medium = '', fine = ''
  for (const [X, Z] of [[x0, z1], [x1, z1], [x0, z0], [x1, z0]]) {
    const w = px(postW, Z), t = P(X, top, Z), b = P(X, 0, Z)
    const q = [[t[0] - w / 2, t[1]], [t[0] + w / 2, t[1]], [b[0] + w / 2, b[1]], [b[0] - w / 2, b[1]]]
    sil += path(polyD(q))
    heavy += sketchPoly(q, random, .4)
    fine += curveD([[t[0], t[1] + 10], [t[0] + 1, (t[1] + b[1]) / 2], [t[0] - .5, b[1] - 8]])
    fine += lineD(b[0] - w / 2 - 6, b[1] + 1, b[0] + w / 2 + 6, b[1] + 1)
  }
  for (const Y of shelves) {
    const fl = P(x0, Y, z0), fr = P(x1, Y, z0), br = P(x1, Y, z1), bl = P(x0, Y, z1)
    const th = px(thick, z0)
    const face = [bl, br, fr, [fr[0], fr[1] + th], [fl[0], fl[1] + th], fl]
    sil += path(polyD(face))
    heavy += sketchPoly(face, random, .4)
    medium += seg(fl, fr, random, .3)
    for (const t of [.33, .66]) medium += seg(lerpPt(fl, bl, t), lerpPt(fr, br, t), random, .3)
    for (let x = fl[0] + 8; x < fr[0] - 8; x += between(random, 14, 26)) fine += lineD(x, fl[1] + th * .5, x + between(random, 6, 12), fl[1] + th * .5)
  }
  const lo = shelves[0]
  const a = P(x0, lo - .04, z1), b = P(x1, lo - .04, z1), c = P(x0, .08, z1), d = P(x1, .08, z1)
  medium += seg(a, d, random, .4) + seg(b, c, random, .4) + seg([a[0], a[1] + 4], [b[0], b[1] + 4], random, .4)
  for (const X of [x0, x1]) medium += seg(P(X, shelves[1] - .05, z0), P(X, shelves[1] - .05, z1), random, .3)
  addLayer('stand', sil, { heavy, medium, fine }, { outline: false })
  return { feet: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([X, Z]) => P(X, 0, Z)) }
}

// ---------- small pots with pothos and herbs on the stand ----------
function shelfPots() {
  const random = rng(15)
  const { z0, z1, shelves } = STAND
  const Z = (z0 + z1) / 2 - .04
  let potSil = '', potMedium = '', potFine = '', plantSil = '', plantMedium = '', plantFine = ''
  const items = [[-.72, 0, .17, 'pothos'], [-.3, 0, .15, 'pothos'], [.1, 0, .16, 'pothos'], [.42, 0, .14, 'herb'], [-.58, 1, .16, 'herb'], [-.12, 1, .15, 'pothos'], [.32, 1, .17, 'herb']]
  for (const [X, shelf, wm, kind] of items) {
    const [cx, by] = P(X, shelves[shelf], Z), w = px(wm, Z), h = px(wm * .85, Z)
    const p = pot(cx, by - h, w, h, { bottomW: w * .7, rim: .22, lip: 1.1 })
    potSil += p.shape
    potMedium += p.lines
    potFine += hatchD([[cx - w / 2 + 2, by - h + 2], [cx + w / 2 - 2, by - h + 2], [cx + w / 2 - 2, by - h * .78], [cx - w / 2 + 2, by - h * .78]], 10, 5)
    potFine += lineD(cx - w * .35 + 1, by + 1, cx + w * .35 - 1, by + 1)
    const soilY = by - h * .8
    const twigs = kind === 'pothos'
      ? [twig(cx - 3, soilY, px(.14, Z), -70 + between(random, -10, 10), random, { leaves: 3, leafLen: px(.095, Z), leafWidth: px(.075, Z), curl: 24 }),
        twig(cx + 4, soilY, px(.28, Z), 72 + between(random, -8, 8), random, { leaves: 4, leafLen: px(.095, Z), leafWidth: px(.075, Z), curl: 28 }),
        twig(cx - w * .3, soilY + 2, px(.2, Z), 112 + between(random, -8, 8), random, { leaves: 3, leafLen: px(.09, Z), leafWidth: px(.07, Z), curl: 20 })]
      : [-102, -74, -124].map(ang => twig(cx + between(random, -4, 4), soilY, px(.22, Z) * between(random, .8, 1.15), ang, random, { leaves: 4, leafLen: px(.085, Z), leafWidth: px(.034, Z), kind: 'lance', curl: 26 }))
    for (const t of twigs) { plantSil += t.sils; plantMedium += t.outline; plantFine += t.lines }
  }
  addLayer('shelfPots', potSil, { medium: potMedium, fine: path(potFine) })
  addLayer('shelfPlants', plantSil, { medium: path(plantMedium), fine: path(plantFine) }, { outline: false })
}

// ---------- rubber plant by the window ----------
function rubberPlant() {
  const random = rng(16)
  const Z = 4.3, X = 2.05
  const [bx, by] = P(X, 0, Z)
  const potW = px(.42, Z), potH = px(.38, Z)
  const p = pot(bx, by - potH, potW, potH, { bottomW: potW * .72, rim: .16, lip: 1.06, feet: true })
  const rimY = by - potH * .84
  const spine = [[bx - 2, by - potH + 1], [bx + 2, 390], [bx + 5, 320], [bx + 9, 250], [bx + 12, 196]]
  const at = y => { for (let i = 0; i + 1 < spine.length; i++) { const a = spine[i], b = spine[i + 1]; if (y <= a[1] && y >= b[1]) return lerpPt(a, b, (a[1] - y) / (a[1] - b[1])) } return spine[spine.length - 1] }
  const width = y => 4.5 + 4.5 * (y - 196) / (by - potH - 196)
  const left = spine.map(([x, y]) => [x - width(y) / 2, y]), right = spine.map(([x, y]) => [x + width(y) / 2, y])
  const trunk = [...left, ...right.reverse()]
  const branch = [[bx + 6, 300], [bx + 30, 272], [bx + 58, 250]]
  const branchPoly = [...branch.map(([x, y], i) => [x, y - 2.5 + i * .5]), ...[...branch].reverse().map(([x, y], i) => [x, y + 2.5 - i * .5])]
  // leaves: [name, [onBranch, y | base], len, width, angle, bend, depth group]. Groups become separate layers
  // (back to front) so a later leaf hides an earlier one instead of both outlines crossing; within a group
  // leaves may share at most a tip (assertSeparated).
  const spec = [
    ['r5', [0, 350], 58, 30, -100, .1, 'back'], ['r15', [0, 300], 50, 26, -165, .1, 'back'], ['r8', [0, 292], 58, 30, -82, .08, 'back'],
    ['r1', [0, 428], 58, 30, 168, .12, 'low'], ['r2', [0, 416], 62, 32, 18, .12, 'low'],
    ['r3', [0, 392], 70, 36, -152, .15, 'low'], ['r4', [0, 372], 72, 36, -22, .14, 'low'],
    ['r6', [0, 336], 64, 34, -160, .14, 'mid'], ['r7', [0, 322], 66, 34, -18, .12, 'mid'], ['r9', [0, 282], 60, 34, -150, .16, 'mid'],
    ['r11', [0, 236], 66, 34, -178, .14, 'top'], ['r12', [0, 232], 60, 32, -40, .12, 'top'],
    ['r13', [0, 212], 54, 28, -126, .1, 'top'], ['r14', [0, 200], 50, 26, -72, .1, 'top'],
    ['b1', [1, [bx + 30, 272]], 48, 28, 15, .1, 'branch'], ['b2', [1, [bx + 50, 256]], 62, 32, -70, .12, 'branch'],
    ['b3', [1, [bx + 60, 249]], 56, 30, 30, .1, 'branch'],
  ]
  const order = ['back', 'low', 'mid', 'top', 'branch']
  const groups = Object.fromEntries(order.map(g => [g, { sil: '', medium: '', fine: '', hulls: [] }]))
  for (const [name, [onBranch, pos], len, w, angle, bend, group] of spec) {
    const c = onBranch ? pos : at(pos)
    const base = onBranch ? c : [c[0] + (Math.cos(angle * Math.PI / 180) < 0 ? -1 : 1) * width(pos) * .4, c[1]]
    assertInside(leafExtent(base[0], base[1], len, w, angle), name)
    const l = simpleLeaf(base[0], base[1], len, w, angle, { kind: 'oval', bend, veins: 4, side: 0 })
    groups[group].sil += l.sil; groups[group].medium += l.outline; groups[group].fine += l.veins; groups[group].hulls.push([name, hull(l.pts)])
  }
  for (const g of order) assertSeparated(groups[g].hulls, `rubber ${g}`)
  const leafLayer = g => addLayer(`rubber${g[0].toUpperCase()}${g.slice(1)}`, groups[g].sil, { medium: path(groups[g].medium), fine: path(groups[g].fine) }, { outline: false })
  const topP = spine[spine.length - 1]
  const sheath = curveD([[topP[0] - 3, topP[1]], [topP[0] - 1, topP[1] - 24], [topP[0] + 2, topP[1] - 34], [topP[0] + 5, topP[1] - 22], [topP[0] + 4, topP[1]]], { close: true, tension: .9 })
  leafLayer('back')
  let potFine = hatchD([[bx - potW * .5 + 4, by - potH + 2], [bx + potW * .5 - 4, by - potH + 2], [bx + potW * .5 - 4, rimY - 1], [bx - potW * .5 + 4, rimY - 1]], 10, 5)
  for (let i = 0; i < 9; i++) { const y = rimY + 10 + i * 4.6, t = (y - rimY) / (by - rimY), hw = (potW / 2) * (1 - t) + potW * .36 * t; potFine += lineD(bx + hw - 14 - i * .4, y, bx + hw - 3, y) }
  potFine += hatchD([[bx - potW * .36, by], [bx + potW * .36, by], [bx + potW * .36 + 8, by + 5], [bx - potW * .36 - 10, by + 5]], 0, 5)
  const trunkD = curveD(trunk, { close: true, tension: .9 }), branchD = curveD(branchPoly, { close: true, tension: .9 })
  addLayer('rubberBody', p.shape + path(trunkD) + path(branchD) + path(sheath), {
    medium: p.lines + seg([bx - potW * .47, rimY + 8], [bx + potW * .47, rimY + 8], random, .4),
    fine: path(potFine + curveD(spine.map(([x, y]) => [x + 1.5, y - 4])) + ticksD(bx, 400, bx + 10, 220, 22, 5)),
  })
  for (const g of ['low', 'mid', 'top', 'branch']) leafLayer(g)
  return { footprint: ring(bx, by - 2, potW * .36, px(.1, Z), 10), facetLeft: facetOf([[bx + potW * .2, rimY + 2], [bx + potW * .5 - 1, rimY + 2], [bx + potW * .36, by - 1], [bx + potW * .14, by - 1]]) + facetOf([[bx + 1, 400], [bx + 5, 400], [bx + 13, 200], [bx + 10, 200]]), facetRight: facetOf([[bx - potW * .5 + 1, rimY + 2], [bx - potW * .2, rimY + 2], [bx - potW * .14, by - 1], [bx - potW * .36, by - 1]]) + facetOf([[bx - 4, 400], [bx, 400], [bx + 8, 200], [bx + 5, 200]]) }
}

// ---------- round tripod side table ----------
const TABLE = { X: .84, Z: 2.35, top: .62, r: .3, legR: .27 }
function tableLayer() {
  const { X, Z, top, r, legR } = TABLE
  const c = P(X, top, Z), near = P(X, top, Z - r), far = P(X, top, Z + r)
  const rx = px(r, Z), cy = (near[1] + far[1]) / 2, ry = (near[1] - far[1]) / 2, th = px(.035, Z)
  let sil = ellipse(c[0], cy, rx, ry)
  sil += path(`M${fmt(c[0] - rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 0 0 ${fmt(c[0] + rx)} ${fmt(cy)}L${fmt(c[0] + rx)} ${fmt(cy + th)}A${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(c[0] - rx)} ${fmt(cy + th)}Z`)
  const profile = [[top - .02, .05], [top - .06, .035], [top - .12, .028], [top - .22, .048], [top - .3, .03], [top - .42, .028], [top - .5, .04], [.06, .04], [.06, .085], [.03, .085]]
  const sideAt = sign => profile.map(([Y, hw]) => { const [x, y] = P(X, Y, Z); return [x + sign * px(hw, Z), y] })
  const column = [...sideAt(-1), ...sideAt(1).reverse()]
  sil += path(curveD(column, { close: true, tension: .6 }))
  let medium = ellipse(c[0], cy, rx - 6, ry - 2.5), fine = ''
  for (const i of [1, 3, 4, 6, 7]) { const [x, y] = P(X, profile[i][0], Z), hw = px(profile[i][1], Z); medium += `M${fmt(x - hw)} ${fmt(y)}A${fmt(hw)} ${fmt(hw * .3)} 0 0 0 ${fmt(x + hw)} ${fmt(y)}` }
  const feet = []
  for (const ang of [0, 120, 240]) {
    const a = ang * Math.PI / 180
    const fx = X + legR * Math.sin(a), fz = Z - legR * Math.cos(a)
    const foot = P(fx, 0, fz), knee = P(X + legR * .55 * Math.sin(a), .035, Z - legR * .55 * Math.cos(a))
    const rootP = P(X + .05 * Math.sin(a), .05, Z - .05 * Math.cos(a))
    const w1 = px(.045, Z), w2 = px(.03, fz)
    const dx = foot[0] - rootP[0], dy = foot[1] - rootP[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
    const q = [[rootP[0] + nx * w1 / 2, rootP[1] + ny * w1 / 2], [knee[0] + nx * w1 * .45, knee[1] + ny * w1 * .45], [foot[0] + nx * w2 / 2, foot[1] + ny * w2 / 2], [foot[0] - nx * w2 / 2, foot[1] - ny * w2 / 2], [knee[0] - nx * w1 * .45, knee[1] - ny * w1 * .45], [rootP[0] - nx * w1 / 2, rootP[1] - ny * w1 / 2]]
    sil += path(curveD(q, { close: true, tension: .5 })) + ellipse(foot[0], foot[1] + 1, px(.035, fz), px(.012, fz))
    fine += lineD(foot[0] - 12, foot[1] + 3, foot[0] + 12, foot[1] + 3)
    feet.push([foot[0], foot[1] + 2])
  }
  for (const k of [-.55, -.25, .1, .45]) fine += curveD([[c[0] - rx * .9 * Math.sqrt(1 - k * k), cy + ry * k], [c[0] - rx * .4, cy + ry * k + 1.2], [c[0] + rx * .3, cy + ry * k - 1], [c[0] + rx * .9 * Math.sqrt(1 - k * k), cy + ry * k]])
  fine += ticksD(c[0] - rx * .7, cy + ry + th * .5 - 1, c[0] + rx * .7, cy + ry + th * .5 - 1, 9, th * .6)
  addLayer('table', sil, { medium, fine: path(fine) })
  // shaded halves of the pedestal: centre line down, the turned outer edge (same profile as the silhouette) back up
  const centre = profile.map(([Y]) => P(X, Y, Z))
  const colRight = facetOf([...centre, ...sideAt(1).reverse()])
  const colLeft = facetOf([...sideAt(-1), ...centre.reverse()])
  const rimRight = path(`M${fmt(c[0] + rx * .35)} ${fmt(cy + ry * .94)}A${fmt(rx)} ${fmt(ry)} 0 0 0 ${fmt(c[0] + rx)} ${fmt(cy)}L${fmt(c[0] + rx)} ${fmt(cy + th)}A${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(c[0] + rx * .35)} ${fmt(cy + ry * .94 + th)}Z`)
  const rimLeft = path(`M${fmt(c[0] - rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 0 0 ${fmt(c[0] - rx * .35)} ${fmt(cy + ry * .94)}L${fmt(c[0] - rx * .35)} ${fmt(cy + ry * .94 + th)}A${fmt(rx)} ${fmt(ry)} 0 0 1 ${fmt(c[0] - rx)} ${fmt(cy + th)}Z`)
  return { feet, surface: { c, cy, rx, ry }, facetLeft: colRight + rimRight, facetRight: colLeft + rimLeft }
}

// ---------- tea set on the table ----------
function teaset(surface) {
  const { c, cy, rx, ry } = surface
  let sil = '', medium = '', fine = ''
  const tx = c[0] - rx * .38, tb = cy - ry * .25
  sil += ellipse(tx, tb - 20, 25, 21)
  sil += path(`M${fmt(tx - 15)} ${fmt(tb - 38)}Q${fmt(tx)} ${fmt(tb - 56)} ${fmt(tx + 15)} ${fmt(tb - 38)}Z`) + circle(tx, tb - 51, 4)
  sil += path(curveD([[tx - 22, tb - 30], [tx - 34, tb - 40], [tx - 40, tb - 52], [tx - 34, tb - 53], [tx - 26, tb - 42], [tx - 20, tb - 22]], { close: true, tension: .8 }))
  sil += path(curveD([[tx + 20, tb - 32], [tx + 34, tb - 36], [tx + 40, tb - 24], [tx + 33, tb - 12], [tx + 21, tb - 10], [tx + 22, tb - 15], [tx + 31, tb - 16], [tx + 34, tb - 24], [tx + 30, tb - 30], [tx + 20, tb - 27]], { close: true, tension: .8 }))
  medium += `M${fmt(tx - 17)} ${fmt(tb - 36)}A25 21 0 0 1 ${fmt(tx + 17)} ${fmt(tb - 36)}`
  medium += `M${fmt(tx - 24)} ${fmt(tb - 24)}A28 10 0 0 0 ${fmt(tx + 24)} ${fmt(tb - 24)}`
  fine += hatchD([[tx + 4, tb - 36], [tx + 22, tb - 30], [tx + 22, tb - 8], [tx + 6, tb - 2]], 60, 5)
  fine += `M${fmt(tx - 12)} ${fmt(tb - 4)}Q${fmt(tx)} ${fmt(tb)} ${fmt(tx + 12)} ${fmt(tb - 4)}`
  const ux = c[0] + rx * .3, ub = cy + ry * .45
  sil += ellipse(ux, ub, 18, 6) + path(polyD([[ux - 11, ub - 20], [ux + 11, ub - 20], [ux + 8, ub - 3], [ux - 8, ub - 3]])) + ellipse(ux, ub - 20, 11, 4)
  sil += path(curveD([[ux + 10, ub - 17], [ux + 18, ub - 16], [ux + 19, ub - 9], [ux + 10, ub - 7], [ux + 11, ub - 10], [ux + 15, ub - 11], [ux + 14, ub - 14], [ux + 10, ub - 14]], { close: true, tension: .8 }))
  medium += ellipse(ux, ub - 20, 8, 2.6) + ellipse(ux, ub, 11, 3.5)
  fine += hatchD([[ux + 3, ub - 18], [ux + 10, ub - 18], [ux + 8, ub - 4], [ux + 2, ub - 4]], 70, 5)
  const dx = c[0] + rx * .05, db = cy + ry * .05
  sil += ellipse(dx, db, 15, 5.5)
  medium += ellipse(dx, db - 1, 10, 3)
  medium += ellipse(dx - 4, db - 3, 4, 2.5) + ellipse(dx + 4, db - 2, 4, 2.5)
  addLayer('teaset', sil, { medium, fine: path(fine) })
  return { facetLeft: facetOf([[tx + 10, tb - 38], [tx + 23, tb - 30], [tx + 22, tb - 8], [tx + 8, tb - 2]]) + facetOf([[ux + 4, ub - 19], [ux + 11, ub - 19], [ux + 8, ub - 3], [ux + 3, ub - 3]]), facetRight: facetOf([[tx - 23, tb - 30], [tx - 10, tb - 38], [tx - 8, tb - 2], [tx - 22, tb - 8]]) + facetOf([[ux - 11, ub - 19], [ux - 4, ub - 19], [ux - 3, ub - 3], [ux - 8, ub - 3]]) }
}

// ---------- folding lounge chair with quilted cushion ----------
const CH = { X: -.64, Z: 2.68, yaw: 36, scale: 1.08 }
/** chair-local (u right, v up, w forward, metres before scale) to canvas, with depth */
function C(u, v, w) {
  const a = CH.yaw * Math.PI / 180, k = CH.scale
  const X = CH.X + (u * Math.cos(a) + w * Math.sin(a)) * k, Z = CH.Z + (u * Math.sin(a) - w * Math.cos(a)) * k
  const [x, y] = P(X, v * k, Z)
  return [x, y, Z]
}
const wA = v => .46 - .96 * v        // rail from the front foot up to the headrest
const wB = v => -.50 + 1.406 * v     // rail from the rear foot up to the armrest front
const PAD = .09
const q2 = pts => pts.map(p => C(...p).slice(0, 2))
function bar(a, b, thick) {
  const A = C(...a), B = C(...b), hw = px(thick / 2, (A[2] + B[2]) / 2)
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * hw, ny = dx / L * hw
  return [[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]]
}
function chair() {
  const random = rng(19)
  const sideFrame = (s, outerU, innerU) => ({
    railA: bar([innerU, 0, wA(0)], [innerU, 1.02, wA(1.02)], .045),
    railB: bar([outerU, 0, wB(0)], [outerU, .64, wB(.64)], .045),
    armTop: q2([[innerU - .01 * s, .66, wA(.66)], [outerU + .03 * s, .66, wA(.66)], [outerU + .03 * s, .66, .40], [innerU - .01 * s, .66, .40]]),
    armSide: q2([[outerU + .03 * s, .66, wA(.66)], [outerU + .03 * s, .66, .40], [outerU + .03 * s, .62, .40], [outerU + .03 * s, .62, wA(.66)]]),
    feet: [C(innerU, 0, wA(0)), C(outerU, 0, wB(0))],
  })
  const far = sideFrame(1, .37, .345), nearF = sideFrame(-1, -.37, -.345)
  const stroke = (q, amp = .5) => sketchPoly(q, random, amp)
  const footPad = ([x, y, Z]) => ellipse(x, y + 1, px(.03, Z), px(.011, Z))
  const contact = ([x, y, Z]) => lineD(x - px(.05, Z), y + 3, x + px(.05, Z), y + 3) + lineD(x - px(.02, Z), y + 6, x + px(.035, Z), y + 6)
  const grain = q => curveD([lerpPt(q[0], q[3], .5), lerpPt(lerpPt(q[0], q[3], .5), lerpPt(q[1], q[2], .5), .5), lerpPt(q[1], q[2], .5)].map(p => [p[0] + (random() - .5) * 1.5, p[1]]))
  // far side: both rails, armrest, rear stretcher
  {
    const stretcher = bar([-.37, .14, -.47], [.37, .14, -.47], .04)
    const parts = [far.railA, far.railB, far.armTop, far.armSide, stretcher]
    addLayer('chairFar', parts.map(q => path(polyD(q))).join('') + far.feet.map(footPad).join(''), {
      heavy: path(parts.map(q => stroke(q)).join('')),
      fine: path(far.feet.map(contact).join('') + hatchD(far.armSide, 0, 5) + hatchD(stretcher, 0, 5) + grain(far.railA) + grain(far.railB)),
    }, { outline: false })
  }
  // seat frame: side rails, front rail, front stretcher. The seat slats lie under the overhanging cushion
  // (as in the reference) so only the front rail shows below the pad, as one bar with a single grain line.
  {
    const sideL = bar([-.33, .42, -.25], [-.33, .47, .46], .04), sideR = bar([.33, .42, -.25], [.33, .47, .46], .04)
    const frontRail = bar([-.35, .445, .47], [.35, .445, .47], .04)
    const stretcher = bar([-.345, .12, wA(.12)], [.345, .12, wA(.12)], .04)
    const all = [sideR, sideL, frontRail, stretcher]
    const fine = hatchD(stretcher, 0, 5, { inset: 2 }) + grain(frontRail)
    addLayer('chairSeat', all.map(q => path(polyD(q))).join(''), { heavy: path(all.map(q => stroke(q)).join('')), fine: path(fine) }, { outline: false })
  }
  // cushion: back pad, seat pad, top roll, left side profile. SF is the seat pad's front edge: it overhangs
  // the frame (front rail at w .47) so the lip hides the slats and only the rail peeks out below.
  const U = .31, SF = .50, SB = .475
  const backFront = q2([[-U, 1.0, wA(1) + PAD], [U, 1.0, wA(1) + PAD], [U, .55, wA(.55) + PAD], [-U, .55, wA(.55) + PAD]])
  const seatTop = q2([[-U, .55, wA(.55) + PAD], [U, .55, wA(.55) + PAD], [U, .56, SF], [-U, .56, SF]])
  const seatFront = q2([[-U, .56, SF], [U, .56, SF], [U, SB, SF + .01], [-U, SB, SF + .01]])
  const profile = q2([[-U, 1.0, wA(1)], [-U, 1.0, wA(1) + PAD], [-U, .55, wA(.55) + PAD], [-U, .56, SF], [-U, SB, SF + .01], [-U, SB, wA(SB)]])
  const capPts = []
  const cw = wA(1) + PAD / 2, cr = PAD / 2
  for (let k = 0; k <= 6; k++) { const th = Math.PI - k * Math.PI / 6; capPts.push([-U, 1.0 + cr * Math.sin(th) * 1.1, cw + cr * Math.cos(th)]) }
  for (let k = 6; k >= 0; k--) { const th = Math.PI - k * Math.PI / 6; capPts.push([U, 1.0 + cr * Math.sin(th) * 1.1, cw + cr * Math.cos(th)]) }
  const cap = q2(capPts)
  {
    const sil = [backFront, seatTop, seatFront, profile].map(q => path(polyD(q))).join('') + path(polyD(sampleClosed(cap, .7, 2)))
    const heavy = stroke(backFront, .7) + stroke(seatTop, .7) + stroke(seatFront, .7) + stroke(profile, .7) + curveD(cap, { close: true, tension: .7 })
    let medium = '', fine = ''
    for (const v of [.9, .78, .66]) medium += curveD(q2([[-U + .02, v, wA(v) + PAD], [-U * .5, v - .012, wA(v - .012) + PAD], [0, v - .018, wA(v - .018) + PAD], [U * .5, v - .012, wA(v - .012) + PAD], [U - .02, v, wA(v) + PAD]]))
    for (const w of [.14, .26, .38]) medium += curveD(q2([[-U + .02, .55, w], [0, .545, w + .01], [U - .02, .55, w]]))
    const apex = C(0, .80, wA(.80) + PAD + .005)
    const tl = C(-U + .02, .985, wA(.985) + PAD + .005), tr = C(U - .02, .985, wA(.985) + PAD + .005)
    medium += curveD([tl, C(-U * .45, .9, wA(.9) + PAD + .005), apex], { tension: .8 }) + curveD([tr, C(U * .45, .9, wA(.9) + PAD + .005), apex], { tension: .8 })
    fine += ticksD(tl[0] + 3, tl[1] + 3, apex[0], apex[1] - 3, 8, 4) + ticksD(tr[0] - 3, tr[1] + 3, apex[0], apex[1] - 3, 8, 4)
    const eL = q2([[-U + .012, .98, wA(.98) + PAD], [-U + .012, .57, wA(.57) + PAD]]), eR = q2([[U - .012, .98, wA(.98) + PAD], [U - .012, .57, wA(.57) + PAD]])
    fine += ticksD(eL[0][0], eL[0][1], eL[1][0], eL[1][1], 8, 4) + ticksD(eR[0][0], eR[0][1], eR[1][0], eR[1][1], 8, 4)
    const sf = q2([[-U + .01, .555, SF - .01], [U - .01, .555, SF - .01]])
    fine += ticksD(sf[0][0], sf[0][1], sf[1][0], sf[1][1], 8, 4)
    for (const v of [.9, .78, .66]) { const a = C(-U + .03, v + .02, wA(v + .02) + PAD), b = C(U - .03, v + .02, wA(v + .02) + PAD); fine += `M${pt(a)}q4 -3 8 0M${pt(b)}q-4 -3 -8 0` }
    const crease = C(-U * .2, .57, wA(.57) + PAD)
    fine += `M${pt(crease)}q10 8 22 10M${fmt(crease[0] + 30)} ${fmt(crease[1] - 2)}q8 6 16 9`
    fine += hatchD(profile, 110, 6, { inset: 2 }) + hatchD(seatFront, 100, 6, { inset: 2 })
    addLayer('chairCushion', sil, { heavy: path(heavy), medium: path(medium), fine: path(fine) }, { outline: false })
  }
  // near side frame: both rails, armrest, bolts
  {
    const parts = [nearF.railA, nearF.railB, nearF.armTop, nearF.armSide]
    const [cx, cy] = C(-.36, .406, wA(.406))
    const [ax, ay] = C(-.37, .64, .40)
    addLayer('chairNear', parts.map(q => path(polyD(q))).join('') + nearF.feet.map(footPad).join(''), {
      heavy: path(parts.map(q => stroke(q, .6)).join('')),
      medium: circle(cx, cy, 3.2) + circle(ax, ay, 2.6),
      fine: path(nearF.feet.map(contact).join('') + hatchD(nearF.armSide, 0, 5, { inset: 1 }) + grain(nearF.railA) + grain(nearF.railB)),
    }, { outline: false })
  }
  const feet = [...far.feet, ...nearF.feet].map(([x, y]) => [x, y + 2])
  const facetLeft = facetOf(q2([[U * .45, 1.0, wA(1) + PAD], [U, 1.0, wA(1) + PAD], [U, .55, wA(.55) + PAD], [U * .45, .55, wA(.55) + PAD]])) + facetOf(q2([[U * .45, .56, SF], [U, .56, SF], [U, SB, SF + .01], [U * .45, SB, SF + .01]]))
  const facetRight = facetOf(q2([[-U, 1.0, wA(1) + PAD], [-U * .45, 1.0, wA(1) + PAD], [-U * .45, .55, wA(.55) + PAD], [-U, .55, wA(.55) + PAD]])) + facetOf(profile) + facetOf(q2([[-U, .56, SF], [-U * .45, .56, SF], [-U * .45, SB, SF + .01], [-U, SB, SF + .01]]))
  return { feet, facetLeft, facetRight }
}

// ---------- compose ----------
wallLayer()
floorLayer()
vineLayer([
  { x: 74, len: 150, drift: 18, leaves: 7, size: 34, sway: 8 },
  { x: 112, len: 118, drift: 10, leaves: 6, size: 32, sway: -7 },
  { x: 150, len: 96, drift: -6, leaves: 5, size: 30, sway: 6 },
  { x: 196, len: 72, drift: 8, leaves: 4, size: 28, sway: -5 },
  { x: 760, len: 90, drift: -10, leaves: 5, size: 30, sway: 6 },
  { x: 812, len: 128, drift: 12, leaves: 6, size: 32, sway: -8 },
  { x: 866, len: 150, drift: -14, leaves: 7, size: 34, sway: 7 },
  { x: 914, len: 100, drift: -12, leaves: 5, size: 28, sway: -5 },
], 21)
const big = bigPlant()
const stand = standLayer()
shelfPots()
const rubber = rubberPlant()
const table = tableLayer()
const tea = teaset(table.surface)
const seat = chair()

const plantLayerIds = layers.map(l => l.id).filter(id => /^(vines|big|shelfP|rubber)/.test(id))
// The plants region mixes leaves and pots, and the chairs region mixes cushion and frame; the authored
// guide tints them separately (green leaves, terracotta pots, orange cushion, wooden frame) through named masks.
const potLayerIds = ['bigBase', 'shelfPots', 'rubberBody']
const leafLayerIds = plantLayerIds.filter(id => !potLayerIds.includes(id))
const region = (id, label, material, wash, layers) => ({ id, label, material, wash, layers })
const dirs = { 'upper-left': [1, .4], 'upper-right': [-1, .4], left: [1.25, .12], right: [-1.25, .12] }
const shadowsFor = scale => Object.fromEntries(Object.entries(dirs).map(([dir, [kx, ky]]) => [dir,
  shadowOf(seat.feet, 62 * kx * scale, 62 * ky * scale) + shadowOf(table.feet, 50 * kx * scale, 50 * ky * scale) +
  shadowOf(big.footprint, 40 * kx * scale, 40 * ky * scale) + shadowOf(rubber.footprint, 40 * kx * scale, 40 * ky * scale) +
  shadowOf(stand.feet, 22 * kx * scale, 22 * ky * scale) + shadowOf(stand.feet, 0, 4)]))

export const scene = {
  id: 'reference-plant-room',
  indoor: true,
  wash: '#f6e9aa',
  layers,
  regions: [
    region('wall', '벽과 창', 'stone', '#f8edc6', ['wall']),
    region('floor', '바닥', 'wood', '#ead4a1', ['floor']),
    region('shelf', '식물 선반', 'wood', '#e6cfa6', ['stand']),
    region('plants', '화분과 잎', 'foliage', '#d5dbaf', plantLayerIds),
    region('table', '작은 테이블', 'wood', '#e2c9a2', ['table']),
    region('teaset', '찻주전자와 컵', 'ceramic', '#f1e4d2', ['teaset']),
    region('chairs', '접이식 의자', 'fabric', '#f6e9aa', ['chairFar', 'chairSeat', 'chairCushion', 'chairNear']),
  ],
  guides: [
    { id: 'leaves', layers: leafLayerIds },
    { id: 'pots', layers: potLayerIds },
    { id: 'cushion', layers: ['chairCushion'] },
    { id: 'chair-frame', layers: ['chairFar', 'chairSeat', 'chairNear'] },
  ],
  shadows: shadowsFor(1),
  longShadows: shadowsFor(2.6),
  facets: {
    left: seat.facetLeft + table.facetLeft + tea.facetLeft + big.facetLeft + rubber.facetLeft,
    right: seat.facetRight + table.facetRight + tea.facetRight + big.facetRight + rubber.facetRight,
  },
}
