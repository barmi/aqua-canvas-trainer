// Narrow old-town alley in one-point perspective: a layered pen drawing for the watercolor trainer.
// Contract: scripts/scene-svg.mjs. Only rng(seed) randomness; every coordinate is absolute in the 1000 x 760 canvas.
import { path, lineD, polyD, curveD, ellipseD, arcD, rng, between, lerpPt, hull, hatchD, bricksD, cloudD, foliageD, canopyD, leaf, sprig } from './helpers.mjs'

const FR = { x0: 55, y0: 55, x1: 945, y1: 705 }
const VP = [500, 335], EYE = 334, F = 445
// Real space: u lateral (-F = left wall ... +F = right wall), H height above the street (EYE = eye level), z depth (1 = picture plane).
const sx = (u, z) => VP[0] + u / z
const sy = (H, z) => VP[1] + (EYE - H) / z
const P = (u, H, z) => [sx(u, z), sy(H, z)]
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const clampPts = (pts, m = 0) => pts.map(([x, y]) => [clamp(x, FR.x0 + m, FR.x1 - m), clamp(y, FR.y0 + m, FR.y1 - m)])
/** Consistent winding (visually counter-clockwise, like ellipseD and leaf outlines) so overlapping subpaths union instead of cancelling. */
const orient = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1 } return a > 0 ? [...pts].reverse() : pts }
const polyO = pts => polyD(orient(pts))
const cpoly = pts => polyO(clampPts(pts))
const curveO = (pts, opts) => curveD(orient(pts), opts)
function canopyO(cx, cy, rx, ry, random, { lobes = 11, depth = .13, steps = 44 } = {}) {
  const pts = []
  for (let i = 0; i < steps; i++) { const t = i / steps * Math.PI * 2, k = 1 - depth * Math.abs(Math.sin(lobes * t / 2)) + (random() - .5) * .06; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]) }
  return curveO(pts, { close: true, tension: .9 })
}
const zTop = (H, y) => (H - EYE) / (VP[1] - y)

/** Hand-drawn polyline: long segments are subdivided and the inner vertices nudged a little. */
function hd(points, random, amp = .9, close = false) {
  if (close) points = orient(points)
  const n = points.length, segs = close ? n : n - 1, out = [points[0]]
  for (let i = 0; i < segs; i++) {
    const a = points[i], b = points[(i + 1) % n]
    const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 38))
    for (let j = 1; j < k; j++) { const p = lerpPt(a, b, j / k); out.push([p[0] + (random() - .5) * 2 * amp, p[1] + (random() - .5) * 2 * amp]) }
    if (!close || i < segs - 1) out.push(b)
  }
  return polyD(out, close)
}
const hl = (a, b, random, amp = .7) => hd([a, b], random, amp)
const L = { heavy: '', medium: '', fine: '', eh: '', em: '', ef: '' }
const mk = () => ({ ...L })
const add = (into, from) => { for (const k of Object.keys(L)) into[k] += from[k] ?? '' }
const wrap = lines => ({ heavy: path(lines.heavy) + (lines.eh ?? ''), medium: path(lines.medium) + (lines.em ?? ''), fine: path(lines.fine) + (lines.ef ?? '') })
/** Small v-shaped bird. */
const birdD = (x, y, s) => `M${(x - s).toFixed(1)} ${y}Q${(x - s / 2).toFixed(1)} ${(y - s * .6).toFixed(1)} ${x} ${(y + s * .1).toFixed(1)}Q${(x + s / 2).toFixed(1)} ${(y - s * .6).toFixed(1)} ${(x + s).toFixed(1)} ${y}`

// ---------- the four walls ----------
const EAVES = { A: 1046, B: 979, C: 1090, D: 935 }
const Z = { A: [1, 2.6], B: [2.6, 7.4], C: [1, 2.3], D: [2.3, 7.4] }
const ZF = 7.4
const XE0 = sx(-F, ZF), XE1 = sx(F, ZF), YE = sy(0, ZF)
const roofA0 = P(-F, EAVES.A, zTop(EAVES.A, FR.y0))
const leftSil = [[FR.x0, FR.y0], roofA0, P(-F, EAVES.A, 2.6), P(-F, EAVES.B, 2.6), P(-F, EAVES.B, ZF), [XE0, YE], P(-F, 0, 1)]
const rightSil = [[FR.x1, FR.y0], [sx(F, 2.3), FR.y0], P(F, EAVES.D, 2.3), P(F, EAVES.D, ZF), [XE1, YE], P(F, 0, 1)]
// far facade top edge (left to right): hip roof band, bell tower, chimney
const E_TOP = [[XE0, 262], [458, 244], [462, 244], [462, 190], [477, 150], [492, 190], [492, 244], [519, 244], [519, 220], [531, 220], [531, 244], [542, 244], [XE1, 262]]
const farSil = [[XE0, YE], ...E_TOP, [XE1, YE]]
const skySil = [roofA0, P(-F, EAVES.A, 2.6), P(-F, EAVES.B, 2.6), P(-F, EAVES.B, ZF), ...E_TOP, P(F, EAVES.D, ZF), P(F, EAVES.D, 2.3), [sx(F, 2.3), FR.y0]]
const roadSil = [P(-F, 0, 1), [XE0, YE], [XE1, YE], P(F, 0, 1), [FR.x1, FR.y1], [FR.x0, FR.y1]]

// ---------- sky ----------
function sky() {
  const random = rng(11), lines = mk()
  lines.medium += cloudD(530, 98, 130, 38, random, { bumps: 5 })
  lines.fine += `M470 110q18 -8 36 0M520 113q14 -6 28 0`
  lines.medium += cloudD(615, 180, 60, 18, random, { bumps: 3 })
  for (const [x, y, s] of [[395, 100, 7], [425, 82, 6], [452, 110, 5], [604, 94, 6]]) lines.medium += birdD(x, y, s)
  return { id: 'sky', silhouette: path(hd(skySil, random, .6, true)), lines: wrap(lines) }
}

// ---------- far facade (frontal) ----------
function farFacade() {
  const random = rng(23), lines = mk()
  const x0 = XE0, x1 = XE1
  // roof band with tile courses, tower and chimney structure
  lines.heavy += hl([x0, 262], [x1, 262], random, .5)
  lines.medium += lineD(x0 + 4, 256, x1 - 4, 256) + lineD(x0 + 10, 250, x1 - 10, 250)
  for (let x = x0 + 6; x < x1 - 4; x += 7) lines.fine += lineD(x, 262, x + 1.5, 250 + (x % 14 > 6 ? 2 : 0))
  lines.medium += lineD(462, 190, 492, 190) + lineD(464, 196, 490, 196) + lineD(477, 150, 477, 190)
  lines.fine += lineD(469, 172, 471, 190) + lineD(485, 172, 483, 190) + lineD(464, 213, 490, 213) + lineD(464, 232, 490, 232)
  lines.medium += `M472 216V204A5 5 0 0 1 482 204V216Z` + lineD(519, 226, 531, 226) + lineD(521, 220, 521, 215) + lineD(529, 220, 529, 215) + lineD(521, 215, 529, 215)
  lines.fine += hatchD([[472, 204], [482, 204], [482, 216], [472, 216]], 50, 5)
  // string course and a band of shadow under the eaves
  lines.medium += hl([x0, 310], [x1, 310], random, .4)
  lines.fine += hatchD([[x0 + 1, 263], [x1 - 1, 263], [x1 - 1, 274], [x0 + 1, 274]], 0, 5)
  // first-floor windows
  for (const wx of [452, 491, 530]) {
    lines.medium += polyD([[wx, 276], [wx + 18, 276], [wx + 18, 304], [wx, 304]]) + lineD(wx + 9, 276, wx + 9, 304) + lineD(wx, 290, wx + 18, 290) + lineD(wx - 2, 305, wx + 20, 305)
    lines.fine += hatchD([[wx + 1, 277], [wx + 17, 277], [wx + 17, 289], [wx + 1, 289]], 55, 5)
  }
  // ground floor: door with arch, two windows
  lines.heavy += `M490 380V330A11 11 0 0 1 512 330V380`
  lines.medium += lineD(501, 322, 501, 380) + lineD(492, 350, 510, 350)
  lines.fine += hatchD([[491, 330], [511, 330], [511, 379], [491, 379]], 55, 5)
  for (const wx of [452, 530]) {
    lines.medium += polyD([[wx, 320], [wx + 18, 320], [wx + 18, 348], [wx, 348]]) + lineD(wx + 9, 320, wx + 9, 348) + lineD(wx, 334, wx + 18, 334) + lineD(wx - 2, 349, wx + 20, 349)
    lines.fine += hatchD([[wx + 1, 321], [wx + 17, 321], [wx + 17, 333], [wx + 1, 333]], 55, 5)
  }
  // stone patches at the corners
  lines.fine += bricksD(x0 + 1, 352, 22, 27, 12, 6.5, random, { keep: .7 }) + bricksD(x1 - 25, 318, 24, 24, 12, 6.5, random, { keep: .7 })
  return { id: 'far-facade', silhouette: path(hd(farSil, random, .5, true)), lines: wrap(lines) }
}

// ---------- wall elements (side = -1 left wall, +1 right wall) ----------
const seg = (a, b) => lineD(a[0], a[1], b[0], b[1])
/** Screen spacing for a real spacing at depth z, never below 5px. */
const sp = (real, z) => Math.max(5, real / z)

