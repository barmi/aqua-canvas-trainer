// Shared drawing primitives for scene modules. All coordinates are absolute in the
// 1000 × 760 canvas. The paper frame is x 55–945, y 55–705. Everything is deterministic:
// randomness only comes from rng(seed) so npm run assets:generate reproduces the same files.

export const fmt = n => {
  const v = Math.round(n * 10) / 10
  return (Object.is(v, -0) ? 0 : v).toString()
}
const pt = ([x, y]) => `${fmt(x)} ${fmt(y)}`

/** Wrap a path `d` string as an SVG element. Region shapes, lines and layers are all element strings. */
export const path = d => (d ? `<path d="${d}"/>` : '')
export const ellipse = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}"${rot ? ` transform="rotate(${fmt(rot)} ${fmt(cx)} ${fmt(cy)})"` : ''}/>`
export const circle = (cx, cy, r) => `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"/>`
/** Group with an SVG transform. Prefer absolute coordinates; use this only for repeated motifs. */
export const g = (content, transform) => `<g transform="${transform}">${content}</g>`
export const place = (content, x, y, s = 1, rot = 0) => g(content, `translate(${fmt(x)} ${fmt(y)})${rot ? ` rotate(${fmt(rot)})` : ''}${s !== 1 ? ` scale(${fmt(s)})` : ''}`)
export const union = (...parts) => parts.flat().join('')

// ---------- path builders (return `d` strings, suffix D) ----------