/** Window in the wall plane with frame, panes, glass hatch, sill, open shutters and an optional flower box. */
function wallWindow(side, z1, z2, H1, H2, random, { cols = 2, rows = 3, shutters = true, box = false, sill = true } = {}) {
  const lines = mk(), Q = (z, H) => P(side * F, H, z), ud = side * (F - 14)
  lines.heavy += hd([Q(z1, H2), Q(z2, H2), Q(z2, H1), Q(z1, H1)], random, .5, true)
  const fz = (z2 - z1) * .09, fH = (H2 - H1) * .05, iz1 = z1 + fz, iz2 = z2 - fz, iH1 = H1 + fH, iH2 = H2 - fH, zm = (z1 + z2) / 2
  lines.medium += polyD([Q(iz1, iH2), Q(iz2, iH2), Q(iz2, iH1), Q(iz1, iH1)])
  for (let c = 1; c < cols; c++) { const zc = iz1 + (iz2 - iz1) * c / cols; lines.medium += seg(Q(zc, iH2), Q(zc, iH1)) }
  for (let r = 1; r < rows; r++) { const Hr = iH1 + (iH2 - iH1) * r / rows; lines.medium += seg(Q(iz1, Hr), Q(iz2, Hr)) }
  const Hg = iH1 + (iH2 - iH1) * .45
  lines.fine += hatchD([Q(iz1, iH2), Q(iz2, iH2), Q(iz2, Hg), Q(iz1, Hg)], side < 0 ? 62 : 118, sp(19, zm), { inset: 1.5 })
  if (sill) {
    const s = (z2 - z1) * .12
    lines.medium += polyD([Q(z1 - s, H1), Q(z2 + s, H1), P(ud, H1, z2 + s), P(ud, H1, z1 - s)])
    lines.medium += seg(P(ud, H1 - 9, z1 - s), P(ud, H1 - 9, z2 + s)) + seg(P(ud, H1, z1 - s), P(ud, H1 - 9, z1 - s)) + seg(P(ud, H1, z2 + s), P(ud, H1 - 9, z2 + s))
  }
  if (shutters) {
    const sw = (z2 - z1) * .5, Hm = (H1 + H2) / 2, step = Math.max(16, 5.5 * zm)
    for (const [a, b] of [[z1 - sw, z1], [z2, z2 + sw]]) {
      if (Math.min(sx(side * F, a), sx(side * F, b)) < FR.x0 + 2 || Math.max(sx(side * F, a), sx(side * F, b)) > FR.x1 - 2 || Math.min(sy(H2, a), sy(H2, b)) < FR.y0 + 3) continue
      lines.medium += polyD([Q(a, H2), Q(b, H2), Q(b, H1), Q(a, H1)]) + seg(Q(a, Hm - 7), Q(b, Hm - 7)) + seg(Q(a, Hm + 7), Q(b, Hm + 7))
      for (let H = H1 + 12; H < H2 - 8; H += step) if (Math.abs(H - Hm) > 12) lines.fine += seg(Q(a + (b - a) * .12, H), Q(b - (b - a) * .12, H))
    }
  }
  let plant = ''
  if (box) {
    const d = 24, bz1 = z1 + (z2 - z1) * .04, bz2 = z2 - (z2 - z1) * .04, ub = side * (F - d)
    lines.heavy += polyD([P(ub, H1 - 8, bz1), P(ub, H1 - 8, bz2), P(ub, H1 - 34, bz2), P(ub, H1 - 34, bz1)])
    lines.medium += seg(Q(bz1, H1 - 8), P(ub, H1 - 8, bz1)) + seg(Q(bz2, H1 - 8), P(ub, H1 - 8, bz2)) + seg(Q(bz1, H1 - 34), P(ub, H1 - 34, bz1))
    lines.fine += seg(P(ub, H1 - 17, bz1), P(ub, H1 - 17, bz2)) + seg(P(ub, H1 - 26, bz1), P(ub, H1 - 26, bz2))
    const c1 = P(side * (F - d / 2), H1 + 12, bz1), c2 = P(side * (F - d / 2), H1 + 12, bz2), cx = (c1[0] + c2[0]) / 2, cy = (c1[1] + c2[1]) / 2, rx = Math.abs(c2[0] - c1[0]) / 2 + 4 / zm
    lines.fine += foliageD(cx, cy, rx, 16 / zm, random, { count: Math.round(rx * 1.2), size: sp(7, zm) })
    for (let i = 0; i < 5; i++) { const fx = cx - rx * .8 + rx * 1.6 * i / 4 + (random() - .5) * 4, fy = cy - 10 / zm + (random() - .5) * 8; const r = sp(3, zm) * .8; lines.medium += `M${fx - r} ${fy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0` }
    plant = path(polyD([Q(bz1, H1 + 36), Q(bz2, H1 + 36), P(ub, H1 - 8, bz2), P(ub, H1 - 8, bz1)]))
  }
  return { lines, plant }
}

/** Arched plank door in the wall plane, with reveal, rails, hinges, ring handle and a stone step. */
function archDoor(side, z1, z2, H, random, { planks = 5, stepD = 22 } = {}) {
  const lines = mk(), Q = (z, HH) => P(side * F, HH, z)
  const zc = (z1 + z2) / 2, rz = (z2 - z1) / 2, rH = rz * 890, Hs = H - rH, rin = rz * .12
  const arch = (r, rr) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = Math.PI * i / 12; pts.push(Q(zc - r * Math.cos(t), Hs + rr * Math.sin(t))) } return pts }
  lines.heavy += hd([Q(z1, 0), Q(z1, Hs)], random, .5) + curveD(arch(rz, rH), { tension: .8 }) + hd([Q(z2, Hs), Q(z2, 0)], random, .5)
  lines.medium += curveD(arch(rz - rin, rH - rin * 890), { tension: .8 }) + seg(Q(z1 + rin, 0), Q(z1 + rin, Hs)) + seg(Q(z2 - rin, 0), Q(z2 - rin, Hs))
  const ia = z1 + rin, ib = z2 - rin, rr = rH - rin * 890
  for (let i = 1; i < planks; i++) {
    const z = ia + (ib - ia) * i / planks, Ha = Hs + Math.sqrt(Math.max(0, rr * rr - ((z - zc) * 890) ** 2))
    lines.medium += seg(Q(z, 4), Q(z, Ha - 1))
    if ((ib - ia) / planks * 445 / (zc * zc) > 8) lines.fine += curveD([Q(z - (ib - ia) / planks * .5, 30), Q(z - (ib - ia) / planks * .42, 120), Q(z - (ib - ia) / planks * .55, 220), Q(z - (ib - ia) / planks * .48, 310)])
  }
  lines.medium += seg(Q(ia, 70), Q(ib, 70)) + seg(Q(ia, 300), Q(ib, 300))
  const hz = z1 + (z2 - z1) * .78, hr = Math.max(2.5, 6 / zc), hp = Q(hz, 200)
  lines.medium += `M${(hp[0] - hr).toFixed(1)} ${hp[1].toFixed(1)}a${hr} ${hr} 0 1 0 ${2 * hr} 0a${hr} ${hr} 0 1 0 ${-2 * hr} 0`
  lines.fine += seg(Q(ia, 92), Q(ia + (ib - ia) * .3, 86)) + seg(Q(ia, 282), Q(ia + (ib - ia) * .3, 276)) + seg(Q(ia, 70), Q(ia, 92)) + seg(Q(ia, 300), Q(ia, 282))
  // step: top face plus front face, outer edge in front of the wall
  const s = (z2 - z1) * .08, us = side * (F - stepD)
  const step = [Q(z1 - s, 12), Q(z2 + s, 12), P(us, 12, z2 + s), P(us, 0, z2 + s), P(us, 0, z1 - s), Q(z1 - s, 0)]
  lines.medium += seg(P(us, 12, z1 - s), P(us, 12, z2 + s)) + seg(P(us, 12, z1 - s), P(us, 0, z1 - s))
  lines.fine += seg(Q(z1 - s, 6), P(us, 6, z1 - s))
  return { lines, step: polyO(step), footprint: [Q(z1 - s, 0), Q(z2 + s, 0), P(us, 0, z2 + s), P(us, 0, z1 - s)] }
}

/** Stone courses on a wall patch; ragged edges because course ends and joints are skipped at random. */
function wallBricks(side, z1, z2, H1, H2, random, { rowH = 30, keep = .55 } = {}) {
  let d = ''
  H2 = Math.min(H2, EYE + (VP[1] - FR.y0 - 4) * z1)
  H1 = Math.max(H1, EYE - (FR.y1 - 4 - VP[1]) * z1)
  const Q = (z, H) => P(side * F, H, z), rows = Math.floor((H2 - H1) / rowH)
  for (let j = 0; j <= rows; j++) {
    const H = H1 + j * rowH, za = z1 + (z2 - z1) * random() * .18, zb = z2 - (z2 - z1) * random() * .18
    if (j > 0 && j < rows && random() < .85) d += seg(Q(za, H), Q(zb, H))
    if (j === rows) break
    const n = Math.max(2, Math.round((z2 - z1) / .075))
    for (let k = 0; k <= n; k++) {
      const z = z1 + (z2 - z1) * (k + (j % 2) * .5) / n
      if (z <= za || z >= zb || random() > keep || rowH / z < 5) continue
      d += seg(Q(z, H), Q(z, H + rowH))
    }
  }
  return d
}

/** Small lantern on an iron bracket beside a door. */
function lantern(side, z, H, random) {
  const lines = mk(), u = side * F, uo = side * (F - 38)
  lines.medium += seg(P(u, H, z), P(uo, H, z)) + curveD([P(u, H - 36, z), P(side * (F - 14), H - 26, z), P(side * (F - 30), H - 3, z)])
  const cx = sx(uo, z), top = sy(H - 4, z), w = 30 / z, h = 52 / z
  lines.heavy += polyD([[cx - w * .3, top], [cx + w * .3, top], [cx + w / 2, top + h * .22], [cx + w / 2, top + h * .84], [cx, top + h], [cx - w / 2, top + h * .84], [cx - w / 2, top + h * .22]])
  lines.medium += lineD(cx - w / 2, top + h * .22, cx + w / 2, top + h * .22) + lineD(cx - w * .16, top + h * .22, cx - w * .16, top + h * .84) + lineD(cx + w * .16, top + h * .22, cx + w * .16, top + h * .84) + lineD(cx, top, cx, top - 6 / z) + lineD(cx - w / 2, top + h * .84, cx + w / 2, top + h * .84)
  lines.fine += hatchD([[cx - w / 2 + 1, top + h * .22], [cx - w * .16, top + h * .22], [cx - w * .16, top + h * .84], [cx - w / 2 + 1, top + h * .84]], 60, 5)
  return lines
}

/** Hanging shop sign on an iron bracket: a frontal plate perpendicular to the wall. */
function shopSign(side, z, H, random) {
  const lines = mk(), u = side * F
  lines.medium += seg(P(u, H + 70, z), P(side * (F - 108), H + 70, z)) + seg(P(u, H + 18, z), P(side * (F - 76), H + 70, z))
  lines.fine += curveD([P(side * (F - 108), H + 70, z), P(side * (F - 104), H + 62, z), P(side * (F - 96), H + 66, z)]) + curveD([P(side * (F - 50), H + 70, z), P(side * (F - 54), H + 80, z), P(side * (F - 62), H + 76, z)])
  const x0 = sx(side * (F - 20), z), x1 = sx(side * (F - 100), z), y0 = sy(H + 58, z), y1 = sy(H, z)
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), w = xb - xa, h = y1 - y0
  lines.medium += lineD(xa + w * .2, sy(H + 70, z), xa + w * .2, y0) + lineD(xb - w * .2, sy(H + 70, z), xb - w * .2, y0)
  const plate = curveD([[xa, y0], [xa + w / 2, y0 - 3 / z], [xb, y0], [xb + 2 / z, y0 + h / 2], [xb, y1], [xa + w / 2, y1 + 3 / z], [xa, y1], [xa - 2 / z, y0 + h / 2]], { close: true, tension: .9 })
  lines.heavy += plate
  lines.medium += polyD([[xa + 4, y0 + 4], [xb - 4, y0 + 4], [xb - 4, y1 - 4], [xa + 4, y1 - 4]])
  const cx = (xa + xb) / 2, cy = (y0 + y1) / 2 + 2
  lines.medium += `M${(cx - 9).toFixed(1)} ${(cy - 6).toFixed(1)}h18l-3 13h-12Z` + ellipseD(cx, cy - 6, 9, 2.5) + `M${(cx + 9).toFixed(1)} ${(cy - 2).toFixed(1)}q7 0 6 5q-1 4 -6 4`
  lines.fine += hatchD([[xa + 4, y0 + 4], [xb - 4, y0 + 4], [xb - 4, y1 - 4], [xa + 4, y1 - 4]], 45, 5, { inset: 1 }).replace(/M[^M]*/g, m => (random() < .5 ? m : ''))
  return lines
}

/** Scalloped awning projecting from the wall over a window. */
function awning(side, z1, z2, Hin, Hout, d, random) {
  const lines = mk(), u = side * F, uo = side * (F - d)
  const inA = P(u, Hin, z1), inB = P(u, Hin, z2), outB = P(uo, Hout, z2), outA = P(uo, Hout, z1)
  lines.heavy += hd([inA, inB], random, .5) + hd([inB, outB], random, .5) + hd([outA, inA], random, .5)
  const n = 7
  for (let i = 1; i < n; i++) { const z = z1 + (z2 - z1) * i / n; lines.medium += seg(P(u, Hin, z), P(uo, Hout, z)) }
  // scalloped valance along the outer edge and the near end
  const scallop = (a, b, count, drop) => { const pts = [a]; for (let i = 0; i < count; i++) { const m = lerpPt(a, b, (i + .5) / count), e = lerpPt(a, b, (i + 1) / count); pts.push([m[0], m[1] + drop], e) } return 'M' + pts.map((p, i) => (i ? (i % 2 ? 'Q' : ' ') : '') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') }
  lines.heavy += scallop(outA, outB, n, 11) + scallop(inA, outA, 3, 9)
  lines.medium += seg(outA, [outA[0], outA[1] + 9]) + seg(outB, [outB[0], outB[1] + 9])
  lines.fine += hatchD([inA, inB, P(u, Hin - 30, z2), P(u, Hin - 30, z1)], 45, 6)
  return lines
}

/** Balcony slab with an iron railing and the tall shuttered window behind it. */
function balcony(side, z1, z2, Hf, Hr, d, random) {
  const lines = mk(), u = side * F, uo = side * (F - d), ur = side * (F - d + 5)
  // slab: outer face along z plus the two end faces
  lines.heavy += hd([P(uo, Hf, z1), P(uo, Hf, z2)], random, .5) + hd([P(uo, Hf - 22, z1), P(uo, Hf - 22, z2)], random, .5)
  lines.heavy += seg(P(u, Hf, z1), P(uo, Hf, z1)) + seg(P(u, Hf - 22, z1), P(uo, Hf - 22, z1)) + seg(P(uo, Hf, z1), P(uo, Hf - 22, z1)) + seg(P(uo, Hf, z2), P(uo, Hf - 22, z2)) + seg(P(u, Hf, z2), P(uo, Hf, z2))
  lines.fine += hatchD([P(uo, Hf - 22, z1), P(uo, Hf - 22, z2), P(u, Hf - 22, z2), P(u, Hf - 70, z2), P(u, Hf - 70, z1)], 40, 6)
  for (let i = 1; i < 4; i++) { const z = z1 + (z2 - z1) * i / 4; lines.fine += seg(P(u, Hf - 22, z), P(uo, Hf - 22, z)) }
  // railing: posts, three rails, balusters, curls
  const posts = 6
  for (let i = 0; i <= posts; i++) { const z = z1 + (z2 - z1) * i / posts; lines.medium += seg(P(ur, Hf, z), P(ur, Hr + 6, z)) }
  for (const H of [Hr, Hr - 60, Hf + 8]) lines.medium += seg(P(ur, H, z1), P(ur, H, z2))
  for (let i = 0; i < posts; i++) for (const f of [.33, .66]) { const z = z1 + (z2 - z1) * (i + f) / posts; lines.fine += seg(P(ur, Hf + 8, z), P(ur, Hr, z)) }
  for (let i = 0; i < posts; i++) { const za = z1 + (z2 - z1) * (i + .15) / posts, zb = z1 + (z2 - z1) * (i + .85) / posts; lines.fine += curveD([P(ur, Hr - 60, za), P(ur, Hr - 36, (za + zb) / 2), P(ur, Hr - 60, zb)]) }
  // end rails (frontal) at both ends
  for (const z of [z1, z2]) { lines.medium += seg(P(u, Hr, z), P(ur, Hr, z)) + seg(P(u, Hf + 8, z), P(ur, Hf + 8, z)); for (const f of [.3, .55, .8]) lines.fine += seg(P(side * (F - (d - 5) * f), Hf + 8, z), P(side * (F - (d - 5) * f), Hr, z)) }
  return lines
}

/** Arched passage through the right building with three steps spilling onto the street and a cat on the top step. */
function passage(side, z1, z2, H, random) {
  const lines = mk(), Q = (z, HH) => P(side * F, HH, z)
  const zc = (z1 + z2) / 2, rz = (z2 - z1) / 2, rH = rz * 890, Hs = H - rH
  const arch = (r, rr, base) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = Math.PI * i / 12; pts.push(Q(zc - r * Math.cos(t), base + rr * Math.sin(t))) } return pts }
  const floor = 42
  lines.heavy += seg(Q(z1, floor), Q(z1, Hs)) + curveD(arch(rz, rH, Hs), { tension: .8 }) + seg(Q(z2, Hs), Q(z2, floor))
  const rin = rz * .14
  lines.medium += curveD(arch(rz + rin, rH + rin * 890, Hs), { tension: .8 }) + seg(Q(z1 - rin, floor), Q(z1 - rin, Hs)) + seg(Q(z2 + rin, floor), Q(z2 + rin, Hs))
  for (let i = 0; i < 7; i++) { const t = Math.PI * (i + .5) / 7; lines.fine += seg(Q(zc - rz * Math.cos(t), Hs + rH * Math.sin(t)), Q(zc - (rz + rin) * Math.cos(t), Hs + (rH + rin * 890) * Math.sin(t))) }
  // dark interior with a hint of a far wall and a lamp glow left white
  const inner = [...arch(rz * .96, rH * .96, Hs), Q(z2 - rz * .04, floor), Q(z1 + rz * .04, floor)]
  lines.fine += hatchD(inner, 58, sp(15, zc), { inset: 2 }) + hatchD([...arch(rz * .96, rH * .96, Hs), Q(z2 - rz * .04, Hs + rH * .3), Q(z1 + rz * .04, Hs + rH * .3)], 58, sp(15, zc), { inset: 2, phase: sp(15, zc) / 2 })
  lines.medium += seg(Q(z1 + rz * .5, floor), Q(z1 + rz * .5, floor + 180)) + seg(Q(z1 + rz * .5, floor + 180), Q(z2, floor + 180))
  // steps
  const steps = [], footprint = []
  let sil = ''
  for (let i = 0; i < 3; i++) {
    const top = floor - 14 * i, Ht = top, Hb = top - 14, ui = side * (F - 24 * i), uo = side * (F - 24 * (i + 1)), s = rz * .15
    const za = z1 - s, zb = z2 + s
    lines.medium += seg(P(ui, Ht, za), P(uo, Ht, za)) + seg(P(ui, Ht, zb), P(uo, Ht, zb)) + seg(P(uo, Ht, za), P(uo, Ht, zb)) + seg(P(uo, Hb, za), P(uo, Hb, zb)) + seg(P(uo, Ht, za), P(uo, Hb, za))
    lines.fine += seg(P(ui, Ht - 5, za), P(uo, Ht - 5, za)) + hatchD([P(uo, Ht, za), P(uo, Ht, zb), P(uo, Hb, zb), P(uo, Hb, za)], 0, 5, { inset: 1 }).replace(/M[^M]*/g, m => (random() < .4 ? m : ''))
    if (i === 2) { sil = polyO([Q(za, Ht), Q(zb, Ht), P(uo, Ht, zb), P(uo, 0, zb), P(uo, 0, za), Q(za, 0)]); footprint.push(Q(za, 0), Q(zb, 0), P(uo, 0, zb), P(uo, 0, za)) }
  }
  return { lines, sil, footprint, floor, zc, rz }
}

/** Downpipe on a wall: twin lines, collars, and a shoe curving onto the street. */
function drainpipe(side, z, Htop, random) {
  const lines = mk(), u = side * (F - 7), x = sx(u, z), w = Math.max(4, 6 / z), yTop = Math.max(FR.y0 + 1, sy(Htop, z)), yBot = sy(26, z)
  lines.medium += hd([[x - w / 2, yTop], [x - w / 2, yBot]], random, .5) + hd([[x + w / 2, yTop], [x + w / 2, yBot]], random, .5)
  for (const H of [120, 420, 720, 1000]) { const y = sy(H, z); if (y > yTop + 4 && y < yBot - 4) lines.medium += polyD([[x - w / 2 - 2, y - 2], [x + w / 2 + 2, y - 2], [x + w / 2 + 2, y + 3], [x - w / 2 - 2, y + 3]]) }
  const uo = side * (F - 7 - 26)
  lines.medium += curveD([[x - w / 2, yBot], P(u, 10, z), P(uo, 2, z)]) + curveD([[x + w / 2, yBot], P(side * (F - 4), 18, z), P(uo, 9, z)]) + seg(P(uo, 2, z), P(uo, 9, z))
  return lines
}