export const lineD = (x1, y1, x2, y2) => `M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`
export const line = (x1, y1, x2, y2) => path(lineD(x1, y1, x2, y2))
export const polyD = (points, close = true) => points.length ? 'M' + points.map((p, i) => (i ? 'L' : '') + pt(p)).join('') + (close ? 'Z' : '') : ''
export const poly = (points, close = true) => path(polyD(points, close))
/** Several open polylines in one path. */
export const polylinesD = lists => lists.map(points => polyD(points, false)).join('')
export const rectD = (x, y, w, h) => polyD([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
export const rect = (x, y, w, h) => path(rectD(x, y, w, h))
export const ellipseD = (cx, cy, rx, ry) => `M${fmt(cx - rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx + rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx - rx)} ${fmt(cy)}Z`
/** Elliptical arc along the lower (sweep 0) or upper half between two x positions, for rims, bowls and arches. */
export const arcD = (x1, y1, x2, y2, rx, ry, large = 0, sweep = 0) => `M${fmt(x1)} ${fmt(y1)}A${fmt(rx)} ${fmt(ry)} 0 ${large} ${sweep} ${fmt(x2)} ${fmt(y2)}`

/** Smooth Catmull-Rom curve through points. tension 1 is the classic spline, lower is tighter. */
export function curveD(points, { close = false, tension = 1 } = {}) {
  const n = points.length
  if (n < 2) return ''
  const P = i => points[close ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${pt(points[0])}`
  const segments = close ? n : n - 1
  for (let i = 0; i < segments; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 6, p1[1] + (p2[1] - p0[1]) * tension / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 6, p2[1] - (p3[1] - p1[1]) * tension / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d + (close ? 'Z' : '')
}
export const curve = (points, opts) => path(curveD(points, opts))

// ---------- deterministic randomness ----------

/** mulberry32: returns a function producing floats in [0, 1). */
export function rng(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
export const between = (random, lo, hi) => lo + random() * (hi - lo)
export const jitter = (points, amp, random) => points.map(([x, y]) => [x + (random() - .5) * 2 * amp, y + (random() - .5) * 2 * amp])

// ---------- geometry ----------

export const lerp = (a, b, t) => a + (b - a) * t
export const lerpPt = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)]
export const rotatePt = ([x, y], angleDeg, [cx, cy] = [0, 0]) => {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy
  return [cx + dx * c - dy * s, cy + dx * s + dy * c]
}
export const bounds = points => points.reduce((b, [x, y]) => ({ minX: Math.min(b.minX, x), minY: Math.min(b.minY, y), maxX: Math.max(b.maxX, x), maxY: Math.max(b.maxY, y) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
/** Convex hull (monotone chain). Useful to turn a footprint plus its projected copy into a cast shadow. */
export function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p) }
  const upper = []
  for (const p of sorted.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p) }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}
/**
 * Cast shadow polygon for an upright object: its ground footprint swept along (dx, dy).
 * Light from the upper-right throws shadows down-left (negative dx, positive dy); light from the
 * left throws them to the right. Longer sweeps model low evening or dawn light.
 */
export const castD = (footprint, dx, dy) => polyD(hull([...footprint, ...footprint.map(([x, y]) => [x + dx, y + dy])]))
export const cast = (footprint, dx, dy) => path(castD(footprint, dx, dy))

// ---------- texture: hatching, ticks, dashes ----------

/** Parallel hatch lines clipped inside a simple polygon. angle 0 is horizontal, 90 vertical. */
export function hatchD(polygon, angleDeg, spacing, { phase = 0, inset = 0 } = {}) {
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  const proj = polygon.map(([x, y]) => x * nx + y * ny)
  const tmin = Math.min(...proj), tmax = Math.max(...proj)
  let out = ''
  for (let t = tmin + spacing / 2 + phase; t < tmax; t += spacing) {
    const hits = []
    for (let i = 0; i < polygon.length; i++) {
      const [x1, y1] = polygon[i], [x2, y2] = polygon[(i + 1) % polygon.length]
      const p1 = x1 * nx + y1 * ny, p2 = x2 * nx + y2 * ny
      if (p1 === p2 || (p1 < t) === (p2 < t)) continue
      const f = (t - p1) / (p2 - p1), x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f
      hits.push(x * dx + y * dy)
    }
    hits.sort((p, q) => p - q)
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const s0 = hits[i] + inset, s1 = hits[i + 1] - inset
      if (s1 - s0 < 1) continue
      out += `M${fmt(nx * t + dx * s0)} ${fmt(ny * t + dy * s0)}L${fmt(nx * t + dx * s1)} ${fmt(ny * t + dy * s1)}`
    }
  }
  return out
}
export const hatch = (polygon, angleDeg, spacing, opts) => path(hatchD(polygon, angleDeg, spacing, opts))
/** Short perpendicular ticks along a segment, for stitching, rope, planks ends or rail balusters. */
export function ticksD(x1, y1, x2, y2, step, length, { offset = 0 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux
  let d = ''
  for (let s = step / 2 + offset; s < len; s += step) {
    const x = x1 + ux * s, y = y1 + uy * s
    d += `M${fmt(x - nx * length / 2)} ${fmt(y - ny * length / 2)}L${fmt(x + nx * length / 2)} ${fmt(y + ny * length / 2)}`
  }
  return d
}
/** Dashed segment as separate sub-paths (so it also works as a mask-safe path). */
export function dashesD(x1, y1, x2, y2, dash, gap) {
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len
  let d = ''
  for (let s = 0; s < len; s += dash + gap) {
    const e = Math.min(len, s + dash)
    d += `M${fmt(x1 + ux * s)} ${fmt(y1 + uy * s)}L${fmt(x1 + ux * e)} ${fmt(y1 + uy * e)}`
  }
  return d
}

// ---------- perspective helpers ----------

/** Lines from each ground point toward a vanishing point, clipped between yNear and yFar. */
export function convergeD(vp, groundPoints, yFar, yNear = null) {
  let d = ''
  for (const [x, y] of groundPoints) {
    const y0 = yNear ?? y
    const at = yy => x + (vp[0] - x) * (y0 - yy) / (y0 - vp[1])
    d += `M${fmt(at(y0))} ${fmt(y0)}L${fmt(at(yFar))} ${fmt(yFar)}`
  }
  return d
}
/** y positions of equally deep rows between yNear (front) and yFar (back) with foreshortening toward horizonY. */
export function perspectiveRows(yNear, yFar, count, horizonY) {
  const zFar = (yNear - horizonY) / (yFar - horizonY)
  const rows = []
  for (let k = 0; k <= count; k++) rows.push(horizonY + (yNear - horizonY) / (1 + k * (zFar - 1) / count))
  return rows
}
/** Horizontal line across a trapezoid at a given y. edges = [[xTopLeft, yTop], [xBottomLeft, yBottom]] and same for right. */
export const xOnEdge = ([[x0, y0], [x1, y1]], y) => x0 + (x1 - x0) * (y - y0) / (y1 - y0)

/** Stone courses (bricks) inside a rectangle; random skips make it look hand drawn. */
export function bricksD(x, y, w, h, bw, bh, random, { keep = .6, course = 1 } = {}) {
  let d = ''
  const rows = Math.ceil(h / bh)
  for (let j = 0; j < rows; j++) {
    const top = y + j * bh, bottom = Math.min(y + h, top + bh)
    if (j > 0 && random() < course) d += lineD(x, top, x + w, top)
    const offset = (j % 2) * bw / 2
    for (let bx = x + offset - bw; bx < x + w; bx += bw) {
      const jx = bx + bw
      if (jx <= x || jx >= x + w || random() > keep) continue
      d += lineD(jx, top, jx, bottom)
    }
  }
  return d
}
/** Rows of rounded cobblestones inside a quad [topLeft, topRight, bottomRight, bottomLeft]; stones shrink toward the far edge. */
export function cobblesD(quad, rows, random, { gap = .12, perRowNear = 10 } = {}) {
  const [tl, tr, br, bl] = quad
  let d = ''
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows, t1 = (i + 1) / rows
    const far0 = lerpPt(bl, tl, 1 - t0), far1 = lerpPt(br, tr, 1 - t0)
    const near0 = lerpPt(bl, tl, 1 - t1), near1 = lerpPt(br, tr, 1 - t1)
    const count = Math.max(3, Math.round(perRowNear * (0.35 + 0.65 * t1)))
    const shift = (i % 2) * .5
    for (let k = 0; k < count; k++) {
      const a = (k + shift) / count, b = (k + 1 + shift) / count
      if (b > 1.02) continue
      const g0 = gap * (b - a), ga = a + g0, gb = b - g0
      const p1 = lerpPt(far0, far1, ga), p2 = lerpPt(far0, far1, gb), p3 = lerpPt(near0, near1, gb), p4 = lerpPt(near0, near1, ga)
      const inset = v => v + (random() - .5) * 1.5
      d += curveD([[inset(p1[0]), inset(p1[1])], [inset(p2[0]), inset(p2[1])], [inset(p3[0]), inset(p3[1])], [inset(p4[0]), inset(p4[1])]], { close: true, tension: .9 })
    }
  }
  return d
}

// ---------- objects ----------

/**
 * Leaf outline from a base point. kind: 'oval' (ficus), 'lance' (narrow, pointed), 'heart' (pothos),
 * 'wide' (philodendron). bend curves the midrib. Returns { shape, veins } element strings plus d.
 */
export function leaf(x, y, len, width, angleDeg, { kind = 'oval', bend = 0, veins = 3, side = 1 } = {}) {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (px, py) => [x + px * c - py * s, y + px * s + py * c]
  const mid = t => T(len * t, bend * len * Math.sin(Math.PI * t))
  const tip = mid(1)
  const w = width
  const profile = { oval: [[.2, .55], [.55, .95], [.85, .6]], lance: [[.25, .4], [.55, .75], [.85, .45]], heart: [[.08, .85], [.35, 1], [.7, .7]], wide: [[.1, .8], [.4, 1], [.75, .75]] }[kind]
  const edge = sign => profile.map(([t, k]) => { const m = mid(t); return [m[0] + sign * (-s) * w * k / 2, m[1] + sign * c * w * k / 2] })
  const base = T(0, 0)
  const d = curveD([base, ...edge(1), tip, ...edge(-1).reverse()], { close: true, tension: .9 })
  const points = [base, mid(.25), mid(.5), mid(.75), tip]
  let veinsD = curveD(points)
  for (let i = 1; i <= veins; i++) {
    const t = .15 + .65 * (i - .5) / veins, m = mid(t), m2 = mid(Math.min(1, t + .02))
    const dl = Math.hypot(m2[0] - m[0], m2[1] - m[1]) || 1, ux = (m2[0] - m[0]) / dl, uy = (m2[1] - m[1]) / dl
    const k = Math.sin(Math.PI * t) * w * .36
    for (const sign of side === 0 ? [1, -1] : [side, -side]) {
      const r = rotatePt([ux, uy], sign * 52)
      veinsD += `M${pt(m)}L${fmt(m[0] + r[0] * k)} ${fmt(m[1] + r[1] * k)}`
    }
  }
  return { d, shape: path(d), veinsD, veins: path(veinsD), tip, mid }
}
/** Lobed leaf (monstera/philodendron) with a wavy edge. */
export function lobedLeaf(x, y, len, width, angleDeg, random, { lobes = 4, depth = .22, bend = 0 } = {}) {
  const a = angleDeg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const T = (px, py) => [x + px * c - py * s, y + px * s + py * c]
  const mid = t => [len * t, bend * len * Math.sin(Math.PI * t)]
  const edge = sign => {
    const points = []
    for (let i = 1; i < 14; i++) {
      const t = i / 14, m = mid(t)
      const hw = width / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), .7) * (1 - depth * Math.abs(Math.sin(lobes * Math.PI * t))) * (1 + (random() - .5) * .08)
      points.push(T(m[0], m[1] + sign * hw))
    }
    return points
  }
  const base = T(0, 0), tip = T(len, bend * len * Math.sin(Math.PI))
  const d = curveD([base, ...edge(-1), tip, ...edge(1).reverse()], { close: true, tension: .8 })
  let vd = curveD([base, ...[.25, .5, .75].map(t => { const m = mid(t); return T(m[0], m[1]) }), tip])
  for (let i = 0; i < lobes; i++) {
    const t = (i + .6) / lobes, m = mid(t), k = width * .38 * Math.sin(Math.PI * t)
    vd += `M${pt(T(m[0], m[1]))}L${pt(T(m[0] + k * .5, m[1] - k))}M${pt(T(m[0], m[1]))}L${pt(T(m[0] + k * .5, m[1] + k))}`
  }
  return { d, shape: path(d), veins: path(vd) }
}
/** A stem with alternating small leaves, for pothos, ivy and herbs. Returns { shape (leaves), lines (stem + veins) }. */
export function sprig(x, y, length, angleDeg, random, { leaves = 6, leafLen = 22, leafWidth = 14, kind = 'heart', curl = 18 } = {}) {
  const points = []
  let shape = '', lines = ''
  for (let i = 0; i <= leaves; i++) {
    const t = i / leaves, ang = angleDeg + curl * Math.sin(t * Math.PI) * (random() < .5 ? -1 : 1) * .5
    const r = rotatePt([length * t, 0], ang)
    points.push([x + r[0], y + r[1]])
  }
  lines += curveD(points)
  for (let i = 1; i <= leaves; i++) {
    const p = points[i], side = i % 2 ? 1 : -1
    const scale = 1 - .35 * (i / leaves)
    const l = leaf(p[0], p[1], leafLen * scale, leafWidth * scale, angleDeg + side * between(random, 45, 80), { kind, veins: 1, side })
    shape += l.shape
    lines += l.veinsD
  }
  return { shape, lines: path(lines) }
}
/** Flower pot: rim band plus tapered body. Returns closed silhouette and interior lines. */
export function pot(cx, y, topW, h, { bottomW = topW * .72, rim = .18, lip = 1.08, feet = false } = {}) {
  const rimH = h * rim, rw = topW * lip
  const shape = polyD([[cx - rw / 2, y], [cx + rw / 2, y], [cx + rw / 2, y + rimH], [cx + topW / 2, y + rimH], [cx + bottomW / 2, y + h], [cx - bottomW / 2, y + h], [cx - topW / 2, y + rimH], [cx - rw / 2, y + rimH]])
  let lines = lineD(cx - topW / 2, y + rimH, cx + topW / 2, y + rimH) + arcD(cx - rw / 2 + 3, y + 2, cx + rw / 2 - 3, y + 2, rw / 2, 4, 0, 0)
  if (feet) lines += lineD(cx - bottomW / 2 + 3, y + h, cx - bottomW / 2 + 3, y + h + 4) + lineD(cx + bottomW / 2 - 3, y + h, cx + bottomW / 2 - 3, y + h + 4)
  return { d: shape, shape: path(shape), lines: path(lines), top: y, bottom: y + h, soil: [cx, y + rimH * .6] }
}
/** Window frame with mullions; optional round arch height. Returns { frame, panes } element strings and the outline d. */
export function windowFrame(x, y, w, h, { cols = 2, rows = 2, arch = 0, frame = 9, sill = 0 } = {}) {
  const outer = arch ? `M${fmt(x)} ${fmt(y + h)}V${fmt(y + arch)}A${fmt(w / 2)} ${fmt(arch)} 0 0 1 ${fmt(x + w)} ${fmt(y + arch)}V${fmt(y + h)}Z` : rectD(x, y, w, h)
  const ix = x + frame, iy = y + frame, iw = w - frame * 2, ih = h - frame * 2
  const inner = arch ? `M${fmt(ix)} ${fmt(iy + ih)}V${fmt(iy + arch)}A${fmt(iw / 2)} ${fmt(Math.max(1, arch - frame))} 0 0 1 ${fmt(ix + iw)} ${fmt(iy + arch)}V${fmt(iy + ih)}Z` : rectD(ix, iy, iw, ih)
  let panes = ''
  for (let c = 1; c < cols; c++) panes += lineD(ix + iw * c / cols, iy + (arch ? arch * .2 : 0), ix + iw * c / cols, iy + ih)
  for (let r = 1; r < rows; r++) panes += lineD(ix, iy + arch + (ih - arch) * r / rows, ix + iw, iy + arch + (ih - arch) * r / rows)
  if (sill) panes += rectD(x - sill, y + h, w + sill * 2, sill * .9)
  return { d: outer, frame: path(outer + inner), panes: path(panes) }
}
/** Scalloped crown for trees and bushes: polar blob with lobes. Returns d. */
export function canopyD(cx, cy, rx, ry, random, { lobes = 11, depth = .13, steps = 44 } = {}) {
  const points = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2
    const k = 1 - depth * Math.abs(Math.sin(lobes * t / 2)) + (random() - .5) * .06
    points.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k])
  }
  return curveD(points, { close: true, tension: .9 })
}
/** Small leaf-cluster squiggles scattered inside an ellipse, to texture a canopy or bush. */
export function foliageD(cx, cy, rx, ry, random, { count = 40, size = 9 } = {}) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const t = random() * Math.PI * 2, r = Math.sqrt(random()) * .9
    const x = cx + Math.cos(t) * rx * r, y = cy + Math.sin(t) * ry * r, s = size * (.6 + random() * .8)
    d += `M${fmt(x - s / 2)} ${fmt(y)}q${fmt(s * .25)} ${fmt(-s * .5)} ${fmt(s / 2)} 0q${fmt(s * .25)} ${fmt(-s * .5)} ${fmt(s / 2)} 0`
  }
  return d
}
/** Cloud outline: overlapping puffs along the top over a soft base. */
export function cloudD(cx, cy, w, h, random, { bumps = 5 } = {}) {
  const left = cx - w / 2, right = cx + w / 2, base = cy + h / 2
  let d = `M${fmt(left)} ${fmt(base - h * .25)}`
  for (let i = 0; i < bumps; i++) {
    const x0 = left + w * i / bumps, x1 = left + w * (i + 1) / bumps
    const lift = (i === 0 || i === bumps - 1) ? .35 : .55 + random() * .45
    const y1 = i === bumps - 1 ? base - h * .25 : base - h * lift * .5
    const r = (x1 - x0) / 2 * (1.05 + random() * .2) + h * lift * .3
    d += `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x1)} ${fmt(y1)}`
  }
  d += `Q${fmt(right)} ${fmt(base)} ${fmt(cx + w * .3)} ${fmt(base)}Q${fmt(cx)} ${fmt(base + h * .08)} ${fmt(left + w * .2)} ${fmt(base)}Q${fmt(left)} ${fmt(base)} ${fmt(left)} ${fmt(base - h * .25)}Z`
  return d
}
/** Grass tufts: curved blades at a base point. */
export function grassD(x, y, count, random, { height = 16, spread = 18 } = {}) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const bx = x + (random() - .5) * spread, h = height * (.6 + random() * .7), lean = (random() - .5) * h
    d += `M${fmt(bx)} ${fmt(y)}Q${fmt(bx + lean * .3)} ${fmt(y - h * .6)} ${fmt(bx + lean)} ${fmt(y - h)}`
  }
  return d
}
/** Folds on fabric: a few soft curves fanning out from an anchor. */
export function foldsD(x, y, length, angleDeg, count, random, { spread = 30 } = {}) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = angleDeg + (i - (count - 1) / 2) * spread / Math.max(1, count - 1) + (random() - .5) * 6
    const end = rotatePt([length * (.7 + random() * .3), 0], a)
    const ctrl = rotatePt([length * .5, (random() - .5) * length * .3], a)
    d += `M${fmt(x)} ${fmt(y)}Q${fmt(x + ctrl[0])} ${fmt(y + ctrl[1])} ${fmt(x + end[0])} ${fmt(y + end[1])}`
  }
  return d
}
/** Wood grain: wavy lines along a board between two long edges. */
export function grainD(p1, p2, q1, q2, count, random) {
  let d = ''
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1), a = lerpPt(p1, q1, t), b = lerpPt(p2, q2, t)
    const points = []
    for (let k = 0; k <= 4; k++) { const m = lerpPt(a, b, k / 4); points.push([m[0] + (random() - .5) * 2, m[1] + (random() - .5) * 2]) }
    d += curveD(points)
  }
  return d
}