/** Tile course and shadow band under an eave that recedes toward the vanishing point. */
function eaveBand(side, z1, z2, Heave, random) {
  const lines = mk(), Q = (z, H) => P(side * F, H, z)
  lines.medium += hd([Q(z1, Heave - 22), Q(z2, Heave - 22)], random, .5)
  for (let z = z1; z < z2; z += Math.max(.08, .02 * z * z)) lines.fine += seg(Q(z, Heave - 1), Q(z, Heave - 20))
  const zm = (z1 + z2) / 2
  lines.fine += hatchD([Q(z1, Heave - 23), Q(zm, Heave - 23), Q(zm, Heave - 60), Q(z1, Heave - 60)], 45, sp(18, (z1 + zm) / 2)) + hatchD([Q(zm, Heave - 23), Q(z2, Heave - 23), Q(z2, Heave - 60), Q(zm, Heave - 60)], 45, sp(18, (zm + z2) / 2))
  return lines
}

/** Rectangular double door with a glazed transom, panelled leaves and a step. */
function rectDoor(side, z1, z2, H, random, { stepD = 22 } = {}) {
  const lines = mk(), Q = (z, HH) => P(side * F, HH, z), zc = (z1 + z2) / 2
  lines.heavy += hd([Q(z1, H), Q(z2, H), Q(z2, 0), Q(z1, 0)], random, .5, true)
  const rin = (z2 - z1) * .07, ia = z1 + rin, ib = z2 - rin, Ht = H * .86, zm = (ia + ib) / 2
  lines.medium += polyD([Q(ia, H - 8), Q(ib, H - 8), Q(ib, Ht), Q(ia, Ht)]) + seg(Q(ia, Ht - 8), Q(ib, Ht - 8))
  for (let c = 1; c < 3; c++) lines.medium += seg(Q(ia + (ib - ia) * c / 3, H - 8), Q(ia + (ib - ia) * c / 3, Ht))
  lines.fine += hatchD([Q(ia, H - 8), Q(ib, H - 8), Q(ib, Ht), Q(ia, Ht)], 118, sp(14, zc), { inset: 1.5 })
  lines.medium += seg(Q(zm, Ht - 8), Q(zm, 4)) + seg(Q(ia, Ht - 8), Q(ia, 4)) + seg(Q(ib, Ht - 8), Q(ib, 4))
  for (const [a, b] of [[ia, zm], [zm, ib]]) {
    const pa = a + (b - a) * .2, pb = b - (b - a) * .2, pm = (pa + pb) / 2
    lines.medium += polyD([Q(pa, Ht - 40), Q(pb, Ht - 40), Q(pb, Ht - 175), Q(pa, Ht - 175)]) + polyD([Q(pa, 205), Q(pb, 205), Q(pb, 40), Q(pa, 40)])
    lines.fine += curveD([Q(pm, Ht - 50), Q(pm + (pb - pa) * .08, Ht - 110), Q(pm - (pb - pa) * .06, Ht - 165)]) + curveD([Q(pm, 50), Q(pm - (pb - pa) * .08, 120), Q(pm + (pb - pa) * .06, 195)])
    lines.fine += hatchD([Q(pa, Ht - 40), Q(pb, Ht - 40), Q(pb, Ht - 175), Q(pa, Ht - 175)], 90, sp(26, zc), { inset: 2 }).replace(/M[^M]*/g, m => (random() < .35 ? m : ''))
  }
  const hp = Q(zm - (zm - ia) * .25, 215), hr = Math.max(2.5, 6 / zc)
  lines.medium += `M${(hp[0] - hr).toFixed(1)} ${hp[1].toFixed(1)}a${hr} ${hr} 0 1 0 ${2 * hr} 0a${hr} ${hr} 0 1 0 ${-2 * hr} 0`
  const s = (z2 - z1) * .08, us = side * (F - stepD)
  const step = [Q(z1 - s, 12), Q(z2 + s, 12), P(us, 12, z2 + s), P(us, 0, z2 + s), P(us, 0, z1 - s), Q(z1 - s, 0)]
  lines.medium += seg(P(us, 12, z1 - s), P(us, 12, z2 + s)) + seg(P(us, 12, z1 - s), P(us, 0, z1 - s))
  return { lines, step: polyO(step), footprint: [Q(z1 - s, 0), Q(z2 + s, 0), P(us, 0, z2 + s), P(us, 0, z1 - s)] }
}

// ---------- building rows ----------
function leftBuildings() {
  const random = rng(31), lines = mk(), sils = [hd(leftSil, random, .8, true)], plants = [], footprints = []
  lines.heavy += hl(P(-F, EAVES.B, 2.6), P(-F, 0, 2.6), random, .6)
  add(lines, eaveBand(-1, 2.6, ZF, EAVES.B, random))
  add(lines, drainpipe(-1, 1.03, 1300, random))
  add(lines, drainpipe(-1, 2.64, EAVES.B - 8, random))
  // house A: shop window with awning, arched door with lantern, hanging sign, first-floor window with flower box
  add(lines, wallWindow(-1, 1.1, 1.3, 230, 470, random, { cols: 2, rows: 3 }).lines)
  add(lines, awning(-1, 1.03, 1.34, 500, 466, 72, random))
  const door = archDoor(-1, 1.42, 1.66, 440, random, { planks: 5 })
  add(lines, door.lines); sils.push(door.step); footprints.push({ pts: door.footprint, z: 1.5 })
  add(lines, lantern(-1, 1.36, 548, random))
  add(lines, shopSign(-1, 1.93, 452, random))
  add(lines, ghostSign(-1, 1.05, 1.3, 540, 626, random))
  const w1 = wallWindow(-1, 1.76, 2.1, 575, 775, random, { cols: 2, rows: 3, box: true })
  add(lines, w1.lines); plants.push(w1.plant)
  lines.fine += wallBricks(-1, 1.0, 1.095, 0, 215, random) + wallBricks(-1, 2.3, 2.6, 150, 300, random, { keep: .5 }) + wallBricks(-1, 2.15, 2.5, 850, 1010, random, { keep: .45 })
  // house B: smaller, three windows upstairs, a window and a door downstairs
  add(lines, wallWindow(-1, 2.8, 3.25, 230, 470, random, { cols: 2, rows: 3 }).lines)
  const doorB = archDoor(-1, 3.55, 3.85, 440, random, { planks: 3, stepD: 16 })
  add(lines, doorB.lines); sils.push(doorB.step); footprints.push({ pts: doorB.footprint, z: 3.7 })
  for (const [a, b] of [[2.72, 3.18], [3.62, 4.1], [4.6, 5.3]]) { const w = wallWindow(-1, a, b, 600, 830, random, { cols: 2, rows: 3, box: a < 4 }); add(lines, w.lines); if (w.plant) plants.push(w.plant) }
  add(lines, wallWindow(-1, 5.85, 6.55, 240, 460, random, { cols: 1, rows: 2, shutters: false }).lines)
  add(lines, wallWindow(-1, 5.9, 6.5, 610, 800, random, { cols: 1, rows: 2, shutters: false, sill: false }).lines)
  lines.fine += wallBricks(-1, 2.95, 3.42, 0, 180, random) + wallBricks(-1, 4.2, 4.95, 0, 200, random) + wallBricks(-1, 4.3, 5.2, 480, 580, random, { keep: .4 })
  return { layer: { id: 'left-buildings', silhouette: path(sils.join('')), lines: wrap(lines) }, plants, footprints }
}

function rightBuildings() {
  const random = rng(47), lines = mk(), sils = [hd(rightSil, random, .8, true)], plants = [], footprints = []
  lines.heavy += hl(P(F, EAVES.D, 2.3), P(F, 0, 2.3), random, .6)
  add(lines, eaveBand(1, 2.3, ZF, EAVES.D, random))
  add(lines, drainpipe(1, 2.34, EAVES.D - 8, random))
  // house C: tall shuttered window at the corner, cafe door with transom, balcony above
  add(lines, wallWindow(1, 1.015, 1.1, 230, 480, random, { cols: 2, rows: 3 }).lines)
  const doorC = rectDoor(1, 1.15, 1.4, 460, random)
  add(lines, doorC.lines); sils.push(doorC.step); footprints.push({ pts: doorC.footprint, z: 1.27 })
  add(lines, wallWindow(1, 1.5, 1.85, 505, 730, random, { cols: 2, rows: 4, sill: false, shutters: false }).lines)
  add(lines, balcony(1, 1.45, 1.9, 500, 640, 78, random))
  lines.fine += wallBricks(1, 2.02, 2.28, 0, 230, random) + wallBricks(1, 1.0, 1.07, 520, 700, random, { keep: .45 }) + wallBricks(1, 2.0, 2.28, 760, 900, random, { keep: .4 })
  // house D: arched passage with steps and a cat, upstairs windows, a far small window
  const pass = passage(1, 2.5, 3.05, 520, random)
  add(lines, pass.lines); sils.push(pass.sil); footprints.push({ pts: pass.footprint, z: 2.75 })
  for (const [a, b] of [[2.42, 2.84], [3.3, 3.8], [4.5, 5.2]]) { const w = wallWindow(1, a, b, 600, 820, random, { cols: 2, rows: 3, box: a < 3 }); add(lines, w.lines); if (w.plant) plants.push(w.plant) }
  add(lines, wallWindow(1, 3.4, 3.9, 230, 470, random, { cols: 2, rows: 3 }).lines)
  add(lines, wallWindow(1, 5.7, 6.4, 250, 450, random, { cols: 1, rows: 2, shutters: false }).lines)
  add(lines, wallWindow(1, 5.75, 6.35, 600, 780, random, { cols: 1, rows: 2, shutters: false, sill: false }).lines)
  lines.fine += wallBricks(1, 3.15, 3.5, 0, 200, random) + wallBricks(1, 4.05, 4.6, 0, 170, random) + wallBricks(1, 3.9, 4.6, 500, 590, random, { keep: .4 })
  return { layer: { id: 'right-buildings', silhouette: path(sils.join('')), lines: wrap(lines) }, plants, footprints }
}

// ---------- street ----------
function road() {
  const random = rng(53), lines = mk()
  const zNear = EYE / (FR.y1 - VP[1]), stoneD = .066, perRow = 17
  let row = 0
  for (let z0 = zNear - .02; z0 < 1.9; z0 += stoneD, row++) {
    const z1 = z0 + stoneD, shift = (row % 2) * .5, dz = stoneD * .08
    for (let k = -1; k < perRow; k++) {
      const a = (k + shift) / perRow, b = (k + 1 + shift) / perRow
      if (b <= 0 || a >= 1) continue
      const g = .09 / perRow, u0 = -F + 2 * F * (Math.max(0, a) + g), u1 = -F + 2 * F * (Math.min(1, b) - g)
      const pts = [P(u0, 0, z1 - dz), P(u1, 0, z1 - dz), P(u1, 0, z0 + dz), P(u0, 0, z0 + dz)]
      const c = clampPts(pts.map(([x, y]) => [x + (random() - .5) * 2.2 / z0, y + (random() - .5) * 1.8 / z0]), 5)
      if (Math.abs(c[1][0] - c[0][0]) < 5 || Math.abs(c[0][1] - c[3][1]) < 4) continue
      lines[z0 < 1.12 ? 'medium' : 'fine'] += curveD(c, { close: true, tension: .85 })
      if (random() < .22 && z0 < 1.3) { const m = lerpPt(lerpPt(c[0], c[2], .5), c[3], .3), s = 5 / z0; lines.fine += `M${(m[0] - s).toFixed(1)} ${m[1].toFixed(1)}q${(s * .5).toFixed(1)} ${(-s * .4).toFixed(1)} ${s.toFixed(1)} 0` }
    }
  }
  // flagstone rows run all the way to the far facade base; row spacing never drops below 5px on screen
  for (let z = 1.9; z < 6.5;) {
    const dz = Math.max(stoneD * (1.6 + .6 * z), .0165 * z * z)
    lines.fine += hd([P(-F + 30, 0, z), P(F - 30, 0, z)], random, .5)
    if (z < 4.5) for (let i = 0; i < (z < 3 ? 6 : 4); i++) { const u = between(random, -F + 40, F - 40); lines.fine += seg(P(u, 0, z + dz * .15), P(u, 0, z + dz * .85)) }
    z += dz
  }
  // low kerb along each wall base in the far half of the alley
  lines.medium += hd([P(-F + 18, 0, 3.2), P(-F + 18, 0, 6.8)], random, .4) + hd([P(F - 18, 0, 3.2), P(F - 18, 0, 6.8)], random, .4)
  // central gutter running into a small drain at the facade base, plus a drain grate near the viewer
  lines.medium += seg(P(-16, 0, zNear), P(-3, 0, 6.0)) + seg(P(16, 0, zNear), P(3, 0, 6.0))
  lines.medium += polyD([P(-24, 0, 6.0), P(24, 0, 6.0), P(24, 0, 6.7), P(-24, 0, 6.7)]) + seg(P(0, 0, 6.05), P(0, 0, 6.65))
  lines.heavy += polyD([P(-150, 0, 1.44), P(-70, 0, 1.44), P(-70, 0, 1.3), P(-150, 0, 1.3)])
  for (let u = -138; u <= -82; u += 14) lines.medium += seg(P(u, 0, 1.31), P(u, 0, 1.43))
  return { id: 'road', silhouette: path(hd(roadSil, random, .8, true)), lines: wrap(lines) }
}

// ---------- pennant strings across the alley ----------
function flags() {
  const random = rng(61), lines = mk()
  let sil = ''
  const string = (z, H, sag, count, pw, ph) => {
    const a = P(-F, H, z), b = P(F, H, z), pts = []
    for (let i = 0; i <= 12; i++) { const t = i / 12, p = lerpPt(a, b, t); pts.push([p[0], p[1] + sag * 4 * t * (1 - t)]) }
    lines.medium += curveD(pts)
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, p = lerpPt(a, b, t), y = p[1] + sag * 4 * t * (1 - t), x = p[0], slope = sag * 4 * (1 - 2 * t) / (b[0] - a[0])
      const lean = (random() - .5) * pw * .5
      const tri = [[x - pw / 2, y + 1 - pw / 2 * slope], [x + pw / 2, y + 1 + pw / 2 * slope], [x + lean, y + ph]]
      sil += polyO(tri)
      lines.medium += polyD(tri)
      if (ph > 18) lines.fine += seg(lerpPt(tri[0], tri[2], .45), lerpPt(tri[1], tri[2], .45)) + (i % 2 ? hatchD(tri, 30, 6, { inset: 1.5 }) : '')
    }
  }
  string(1.85, 800, 38, 13, 22, 27)
  string(3.4, 722, 20, 11, 13, 15)
  return { id: 'flags', silhouette: path(sil), outline: false, lines: wrap(lines) }
}

// ---------- wall-mounted street lamp on the right ----------
function streetLamp() {
  // Mounted on house C just before its corner, below the balcony band: the body hangs over plain wall between the
  // corner drainpipe and the balcony, beside the passage arch.
  const random = rng(67), lines = mk(), z = 1.98, H = 440, uo = F - 36
  // straight arm from the wall to the hanging point with a scroll brace above it (the body hangs close to the wall)
  lines.medium += seg(P(F, H, z), P(uo + 2, H, z)) + curveD([P(F, H + 34, z), P(F - 8, H + 27, z), P(F - 22, H + 12, z), P(F - 32, H + 1, z)])
  lines.fine += curveD([P(F - 6, H + 4, z), P(F - 12, H + 10, z), P(F - 6, H + 14, z)])
  const cx = sx(uo, z), yt = sy(H - 2, z), w = 44 / z, h = 62 / z, y1 = yt + 5, y2 = y1 + h * .3, y3 = y1 + h
  const sil = polyO([[cx - w * .2, y1], [cx + w * .2, y1], [cx + w / 2, y2], [cx + w * .32, y3], [cx - w * .32, y3], [cx - w / 2, y2]])
  lines.medium += lineD(cx, yt, cx, y1) + lineD(cx - w / 2, y2, cx + w / 2, y2) + lineD(cx - w * .15, y2, cx - w * .1, y3) + lineD(cx + w * .15, y2, cx + w * .1, y3) + lineD(cx, y3, cx, y3 + 5) + lineD(cx - w * .42, y3 - 3, cx + w * .42, y3 - 3)
  lines.fine += hatchD([[cx - w / 2 + 1, y2 + 1], [cx - w * .15, y2 + 1], [cx - w * .1, y3 - 3], [cx - w * .32 + 1, y3 - 3]], 65, 5)
  return { id: 'lamp', silhouette: path(sil), lines: wrap(lines) }
}

// ---------- street objects ----------
/** Wooden crate against a wall: frontal face, outer side face and top, with boards, posts and grain. */
function crate(side, z1, z2, size, random) {
  const lines = mk(), o = -side, uIn = side * F, uOut = uIn + o * size
  const nIB = P(uIn, 0, z1), nOB = P(uOut, 0, z1), nOT = P(uOut, size, z1), nIT = P(uIn, size, z1), fOB = P(uOut, 0, z2), fOT = P(uOut, size, z2), fIT = P(uIn, size, z2), fIB = P(uIn, 0, z2)
  const sil = polyO([nIB, nOB, fOB, fOT, fIT, nIT])
  lines.heavy += seg(nOB, nOT) + seg(nOT, nIT) + seg(nOT, fOT)
  for (const f of [.3, .37, .63, .7]) lines.medium += seg(P(uIn, size * f, z1), P(uOut, size * f, z1)) + seg(P(uOut, size * f, z1), P(uOut, size * f, z2))
  for (const u of [uIn + o * 9, uOut - o * 9]) lines.medium += seg(P(u, 2, z1), P(u, size - 2, z1))
  lines.medium += seg(P(uOut, 2, z2 - (z2 - z1) * .1), P(uOut, size - 2, z2 - (z2 - z1) * .1))
  for (const c of [.15, .5, .85]) for (const k of [-.05, .05]) {
    const H = size * (c + k)
    lines.fine += curveD([P(uIn + o * 11, H + 1, z1), P(uIn + o * size * .4, H - 1.5 + random(), z1), P(uIn + o * size * .7, H + 1, z1), P(uOut - o * 11, H - 1, z1)])
    if (k > 0) lines.fine += curveD([P(uOut, H, z1 + (z2 - z1) * .08), P(uOut, H - 1.2, (z1 + z2) / 2), P(uOut, H + .5, z2 - (z2 - z1) * .12)])
  }
  for (const f of [.34, .67]) lines.medium += seg(P(uIn + o * size * f, size, z1), P(uIn + o * size * f, size, z2))
  return { sil, lines, footprint: [nIB, nOB, fOB, fIB], facetOut: polyO([nOB, fOB, fOT, nOT]), facetIn: polyO([nIB, P(uIn + o * 7, 0, z1), P(uIn + o * 7, size, z1), nIT]) }
}

/** Terracotta pot drawn frontally at depth z, standing at height baseH. */
function potAt(u, z, topW, h, random, { baseH = 0 } = {}) {
  const lines = mk(), cx = sx(u, z), yb = sy(baseH, z), w = topW / z, hh = h / z, bw = w * .74, rimH = hh * .2, lip = w * 1.08, yt = yb - hh, ry = Math.max(2, w * .13)
  const sil = polyO([[cx - lip / 2, yt], [cx + lip / 2, yt], [cx + lip / 2, yt + rimH], [cx + w / 2, yt + rimH], [cx + bw / 2, yb], [cx - bw / 2, yb], [cx - w / 2, yt + rimH], [cx - lip / 2, yt + rimH]]) + ellipseD(cx, yt, lip / 2, ry)
  lines.medium += arcD(cx - lip / 2, yt + rimH, cx + lip / 2, yt + rimH, lip / 2, ry, 0, 0)
  lines.fine += ellipseD(cx, yt, lip / 2 - 2.5, ry * .7)
  for (let i = 1; i <= 2; i++) { const t = i / 3, y = yt + rimH + (hh - rimH) * t, hw = (w / 2) * (1 - t) + (bw / 2) * t - 2; lines.fine += `M${(cx - hw).toFixed(1)} ${y.toFixed(1)}q${hw.toFixed(1)} ${(ry * 1.2).toFixed(1)} ${(hw * 2).toFixed(1)} 0` }
  const footprint = [[cx - bw / 2, yb - 2], [cx + bw / 2, yb - 2], [cx + bw / 2 - 1, yb + 1], [cx - bw / 2 + 1, yb + 1]]
  const facetR = polyO([[cx + w * .22, yt + rimH], [cx + w / 2, yt + rimH], [cx + bw / 2, yb], [cx + bw * .22, yb]]), facetL = polyO([[cx - w * .22, yt + rimH], [cx - w / 2, yt + rimH], [cx - bw / 2, yb], [cx - bw * .22, yb]])
  return { sil, lines, footprint, facetR, facetL, top: [cx, yt], w, hh }
}
const flowerD = (x, y, r) => { let d = ''; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2, b = a + Math.PI * 2 / 5; d += `M${(x + Math.cos(a) * r * .4).toFixed(1)} ${(y + Math.sin(a) * r * .4).toFixed(1)}Q${(x + Math.cos((a + b) / 2) * r * 1.4).toFixed(1)} ${(y + Math.sin((a + b) / 2) * r * 1.4).toFixed(1)} ${(x + Math.cos(b) * r * .4).toFixed(1)} ${(y + Math.sin(b) * r * .4).toFixed(1)}` } return d }
/** Rounded flowering bush (geranium-like): scalloped canopy, leaf squiggles, a few drawn leaves and flower heads. */
function bushPlant(cx, cy, rx, ry, random, { flowers = 5, lobes = 9 } = {}) {
  const lines = mk(), sil = canopyO(cx, cy, rx, ry, random, { lobes, depth: .14 })
  lines.fine += foliageD(cx, cy, rx * .82, ry * .82, random, { count: Math.round(rx * ry / 30), size: Math.max(6, rx * .24) })
  // a few drawn leaves only on bushes big enough for them to read (>= 11 x 8 px, outline only, no veins)
  if (rx >= 20) for (let i = 0; i < Math.round(rx / 9); i++) {
    const a = random() * Math.PI * 2, r = random() * .6, lx = cx + Math.cos(a) * rx * r, ly = cy + Math.sin(a) * ry * r
    lines.medium += leaf(lx, ly, Math.max(11, rx * .45), Math.max(8, rx * .32), between(random, -170, -10), { kind: 'oval', veins: 0, bend: .1 }).d
  }
  for (let i = 0; i < flowers; i++) { const a = between(random, -2.9, -.2), r = between(random, .25, .8); lines.medium += flowerD(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, Math.max(3.2, rx * .12)) }
  return { sil, lines }
}
/** Trailing stem with heart leaves (outline only), for plants spilling over a crate or basket edge. */
function trail(x, y, length, angleDeg, random, { leaves = 5, leafLen = 13, leafWidth = 9 } = {}) {
  const pts = []
  let shape = ''
  for (let i = 0; i <= leaves; i++) { const t = i / leaves, a = (angleDeg + 16 * Math.sin(t * Math.PI * 1.5)) * Math.PI / 180; pts.push([x + Math.cos(a) * length * t, y + Math.sin(a) * length * t]) }
  for (let i = 1; i <= leaves; i++) { const p = pts[i], side = i % 2 ? 1 : -1, s = 1 - .3 * i / leaves; shape += leaf(p[0], p[1], leafLen * s, leafWidth * s, angleDeg + side * between(random, 40, 75), { kind: 'heart', veins: 0 }).d }
  return { shape, stem: curveD(pts) }
}
/** Low mound of foliage with flower heads, for a shallow bowl: scalloped outline, squiggles, no leaves. */
function mound(cx, cy, rx, ry, random) {
  const lines = mk(), sil = canopyO(cx, cy, rx, ry, random, { lobes: 7, depth: .12, steps: 28 })
  lines.fine += foliageD(cx, cy + ry * .15, rx * .55, ry * .35, random, { count: 2, size: 7 })
  return { sil, lines }
}
/** Shallow terracotta bowl standing at height baseH: just the closed outline, nothing finer than its rim ellipse. */
function bowlAt(u, z, topW, h, { baseH = 0 } = {}) {
  const cx = sx(u, z), yb = sy(baseH, z), w = topW / z, yt = yb - h / z, lip = w * 1.06, bw = w * .78, ry = Math.max(2.4, w * .13)
  const sil = polyO([[cx - lip / 2, yt], [cx + lip / 2, yt], [cx + bw / 2, yb], [cx - bw / 2, yb]]) + ellipseD(cx, yt, lip / 2, ry)
  const footprint = [[cx - bw / 2, yb - 2], [cx + bw / 2, yb - 2], [cx + bw / 2 - 1, yb + 1], [cx - bw / 2 + 1, yb + 1]]
  return { sil, footprint, top: [cx, yt], facetR: polyO([[cx + lip * .2, yt + ry], [cx + lip / 2, yt + ry], [cx + bw / 2, yb], [cx + bw * .2, yb]]), facetL: polyO([[cx - lip * .2, yt + ry], [cx - lip / 2, yt + ry], [cx - bw / 2, yb], [cx - bw * .2, yb]]) }
}
/** Small standard tree (bay / olive) in a pot: trunk, scalloped crown, leaf squiggles and a few sprigs at the edge. */
function smallTree(x, yBase, trunkH, rx, ry, random) {
  const lines = mk(), cx = x + 3, cy = yBase - trunkH - ry * .72
  const sil = canopyO(cx, cy, rx, ry, random, { lobes: 13, depth: .15 }) + polyO([[x - 4, yBase], [x + 4, yBase], [x + 3, yBase - trunkH - 4], [x - 2, yBase - trunkH - 4]])
  lines.medium += curveD([[x - 1, yBase - trunkH - 2], [x + 2, cy + ry * .25], [x - 7, cy - ry * .15]]) + curveD([[x + 1, yBase - trunkH + 2], [x + 12, cy + ry * .15], [x + 20, cy - ry * .25]])
  lines.fine += foliageD(cx, cy, rx * .86, ry * .86, random, { count: Math.round(rx * ry / 26), size: 8 }) + lineD(x - 1, yBase - 4, x - 1, yBase - trunkH + 4)
  for (const a of [-2.6, -.5, 1.9]) { const s = sprig(cx + Math.cos(a) * rx * .72, cy + Math.sin(a) * ry * .72, 24, a * 180 / Math.PI, random, { leaves: 4, leafLen: 11, leafWidth: 6, kind: 'lance', curl: 24 }); lines.em += s.shape; lines.ef += s.lines }
  return { sil, lines }
}
/**
 * Bentwood bistro chair modelled in 3D around its seat centre (uc, zc) and turned toward the street by turnDeg:
 * round seat with a front edge band, a hoop back with a mid rail and three spindles, four splayed legs and a ring stretcher.
 */
function bistroChair(uc, zc, turnDeg, random) {
  const lines = mk(), th = turnDeg * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th), R = 34
  const C = (a, b, H) => P(uc + a * ct + b * st, H, zc + (-a * st + b * ct) / 890)
  const at = (r, deg, H) => C(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180), H)
  const ring = (r, H, d0, d1, n) => { const pts = []; for (let i = 0; i <= n; i++) { const d = d0 + (d1 - d0) * i / n; pts.push(at(r, d, typeof H === 'function' ? H(d) : H)) } return pts }
  const crown = base => d => base + 8 * Math.sin(d * Math.PI / 180)
  // seat disc and its front edge band (the band is what shows the seat thickness)
  const top = ring(R, 95, 0, 360, 24); top.pop()
  const band = (d0, d1) => polyO([...ring(R, 95, d0, d1, 8), ...ring(R, 88, d0, d1, 8).reverse()])
  let sil = curveO(top, { close: true, tension: .9 }) + band(186, 354)
  lines.fine += curveD(ring(R * .74, 95, 0, 360, 20).slice(0, -1), { close: true, tension: .9 })
  // hoop back: two uprights joined by the curved top rail, drawn as one closed strip
  const tA = 32, tB = 148, hOut = crown(203), hIn = crown(198), inner = ring(R - 2.5, hIn, tA, tB, 10)
  sil += polyO([at(R + 2.5, tA, 96), ...ring(R + 2.5, hOut, tA, tB, 10), at(R + 2.5, tB, 96), at(R - 2.5, tB, 96), ...inner.reverse(), at(R - 2.5, tA, 96)])
  lines.medium += curveD(ring(R, 152, tA, tB, 8))
  for (const d of [66, 90, 114]) lines.medium += seg(at(R, d, 97), at(R, d, hIn(d) - 1))
  lines.fine += curveD(ring(R, 146, tA + 6, tB - 6, 8))
  // legs: front pair as doubled lines (they read as turned wood), back pair as single lines mostly under the seat
  const leg = (d, w) => { for (const k of w) lines.medium += seg(C(R * .88 * Math.cos(d * Math.PI / 180) + k, R * .88 * Math.sin(d * Math.PI / 180), 89), C(R * 1.02 * Math.cos(d * Math.PI / 180) + k, R * 1.02 * Math.sin(d * Math.PI / 180), 0)) }
  leg(225, [-1.6, 1.6]); leg(315, [-1.6, 1.6]); leg(45, [0]); leg(135, [0])
  // ring stretcher: the front arc in medium, the back arc fine
  lines.medium += curveD(ring(R * .96, 30, 180, 360, 10))
  lines.fine += curveD(ring(R * .96, 30, 10, 170, 8))
  const feet = [225, 315, 45, 135].map(d => at(R * 1.02, d, 0))
  const post = d => polyO([at(R + 2.5, d, 96), at(R + 2.5, d, hOut(d)), at(R - 2.5, d, hIn(d)), at(R - 2.5, d, 96)])
  return { sil, lines, footprint: hull(feet), facetR: post(tA) + band(270, 354), facetL: post(tB) + band(186, 270) }
}
/** Round pedestal cafe table with a cup and saucer. */
function cafeTable(u, z, random) {
  const lines = mk(), H = 155, r = 62, cx = sx(u, z), cy = sy(H, z), rx = r / z, ry = (sy(H, z - r / 890) - sy(H, z + r / 890)) / 2, yb = sy(0, z), bw = 26 / z
  const sil = ellipseD(cx, cy, rx, ry) + polyO([[cx - 4, cy + ry], [cx + 4, cy + ry], [cx + 4, yb - 1], [cx - 4, yb - 1]]) + ellipseD(cx, yb - 2, bw, ry * .5 + 1)
  lines.medium += arcD(cx - rx, cy + 4, cx + rx, cy + 4, rx, ry, 0, 0) + lineD(cx - rx, cy, cx - rx, cy + 4) + lineD(cx + rx, cy, cx + rx, cy + 4) + ellipseD(cx, cy + ry + 9, 7, 2.5)
  lines.fine += ellipseD(cx, cy, rx * .84, ry * .8)
  for (const k of [-1, 1]) lines.medium += curveD([[cx + k * 3, yb - 14], [cx + k * bw * .6, yb - 7], [cx + k * bw, yb - 1]])
  const cx2 = cx - rx * .35, cy2 = cy - 3
  lines.medium += ellipseD(cx2, cy2 + 6, 9, 2.6) + polyD([[cx2 - 5, cy2 - 5], [cx2 + 5, cy2 - 5], [cx2 + 4, cy2 + 5], [cx2 - 4, cy2 + 5]]) + ellipseD(cx2, cy2 - 5, 5, 1.8) + `M${(cx2 + 5).toFixed(1)} ${(cy2 - 2).toFixed(1)}q5 0 4 4q-1 2 -4 2`
  return { sil: sil + polyO([[cx2 - 5, cy2 - 5], [cx2 + 5, cy2 - 5], [cx2 + 4, cy2 + 5], [cx2 - 4, cy2 + 5]]), lines, footprint: [[cx - bw, yb - 3], [cx + bw, yb - 3], [cx + bw, yb + 1], [cx - bw, yb + 1]], facetR: polyO([[cx + 1, cy + ry + 4], [cx + 4, cy + ry + 4], [cx + 4, yb - 2], [cx + 1, yb - 2]]), facetL: polyO([[cx - 4, cy + ry + 4], [cx - 1, cy + ry + 4], [cx - 1, yb - 2], [cx - 4, yb - 2]]) }
}
/** Bicycle leaning on the left wall, angled into the street so that it reads as a bicycle. */
function bicycle() {
  const random = rng(71), lines = mk(), ang = 50 * Math.PI / 180, sa = Math.sin(ang), ca = Math.cos(ang)
  const B = (s, w, H) => P(-F + 30 + s * sa + w * ca - H * .1, H, 1.42 - (s * ca + w * sa) / 890)
  const ring = (s0, r, n, phase = 0) => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2 + phase; pts.push(B(s0 + r * Math.cos(t), 0, 66 + r * Math.sin(t))) } return pts }
  const T = (a, b) => seg(B(...a), B(...b))
  let sil = ''
  for (const s0 of [66, 283]) {
    sil += curveO(ring(s0, 66, 28), { close: true, tension: .9 })
    lines.medium += curveD(ring(s0, 57, 28), { close: true, tension: .9 }) + curveD(ring(s0, 7, 10), { close: true })
    for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2 + (s0 > 100 ? .25 : 0); lines.fine += seg(B(s0 + 7 * Math.cos(t), 0, 66 + 7 * Math.sin(t)), B(s0 + 55 * Math.cos(t + .14), 0, 66 + 55 * Math.sin(t + .14))) }
    const mg = []; for (let i = 0; i <= 7; i++) { const t = -Math.PI * (.1 + .8 * i / 7); mg.push(B(s0 + 75 * Math.cos(t), 0, 66 + 75 * Math.sin(t))) }
    lines.medium += curveD(mg)
  }
  lines.heavy += T([132, 0, 196], [252, 0, 186]) + T([262, 0, 132], [152, 0, 62]) + T([132, 0, 196], [152, 0, 62]) + T([132, 0, 196], [66, 0, 66]) + T([152, 0, 62], [66, 0, 66]) + T([252, 0, 186], [262, 0, 132])
  lines.medium += T([262, -4, 132], [283, -4, 66]) + T([262, 4, 132], [283, 4, 66]) + T([132, -3, 196], [66, -3, 66]) + T([152, -3, 62], [66, -3, 66]) + T([133, 0, 196], [130, 0, 212])
  const saddle = polyO([B(106, 0, 212), B(160, 0, 216), B(164, 0, 223), B(140, 0, 228), B(106, 0, 221)])
  sil += saddle
  lines.medium += T([250, 0, 186], [246, 0, 206]) + curveD([B(246, -46, 209), B(246, -20, 205.5), B(246, 0, 204.5), B(246, 20, 205.5), B(246, 46, 209)])
  lines.heavy += T([246, 34, 207.5], [246, 48, 209.5]) + T([246, -34, 207.5], [246, -48, 209.5])
  lines.medium += curveD(ring(152, 20, 14), { close: true }) + T([152, 0, 62], [171, 0, 42]) + T([171, 0, 42], [171, -12, 42]) + T([152, 0, 62], [134, 0, 83]) + T([134, 0, 83], [134, 12, 83])
  lines.fine += T([152, 0, 82], [66, 0, 73]) + T([152, 0, 42], [66, 0, 59])
  lines.medium += T([28, 0, 150], [104, 0, 150]) + T([28, 0, 144], [104, 0, 144]) + T([40, 0, 150], [66, 0, 66]) + T([100, 0, 150], [128, 0, 190])
  lines.fine += T([28, 0, 150], [28, 0, 144]) + T([104, 0, 150], [104, 0, 144]) + T([66, 0, 150], [66, 0, 144]) + T([262, 0, 132], [262, 0, 120]) + T([252, 0, 186], [250, 0, 196])
  return { layer: { id: 'bicycle', silhouette: path(sil), lines: wrap(lines) }, footprint: { pts: [B(0, -12, 0), B(0, 12, 0), B(350, 12, 0), B(350, -12, 0)], z: 1.3 } }
}

// ---------- assembly ----------
const left = leftBuildings(), right = rightBuildings(), bike = bicycle()
const footprints = [...left.footprints, ...right.footprints, bike.footprint]
const facetsLeft = [], facetsRight = [], plantShapes = [...left.plants, ...right.plants]
const objectLayers = []
{
  // crate beyond the bicycle with a shallow bowl on top: a low flowering mound and two stems trailing over the crate's edges,
  // kept below the bicycle's handlebar so the bar reads against plain wall
  const random = rng(83), c = crate(-1, 2.0, 2.1, 64, random)
  objectLayers.push({ id: 'crate', silhouette: path(c.sil), lines: wrap(c.lines) })
  footprints.push({ pts: c.footprint, z: 2.05 }); facetsLeft.push(c.facetOut); facetsRight.push(c.facetIn)
  const p = bowlAt(-F + 34, 2.05, 46, 20, { baseH: 64 }), m = mound(p.top[0], p.top[1] - 3, 15, 6.5, random)
  const t1 = trail(p.top[0] - 7, p.top[1] + 1, 30, 118, random, { leaves: 4, leafLen: 12, leafWidth: 9 })
  const t2 = trail(p.top[0] + 8, p.top[1] + 1, 26, 62, random, { leaves: 4, leafLen: 11, leafWidth: 8 })
  // outline: false so the small foliage keeps a medium contour; only the bowl gets the heavy pen
  const lines = mk(); add(lines, m.lines); lines.heavy += p.sil; lines.medium += m.sil + t1.stem + t2.stem + t1.shape + t2.shape
  const sil = path(p.sil + m.sil + t1.shape + t2.shape)
  objectLayers.push({ id: 'crate-pot', silhouette: sil, outline: false, lines: wrap(lines) })
  plantShapes.push(sil); facetsLeft.push(p.facetR); facetsRight.push(p.facetL)
}
{
  // geranium pot a little beyond the crate with clear wall around it, a small pot by the house-B door, and a vine
  // climbing the wall on the near side of the house-A door (behind nothing, so the bicycle saddle stays readable)
  const random = rng(79), lines = mk(), sils = []
  const p1 = potAt(-F + 130, 2.1, 52, 44, random), b1 = bushPlant(p1.top[0], p1.top[1] - 17, 21, 18, random, { flowers: 5 })
  const p2 = potAt(-F + 26, 3.1, 44, 36, random), b2 = bushPlant(p2.top[0], p2.top[1] - 8, 11, 9, random, { flowers: 2, lobes: 6 })
  for (const p of [p1, p2]) { sils.push(path(p.sil)); add(lines, p.lines); facetsLeft.push(p.facetR); facetsRight.push(p.facetL) }
  footprints.push({ pts: p1.footprint, z: 2.1 }, { pts: p2.footprint, z: 3.1 })
  sils.push(path(b1.sil), path(b2.sil)); add(lines, b1.lines); add(lines, b2.lines)
  const v = sprig(sx(-F + 5, 1.3), sy(8, 1.3), 118, -84, random, { leaves: 8, leafLen: 18, leafWidth: 13, kind: 'heart', curl: 40 })
  sils.push(v.shape); lines.em += v.lines
  objectLayers.push({ id: 'pots-left', silhouette: sils.join(''), lines: wrap(lines) })
  plantShapes.push(sils.join(''))
}
{
  // right side: small pot by the passage (behind the chair), bistro chair on the far side of the table, table, potted tree
  const random = rng(89)
  const p3 = potAt(F - 34, 2.3, 44, 36, random), b3 = bushPlant(p3.top[0], p3.top[1] - 12, 16, 13, random, { flowers: 4, lobes: 7 })
  const l3 = mk(); add(l3, p3.lines); add(l3, b3.lines)
  objectLayers.push({ id: 'pot-passage', silhouette: path(p3.sil + b3.sil), lines: wrap(l3) })
  plantShapes.push(path(p3.sil + b3.sil)); footprints.push({ pts: p3.footprint, z: 2.3 }); facetsLeft.push(p3.facetR); facetsRight.push(p3.facetL)
  const ch = bistroChair(352, 1.62, 30, random)
  objectLayers.push({ id: 'chair', silhouette: path(ch.sil), lines: wrap(ch.lines) })
  footprints.push({ pts: ch.footprint, z: 1.6 }); facetsLeft.push(ch.facetR); facetsRight.push(ch.facetL)
  const tb = cafeTable(350, 1.35, random)
  objectLayers.push({ id: 'table', silhouette: path(tb.sil), lines: wrap(tb.lines) })
  footprints.push({ pts: tb.footprint, z: 1.35 }); facetsLeft.push(tb.facetR); facetsRight.push(tb.facetL)
  const lines = mk(), sils = []
  const p4 = potAt(F - 62, 1.05, 84, 72, random), tr = smallTree(p4.top[0], p4.top[1] + 2, 56, 42, 38, random)
  sils.push(path(p4.sil)); add(lines, p4.lines); facetsLeft.push(p4.facetR); facetsRight.push(p4.facetL)
  footprints.push({ pts: p4.footprint, z: 1.05 })
  sils.push(path(tr.sil)); add(lines, tr.lines)
  objectLayers.push({ id: 'pots-right', silhouette: sils.join(''), lines: wrap(lines) })
  plantShapes.push(sils.join(''))
}

const SWEEP = { 'upper-left': [95, 32], 'upper-right': [-95, 32], left: [185, 14], right: [-185, 14] }
function shadowPath(direction, k) {
  const [dx, dy] = SWEEP[direction].map(v => v * k)
  let d = ''
  if (dx > 0) d += cpoly([P(-F, 0, 1), [XE0, YE], [XE0 + dx / ZF, YE + dy / ZF], [FR.x0 + dx, sy(0, 1) + dy]])
  else d += cpoly([P(F, 0, 1), [XE1, YE], [XE1 + dx / ZF, YE + dy / ZF], [FR.x1 + dx, sy(0, 1) + dy]])
  for (const f of footprints) {
    d += cpoly(hull([...f.pts, ...f.pts.map(([x, y]) => [x + dx / f.z, y + dy / f.z])]))
    d += cpoly(hull([...f.pts, ...f.pts.map(([x, y]) => [x + Math.sign(dx) * 3, y + 3])]))
  }
  return path(d)
}
const shadows = {}, longShadows = {}
for (const dir of Object.keys(SWEEP)) { shadows[dir] = shadowPath(dir, 1); longShadows[dir] = shadowPath(dir, dir.startsWith('upper') ? 2.4 : 2.1) }

const roadLayer = road()
roadLayer.outline = false
roadLayer.lines.heavy = path(lineD(FR.x0, sy(0, 1), FR.x0, FR.y1) + lineD(FR.x0, FR.y1, FR.x1, FR.y1) + lineD(FR.x1, FR.y1, FR.x1, sy(0, 1))) + roadLayer.lines.heavy
const skyLayer = sky()
skyLayer.outline = false
skyLayer.lines.heavy = path(lineD(roofA0[0] - 2, FR.y0, sx(F, 2.3) + 2, FR.y0)) + skyLayer.lines.heavy

export const scene = {
  id: 'old-town-street',
  indoor: false,
  wash: '#f0e3ce',
  layers: [skyLayer, farFacade(), roadLayer, right.layer, left.layer, flags(), streetLamp(), ...objectLayers, bike.layer],
  regions: [
    { id: 'sky', label: '골목 위 하늘', material: 'other', wash: '#e3e9ed', layers: ['sky'] },
    { id: 'far-facade', label: '골목 끝 건물', material: 'stone', wash: '#eadfca', layers: ['far-facade'] },
    { id: 'left-buildings', label: '왼쪽 건물', material: 'stone', wash: '#e6c8a6', layers: ['left-buildings'] },
    { id: 'right-buildings', label: '오른쪽 건물', material: 'stone', wash: '#e2d3b7', layers: ['right-buildings'] },
    { id: 'road', label: '골목길', material: 'stone', wash: '#e8d9bd', layers: ['road'] },
    { id: 'flags', label: '만국기', material: 'fabric', wash: '#f1d7d7', layers: ['flags'] },
    { id: 'crates', label: '나무 상자', material: 'wood', wash: '#e6cfa8', layers: ['crate'] },
    { id: 'cafe-set', label: '카페 테이블과 의자', material: 'wood', wash: '#e0d2bd', layers: ['chair', 'table'] },
    { id: 'plants', label: '골목의 화분', material: 'foliage', wash: '#d1d8b3', shape: plantShapes.join('') },
    { id: 'bicycle', label: '자전거', material: 'other', wash: '#d9dde0', layers: ['bicycle'] },
  ],
  shadows,
  longShadows,
  facets: { left: path(polyO(leftSil) + facetsLeft.join('')), right: path(polyO(rightSil) + facetsRight.join('')) },
}

// ---------- late additions ----------
/** Faded painted advertisement on a wall: a framed panel with lettering bands and sparse hatch. */
function ghostSign(side, z1, z2, H1, H2, random) {
  const lines = mk(), Q = (z, H) => P(side * F, H, z), zm = (z1 + z2) / 2
  lines.medium += hd([Q(z1, H2), Q(z2, H2), Q(z2, H1), Q(z1, H1)], random, .6, true)
  lines.fine += polyD([Q(z1 + (z2 - z1) * .05, H2 - 6), Q(z2 - (z2 - z1) * .05, H2 - 6), Q(z2 - (z2 - z1) * .05, H1 + 6), Q(z1 + (z2 - z1) * .05, H1 + 6)])
  for (const [Ha, Hb, k] of [[H2 - 18, H2 - 34, .7], [H2 - 44, H2 - 56, .9], [H1 + 14, H1 + 24, .5]]) {
    const za = z1 + (z2 - z1) * (.5 - k / 2), zb = z1 + (z2 - z1) * (.5 + k / 2)
    lines.medium += polyD([Q(za, Ha), Q(zb, Ha), Q(zb, Hb), Q(za, Hb)])
    lines.fine += hatchD([Q(za, Ha), Q(zb, Ha), Q(zb, Hb), Q(za, Hb)], 90, sp(9, zm), { inset: 1 }).replace(/M[^M]*/g, m => (random() < .6 ? m : ''))
  }
  lines.fine += hatchD([Q(z1, H2), Q(z2, H2), Q(z2, H1), Q(z1, H1)], 35, sp(26, zm), { inset: 3 }).replace(/M[^M]*/g, m => (random() < .3 ? m : ''))
  return lines
}
/** Sitting cat in side view, drawn frontally at depth z. Returns a closed silhouette and inner lines. */
function cat(x, yBase, z) {
  const k = 78 / z, lines = mk()
  const body = curveO([[x - k * .42, yBase], [x - k * .5, yBase - k * .3], [x - k * .42, yBase - k * .58], [x - k * .2, yBase - k * .72], [x + k * .02, yBase - k * .7], [x + k * .1, yBase - k * .86], [x + k * .06, yBase - k * 1.0], [x + k * .18, yBase - k * .9], [x + k * .34, yBase - k * .9], [x + k * .46, yBase - k * 1.0], [x + k * .42, yBase - k * .84], [x + k * .44, yBase - k * .66], [x + k * .3, yBase - k * .5], [x + k * .32, yBase - k * .2], [x + k * .26, yBase], [x + k * .02, yBase], [x - k * .06, yBase - k * .1], [x - k * .18, yBase]], { close: true, tension: .85 })
  const tail = curveD([[x - k * .4, yBase - k * .08], [x - k * .62, yBase - k * .02], [x - k * .74, yBase - k * .2], [x - k * .66, yBase - k * .36]])
  lines.medium += `M${(x + k * .18).toFixed(1)} ${(yBase - k * .76).toFixed(1)}l${(k * .05).toFixed(1)} ${(k * .04).toFixed(1)}M${(x + k * .36).toFixed(1)} ${(yBase - k * .76).toFixed(1)}l${(-k * .05).toFixed(1)} ${(k * .04).toFixed(1)}M${(x + k * .2).toFixed(1)} ${(yBase - k * .62).toFixed(1)}q${(k * .07).toFixed(1)} ${(k * .06).toFixed(1)} ${(k * .14).toFixed(1)} 0` + tail
  lines.fine += lineD(x + k * .02, yBase - k * .02, x + k * .02, yBase - k * .3) + lineD(x + k * .2, yBase - k * .02, x + k * .18, yBase - k * .3) + `M${(x - k * .3).toFixed(1)} ${(yBase - k * .5).toFixed(1)}q${(k * .1).toFixed(1)} ${(-k * .06).toFixed(1)} ${(k * .2).toFixed(1)} 0`
  return { sil: body, lines }
}
/** Hanging basket on a wall bracket with a bushy top and trailing sprigs. */
function hangingBasket(side, z, H, random) {
  const lines = mk(), u = side * F, uo = side * (F - 46), x = sx(uo, z), yb = sy(H - 62, z), w = 46 / z, h = 26 / z
  lines.medium += seg(P(u, H, z), P(uo - side * 4, H, z)) + curveD([P(u, H - 30, z), P(side * (F - 16), H - 22, z), P(side * (F - 34), H - 2, z)])
  lines.fine += seg([x - w * .38, yb - h], [x - w * .1, sy(H - 2, z)]) + seg([x + w * .38, yb - h], [x + w * .1, sy(H - 2, z)])
  const bowl = ellipseD(x, yb - h, w / 2, w * .13) + `M${(x - w / 2).toFixed(1)} ${(yb - h).toFixed(1)}Q${(x - w * .4).toFixed(1)} ${yb.toFixed(1)} ${x.toFixed(1)} ${yb.toFixed(1)}Q${(x + w * .4).toFixed(1)} ${yb.toFixed(1)} ${(x + w / 2).toFixed(1)} ${(yb - h).toFixed(1)}Z`
  lines.fine += hatchD([[x - w / 2, yb - h], [x + w / 2, yb - h], [x + w * .2, yb - 1], [x - w * .2, yb - 1]], 60, 5, { inset: 2 }) + hatchD([[x - w / 2, yb - h], [x + w / 2, yb - h], [x + w * .2, yb - 1], [x - w * .2, yb - 1]], 120, 5, { inset: 2 })
  const bush = bushPlant(x, yb - h - 9, w * .55, 11, random, { flowers: 3, lobes: 7 })
  add(lines, bush.lines)
  let sil = bowl + bush.sil
  for (const [dx, ang] of [[-w * .4, 100], [w * .35, 80], [0, 95]]) { const s = sprig(x + dx, yb - 2, 34, ang, random, { leaves: 5, leafLen: 9, leafWidth: 6, kind: 'heart', curl: 30 }); lines.em += s.shape + s.lines }
  return { sil, lines }
}
{
  const random = rng(97), pr = objectLayers.find(l => l.id === 'pots-right'), hb = hangingBasket(1, 1.05, 606, random)
  pr.silhouette += path(hb.sil)
  const w = wrap(hb.lines); pr.lines.heavy += w.heavy; pr.lines.medium += w.medium; pr.lines.fine += w.fine
  plantShapes.push(path(hb.sil))
  const c = cat(sx(F - 14, 2.78), sy(42, 2.78), 2.78)
  scene.layers.splice(scene.layers.findIndex(l => l.id === 'flags'), 0, { id: 'cat', silhouette: path(c.sil), lines: wrap(c.lines) })
  scene.regions.find(r => r.id === 'plants').shape = plantShapes.join('')
}
