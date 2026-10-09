// Window still life: a wooden table in front of a tall window with a gathered curtain and a basil pot on
// the sill. On a folded linen cloth sit a round teapot, a cup on a saucer with a spoon, a bowl of lemons,
// a stack of two books and, on the bare table at the right, a glass vase with a eucalyptus sprig.
// Eye level is about y=380; the table top runs from y=430 (back edge) to y=640 (front edge).
import { fmt, path, ellipse, circle, lineD, polyD, rectD, arcD, curveD, rng, between, jitter, lerp, lerpPt, rotatePt, hull, hatchD, ticksD, perspectiveRows, grainD, leaf, pot, cloudD } from './helpers.mjs'

const random = rng(20261009)
const FRAME = { x0: 55, y0: 55, x1: 945, y1: 705 }

// ---------- scene-local helpers ----------

const pt = ([x, y]) => `${fmt(x)} ${fmt(y)}`
const ellipsePts = (cx, cy, rx, ry, n = 36, rot = 0) => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; pts.push(rotatePt([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry], rot, [cx, cy])) } return pts }
/** Points along an ellipse arc between two angles in degrees (0 = right, 90 = bottom, 180 = left). */
const arcPts = (cx, cy, rx, ry, a0, a1, n = 14) => { const pts = []; for (let i = 0; i <= n; i++) { const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]) } return pts }
const wobble = (pts, amp = .7) => jitter(pts, amp, random)
/** A straight pen stroke with a little hand wobble. */
const strokeD = (x1, y1, x2, y2, amp = .8, segs = 4) => {
  const pts = []
  for (let k = 0; k <= segs; k++) { const t = k / segs, inner = k && k < segs; pts.push([lerp(x1, x2, t) + (inner ? (random() - .5) * 2 * amp : 0), lerp(y1, y2, t) + (inner ? (random() - .5) * 2 * amp : 0)]) }
  return curveD(pts)
}
/** Split a polyline into the runs that satisfy `inside` and draw each as a smooth curve. */
function clipRunsD(points, inside) {
  let d = '', run = []
  const flush = () => { if (run.length >= 2) d += curveD(run); run = [] }
  for (const p of points) { if (inside(p)) run.push(p); else flush() }
  flush()
  return d
}
const inRect = r => ([x, y]) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1
/** Sutherland–Hodgman clip of a polygon to the paper frame (inset 1px), for shadows that would run off the paper. */
function clipToFrame(points) {
  const edges = [p => p[0] >= FRAME.x0 + 1, p => p[0] <= FRAME.x1 - 1, p => p[1] >= FRAME.y0 + 1, p => p[1] <= FRAME.y1 - 1]
  const lines = [[FRAME.x0 + 1, 'x'], [FRAME.x1 - 1, 'x'], [FRAME.y0 + 1, 'y'], [FRAME.y1 - 1, 'y']]
  let out = points
  edges.forEach((keep, e) => {
    const [v, axis] = lines[e], input = out
    out = []
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], ka = keep(a), kb = keep(b)
      const cross = () => { const t = axis === 'x' ? (v - a[0]) / (b[0] - a[0]) : (v - a[1]) / (b[1] - a[1]); return lerpPt(a, b, t) }
      if (ka) { out.push(a); if (!kb) out.push(cross()) } else if (kb) out.push(cross())
    }
  })
  return out
}
const castClipped = (footprint, dx, dy) => path(polyD(clipToFrame(hull([...footprint, ...footprint.map(([x, y]) => [x + dx, y + dy])]))))
/**
 * A named-guide shape with holes: `shape` is painted and every silhouette in `holes` is punched out of it.
 * A hand-written guide shape is not hidden behind the layers in front of it the way a layer-built one is,
 * so the layers that overlap the shape are passed as holes.
 */
let cutoutCount = 0
const cutout = (shape, holes) => {
  const id = `cut${cutoutCount++}`
  return `<mask id="${id}"><g fill="white" stroke="white" stroke-width="2">${shape}</g><g fill="black" stroke="black" stroke-width="1.6">${holes.join('')}</g></mask><g mask="url(#${id})">${shape}</g>`
}
/** Offset a polygon inward using averaged vertex normals (points in screen order). */
function insetPolygon(points, d) {
  const n = points.length
  let area = 0
  for (let i = 0; i < n; i++) { const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % n]; area += x1 * y2 - x2 * y1 }
  const sign = area > 0 ? 1 : -1
  const normal = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * sign, dx / l * sign] }
  return points.map((p, i) => {
    const n0 = normal(points[(i - 1 + n) % n], p), n1 = normal(p, points[(i + 1) % n])
    let mx = n0[0] + n1[0], my = n0[1] + n1[1]
    const ml = Math.hypot(mx, my) || 1
    mx /= ml; my /= ml
    const k = Math.min(2.5, 1 / Math.max(.4, mx * n0[0] + my * n0[1]))
    return [p[0] + mx * d * k, p[1] + my * d * k]
  })
}
/** Crescent between an outer and an inner ellipse arc, used to hatch the shaded side of round objects. */
const crescent = (cx, cy, rx, ry, a0, a1, inset) => [...arcPts(cx, cy, rx, ry, a0, a1, 12), ...arcPts(cx, cy, rx - inset, ry - inset * .8, a1, a0, 12)]
/** Lemon outline: an elongated ellipse with a pronounced nipple at the blossom end (+x) and a smaller one at the stem end. */
function lemonPts(cx, cy, rx, ry, rot) {
  const pts = []
  for (let i = 0; i < 32; i++) {
    const t = i / 32 * Math.PI * 2, c = Math.cos(t)
    const k = 1 + .28 * Math.pow(Math.max(0, c), 8) + .14 * Math.pow(Math.max(0, -c), 8)
    pts.push(rotatePt([cx + c * rx * k, cy + Math.sin(t) * ry * k], rot, [cx, cy]))
  }
  return pts
}
/** Tiny arcs (peel pores) scattered over the shaded lower-right side of a rotated ellipse. */
function stippleD(cx, cy, rx, ry, rot, count, size = 3.5) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const t = between(random, 10, 140) * Math.PI / 180, r = .3 + Math.sqrt(random()) * .55
    const [x, y] = rotatePt([cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r], rot, [cx, cy])
    d += `M${fmt(x - size / 2)} ${fmt(y)}q${fmt(size / 2)} ${fmt(-size * .4)} ${fmt(size)} 0`
  }
  return d
}
/** Short curved pen flicks scattered inside an ellipse: peel, soil, plaster. */
function flicksD(cx, cy, rx, ry, count, size = 5) {
  let d = ''
  for (let i = 0; i < count; i++) {
    const t = random() * Math.PI * 2, r = Math.sqrt(random()) * .85
    const x = cx + Math.cos(t) * rx * r, y = cy + Math.sin(t) * ry * r, a = random() * Math.PI
    const ux = Math.cos(a) * size / 2, uy = Math.sin(a) * size / 2
    d += `M${fmt(x - ux)} ${fmt(y - uy)}Q${fmt(x - uy * .6)} ${fmt(y + ux * .6)} ${fmt(x + ux)} ${fmt(y + uy)}`
  }
  return d
}

// ---------- 1. back wall with the view through the window ----------

const GLASS = { x0: 166, y0: 86, x1: 754, y1: 369 }
function wallLayer() {
  const silhouette = path(rectD(55, 55, 890, 375))
  const inside = inRect(GLASS)
  let fine = ''
  // distant hills and a nearer tree line, soft because they are far away and behind glass
  const hill = (base, amp, freq, phase) => { const pts = []; for (let x = 150; x <= 770; x += 12) pts.push([x, base - amp * Math.sin(x * freq + phase) - amp * .4 * Math.sin(x * freq * 2.3 + phase * 2) + (random() - .5) * 1.5]); return pts }
  fine += clipRunsD(hill(306, 18, .0085, .6), inside) + clipRunsD(hill(334, 11, .013, 2.4), inside)
  // tree crowns rising above the lower hill
  const crown = (cx, cy, rx, ry, lobes) => { const pts = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; const k = 1 - .14 * Math.abs(Math.sin(lobes * t / 2)) + (random() - .5) * .05; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]) } pts.push(pts[0]); return pts }
  for (const [cx, cy, rx, ry, lobes] of [[215, 352, 42, 30, 9], [300, 362, 50, 34, 11], [420, 358, 46, 30, 9], [500, 370, 60, 36, 11], [690, 356, 48, 32, 9], [600, 366, 44, 28, 9]]) {
    fine += clipRunsD(crown(cx, cy, rx, ry, lobes), inside)
    // a few leaf squiggles inside each crown
    let sq = ''
    for (let i = 0; i < 6; i++) { const x = cx + (random() - .5) * rx * 1.2, y = cy - 6 + (random() - .5) * ry; if (inside([x, y]) && inside([x + 8, y])) sq += `M${fmt(x)} ${fmt(y)}q2 -4 4 0q2 -4 4 0` }
    fine += sq
  }
  // clouds and birds in the upper panes
  // clouds sit wholly inside a pane, so they need no clipping; a few soft underside strokes make them puffy
  fine += cloudD(258, 150, 118, 30, random, { bumps: 5 }) + cloudD(640, 128, 100, 26, random, { bumps: 4 }) + cloudD(470, 178, 66, 18, random, { bumps: 3 })
  fine += `M222 160q18 -3 36 0M612 136q14 -2 30 0`
  for (const [x, y] of [[300, 196], [318, 190], [452, 120]]) fine += `M${fmt(x - 5)} ${fmt(y)}q5 -4 5 0q0 -4 5 0`
  // light plaster texture on the wall beside the window and the shadow line under the sill
  fine += hatchD([[64, 100], [130, 100], [130, 190], [64, 190]], 62, 12) + hatchD([[64, 310], [136, 310], [136, 410], [64, 410]], 62, 12)
  fine += hatchD([[900, 96], [938, 96], [938, 420], [900, 420]], 62, 12)
  // a narrow shadow band right under the sill, kept short so the teapot lid sits in clear wall space below it
  fine += hatchD([[140, 406], [780, 406], [780, 416], [140, 416]], 55, 5)
  return { id: 'wall', silhouette, lines: { fine: path(fine) } }
}

// ---------- 2. window casing, mullions and sill ----------

const PANES = [[166, 357], [367, 553], [563, 754]].flatMap(([x0, x1]) => [[86, 222], [232, 369]].map(([y0, y1]) => ({ x0, y0, x1, y1 })))
function sashLayer() {
  const bars = [rectD(150, 70, 620, 16), rectD(150, 369, 620, 16), rectD(150, 70, 16, 315), rectD(754, 70, 16, 315), rectD(357, 86, 10, 283), rectD(553, 86, 10, 283), rectD(166, 222, 588, 10), rectD(134, 385, 652, 17)]
  const silhouette = path(bars.join(''))
  let heavy = strokeD(150, 70, 770, 70) + strokeD(770, 70, 770, 385) + strokeD(150, 70, 150, 385) + strokeD(134, 385, 786, 385) + strokeD(786, 385, 786, 402) + strokeD(786, 402, 134, 402) + strokeD(134, 402, 134, 385)
  let medium = strokeD(166, 86, 754, 86) + strokeD(754, 86, 754, 369) + strokeD(754, 369, 166, 369) + strokeD(166, 369, 166, 86)
  medium += strokeD(156, 76, 764, 76) + strokeD(764, 76, 764, 380) + strokeD(156, 76, 156, 380)
  for (const x of [357, 367, 553, 563]) medium += strokeD(x, 86, x, 369)
  for (const y of [222, 232]) medium += strokeD(166, y, 754, y)
  medium += strokeD(150, 390, 770, 390) + strokeD(150, 369, 150, 385) + strokeD(770, 369, 770, 385)
  // small brackets under the sill ends
  medium += `M146 402Q150 414 162 414M774 402Q770 414 758 414`
  let fine = ''
  // glints on the glass: two short diagonals in the upper-left corner of each pane
  for (const p of PANES) { fine += lineD(p.x0 + 8, p.y0 + 30, p.x0 + 30, p.y0 + 8) + lineD(p.x0 + 8, p.y0 + 42, p.x0 + 42, p.y0 + 8) }
  // wood grain along the casing and the sill
  fine += grainD([150, 72], [770, 72], [150, 84], [770, 84], 2, random) + grainD([152, 72], [152, 383], [164, 72], [164, 383], 2, random) + grainD([756, 72], [756, 383], [768, 72], [768, 383], 2, random)
  fine += grainD([136, 392], [784, 392], [136, 401], [784, 401], 2, random)
  return { id: 'sash', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- 3. gathered curtain on the right ----------

function curtainLayer() {
  const top = []
  for (let k = 0; k <= 12; k++) top.push([714 + k * 14.5, k % 2 ? 79 : 72])
  const right = [[891, 130], [889, 200], [884, 258], [868, 300], [880, 350], [892, 398], [894, 422]]
  const bottom = [[870, 427], [840, 421], [810, 428], [780, 422], [752, 427]]
  const left = [[742, 422], [748, 380], [760, 340], [776, 300], [732, 240], [719, 180], [715, 120]]
  const outline = [...top, ...right, ...bottom, ...left]
  const silhouette = path(curveD(outline, { close: true, tension: .7 }))
  let heavy = curveD(wobble(outline, .6), { close: true, tension: .7 })
  // tie-back band and its cord to the wall hook
  heavy += curveD([[772, 293], [822, 299], [872, 293], [873, 316], [822, 322], [771, 315]], { close: true, tension: .6 })
  let medium = rectD(690, 61, 220, 6)
  let mediumEl = circle(688, 64, 5) + circle(912, 64, 5)
  // pleat folds from each dip of the heading down to the tie-back, then flaring out below it
  const folds = []
  for (let k = 0; k < 6; k++) {
    const xTop = 728 + k * 29, wx = 784 + k * 15, xb = 754 + k * 26
    folds.push({ xTop, wx, xb })
    medium += curveD([[xTop, 80], [lerp(xTop, wx, .35) + (random() - .5) * 8, 150], [lerp(xTop, wx, .7) + (random() - .5) * 6, 230], [wx, 294]])
    medium += curveD([[wx + 2, 318], [lerp(wx, xb, .5) + (random() - .5) * 6, 370], [xb, 421]])
    mediumEl += circle(xTop - 14.5, 70, 4.5)
  }
  mediumEl += circle(873, 304, 6)
  medium += `M879 304Q892 302 904 298M904 298q6 -2 4 6q-2 6 -8 2`
  // hem above the bottom edge, with stitching
  const hemPts = bottom.map(([x, y]) => [x, y - 9])
  medium += curveD([[892, 412], ...hemPts, [743, 412]])
  let fine = ''
  for (let i = 0; i + 1 < hemPts.length; i++) fine += ticksD(hemPts[i][0], hemPts[i][1], hemPts[i + 1][0], hemPts[i + 1][1], 8, 4)
  // shading in alternate fold valleys above the tie-back and below it
  for (let k = 0; k < 6; k += 2) {
    const f = folds[k]
    fine += hatchD([[f.xTop, 84], [f.xTop + 13, 84], [f.wx + 9, 290], [f.wx + 1, 290]], 18, 6)
    fine += hatchD([[f.wx + 2, 320], [f.wx + 9, 320], [f.xb + 14, 418], [f.xb + 2, 418]], 15, 6)
  }
  fine += hatchD([[772, 300], [872, 300], [872, 314], [772, 314]], 0, 5.5, { inset: 4 })
  return { id: 'curtain', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium) + mediumEl, fine: path(fine) } }
}

// ---------- 4. basil in a clay pot on the sill ----------

/** The basil's clay pot and its leaves as separate shapes, so the authored guide can tint them apart. */
const PLANT_PARTS = { pot: '', leaves: '' }
function plantLayer() {
  const p = pot(648, 318, 66, 64, { rim: .2, lip: 1.1 })
  PLANT_PARTS.pot = p.shape
  let silhouette = p.shape
  let heavy = p.d
  let medium = '', fine = ''
  medium += arcD(624, 382, 672, 382, 24, 4, 0, 0) + strokeD(620, 326, 676, 326, 1.2) + arcD(615, 346, 681, 346, 33, 4, 0, 0) + arcD(616, 362, 679, 362, 31, 4, 0, 0)
  fine += flicksD(648, 326, 24, 3, 7, 4) + hatchD([[668, 332], [681, 332], [672, 381], [661, 381]], 80, 6)
  const stems = [
    [[640, 328], [628, 300], [612, 274], [600, 250]],
    [[650, 326], [652, 294], [652, 260], [650, 228]],
    [[658, 328], [674, 302], [690, 278], [700, 254]],
  ]
  const leafAt = (stem, t, side, len, width) => {
    const i = Math.min(stem.length - 2, Math.floor(t * (stem.length - 1))), f = t * (stem.length - 1) - i
    const a = lerpPt(stem[i], stem[i + 1], f), b = lerpPt(stem[i], stem[i + 1], Math.min(1, f + .1))
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
    const l = leaf(a[0], a[1], len, width, dir + side * between(random, 50, 70), { kind: 'oval', bend: .12 * side, veins: 1, side })
    silhouette += l.shape
    PLANT_PARTS.leaves += l.shape
    medium += l.d + lineD(a[0], a[1], a[0] + (l.tip[0] - a[0]) * .1, a[1] + (l.tip[1] - a[1]) * .1)
    fine += l.veinsD
  }
  for (const stem of stems) {
    medium += curveD(stem)
    leafAt(stem, .28, 1, 34, 21); leafAt(stem, .4, -1, 31, 20)
    leafAt(stem, .66, 1, 27, 17); leafAt(stem, .76, -1, 24, 15)
    leafAt(stem, .97, 1, 17, 11); leafAt(stem, .99, -1, 15, 10)
  }
  // two short side shoots low in the pot so the plant reads as a bushy basil
  for (const shoot of [[[634, 328], [614, 316], [596, 300]], [[664, 328], [684, 318], [704, 304]]]) { medium += curveD(shoot); leafAt(shoot, .55, 1, 24, 15); leafAt(shoot, .97, 1, 16, 10); leafAt(shoot, .99, -1, 15, 9) }
  return { id: 'plant', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- 5. wooden table ----------

function tableLayer() {
  const silhouette = path(rectD(55, 430, 890, 275))
  let heavy = strokeD(55, 640, 945, 640, 1, 10)
  let medium = strokeD(55, 647, 945, 647, .7, 8)
  let fine = '', knots = ''
  const rows = perspectiveRows(640, 430, 5, 380)
  for (let i = 1; i < rows.length - 1; i++) medium += strokeD(55, rows[i], 945, rows[i], 1, 12)
  for (let i = 0; i + 1 < rows.length; i++) {
    const yNear = rows[i], yFar = rows[i + 1]
    fine += grainD([55, yFar], [945, yFar], [55, yNear], [945, yNear], 2, random)
    // plank end joints and the odd knot
    const x = between(random, 120, 880)
    medium += strokeD(x, yFar, x + (random() - .5) * 4, yNear, .5, 2)
    if (i % 2) { const kx = between(random, 100, 900), ky = lerp(yFar, yNear, .5); knots += ellipse(kx, ky, 6, 2.5) + ellipse(kx + 1, ky, 3, 1.2) }
  }
  // front apron with a drawer and a round knob
  medium += rectD(392, 660, 216, 36)
  fine += rectD(397, 665, 206, 26)
  const knob = circle(500, 678, 7), knobInner = circle(500, 678, 3)
  fine += grainD([55, 652], [386, 652], [55, 700], [386, 700], 3, random) + grainD([614, 652], [945, 652], [614, 700], [945, 700], 3, random) + grainD([400, 668], [600, 668], [400, 690], [600, 690], 2, random)
  return { id: 'table', silhouette, lines: { heavy: path(heavy), medium: path(medium) + knob, fine: path(fine) + knobInner + knots } }
}

// ---------- 6. folded linen cloth ----------

const CLOTH = (() => {
  const back = [[272, 446], [330, 443], [400, 447], [470, 444], [540, 447], [600, 449]]
  const right = [[614, 490], [628, 530], [636, 572], [640, 604], [640, 640], [642, 664]]
  const flap = [[600, 666], [560, 662], [520, 667], [482, 664], [476, 640], [470, 634]]
  const front = [[420, 636], [360, 633], [300, 635], [250, 632]]
  // the left edge reaches well under the book stack so the books rest on the cloth's corner
  const left = [[150, 606], [146, 560], [158, 520], [200, 488], [238, 480]]
  return { outline: [...back, ...right, ...flap, ...front, ...left], crease: [[238, 480], [272, 446]], tip: [272, 480] }
})()
function clothLayer() {
  const o = CLOTH.outline
  const silhouette = path(curveD(o, { close: true, tension: .55 }))
  let heavy = curveD(wobble(o, .6), { close: true, tension: .55 })
  heavy += strokeD(238, 480, 272, 446, .6)
  let medium = '', fine = ''
  // folded-back corner at the back-left: the underside triangle with its own hem
  medium += strokeD(272, 446, 272, 480, .5) + strokeD(272, 480, 238, 480, .5)
  fine += polyD([[246, 474], [266, 474], [266, 454]], false)
  // hem all round, with stitching
  const hem = insetPolygon(o, 9)
  medium += curveD(hem, { close: true, tension: .55 })
  for (let i = 0; i < hem.length; i++) { const a = hem[i], b = hem[(i + 1) % hem.length]; fine += ticksD(a[0], a[1], b[0], b[1], 7.5, 4) }
  // pressed creases from the folding (double lines): the vertical one runs behind the folded corner and
  // disappears under the book stack, well away from the cup; the horizontal one crosses the whole cloth
  medium += strokeD(298, 452, 306, 570, 1.4, 6) + strokeD(224, 548, 638, 540, 1.4, 10)
  fine += strokeD(302, 454, 310, 568, 1, 6) + strokeD(226, 552, 636, 544, 1, 10)
  // soft folds radiating from the corner
  medium += curveD([[276, 478], [330, 500], [392, 512]]) + curveD([[280, 474], [340, 486], [410, 488]]) + curveD([[262, 486], [300, 530], [330, 580]])
  medium += curveD([[314, 456], [332, 472], [362, 484]]) + curveD([[560, 456], [586, 482], [604, 520]]) + curveD([[300, 616], [330, 598], [372, 590]])
  // ripple along the left edge
  medium += curveD([[172, 534], [200, 530], [232, 536]])
  // folds fanning out from under the teapot foot and from beside the saucer toward the front-right corner
  medium += curveD([[598, 564], [610, 594], [616, 630]]) + curveD([[568, 568], [580, 602], [578, 630]]) + curveD([[544, 566], [538, 600], [530, 628]]) + curveD([[474, 560], [490, 596], [504, 628]])
  fine += hatchD([[584, 580], [598, 584], [606, 622], [590, 626]], 15, 6)
  fine += `M620 598q4 3 9 1M622 612q5 -2 9 1M618 622q4 3 9 0M560 614q5 -3 9 0M548 622q4 3 9 0`
  // the flap hanging over the front edge: roll line and vertical folds
  medium += strokeD(476, 641, 640, 641, .6, 6)
  for (const x of [500, 538, 578, 616]) medium += curveD([[x, 642], [x + (random() - .5) * 4, 654], [x + 3, 664]])
  for (const x of [506, 584]) fine += hatchD([[x + 2, 644], [x + 14, 644], [x + 16, 662], [x + 4, 662]], 90, 5.5)
  // shading in the fold valleys beside the creases
  fine += hatchD([[316, 468], [332, 468], [332, 540], [318, 540]], 95, 6) + hatchD([[240, 548], [600, 540], [600, 552], [240, 560]], 8, 6, { inset: 6 })
  fine += hatchD([[262, 486], [272, 492], [300, 532], [288, 538]], 50, 6)
  return { id: 'cloth', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- 7. stack of two books ----------

function bookLayers() {
  // lower book: top face, front face (fore-edge) and right face
  // the stack sits well above the cloth's hem and front edge, so both pass clearly beneath it
  const b1 = { BL: [160, 568], BR: [310, 564], FR: [322, 596], FL: [166, 600], FLb: [166, 618], FRb: [322, 614], BRb: [310, 582] }
  const b2 = { BL: [176, 558], BR: [292, 554], FR: [300, 575], FL: [184, 579], FLb: [184, 593], FRb: [300, 589], BRb: [292, 568] }
  // ribbon bookmark: a flat, foreshortened strip lying on the cloth in front of the lower book's fore-edge
  const ribbon = [[244, 619], [254, 619], [261, 630], [249, 631]]
  const book = (b, id, thickness, title) => {
    const silhouette = path(polyD(hull(Object.values(b)))) + (title ? '' : path(polyD(ribbon)))
    let heavy = polyD([b.BL, b.BR, b.FR, b.FL]) + polyD([b.FL, b.FLb, b.FRb, b.FR], false) + polyD([b.BR, b.BRb, b.FRb], false)
    let medium = '', fine = ''
    const t = 3 / thickness
    // cover boards: thin lines inside the top and bottom of the page faces
    medium += polyD([lerpPt(b.FL, b.FLb, t), lerpPt(b.FR, b.FRb, t), lerpPt(b.BR, b.BRb, t)], false) + polyD([lerpPt(b.FL, b.FLb, 1 - t), lerpPt(b.FR, b.FRb, 1 - t), lerpPt(b.BR, b.BRb, 1 - t)], false)
    // page lines between the covers
    fine += polyD([lerpPt(b.FL, b.FLb, .52), lerpPt(b.FR, b.FRb, .52), lerpPt(b.BR, b.BRb, .52)], false)
    // short page-separation ticks along the fore-edge
    const a = lerpPt(b.FL, b.FLb, .3), c = lerpPt(b.FR, b.FRb, .3)
    fine += ticksD(a[0], a[1], c[0], c[1], 9, thickness * .35)
    if (title) {
      medium += polyD([lerpPt(b.BL, b.BR, .3), lerpPt(b.BL, b.BR, .72), lerpPt(b.FL, b.FR, .72), lerpPt(b.FL, b.FR, .3)].map(([x, y], i) => [x, y + (i < 2 ? 4 : -4)]))
      fine += lineD(214, 565, 250, 564) + lineD(216, 569, 242, 568)
    } else {
      medium += polyD(ribbon)
      fine += lineD(249, 622, 255, 628)
    }
    return { id, silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
  }
  return [book(b1, 'bookBottom', 18, false), book(b2, 'bookTop', 14, true)]
}

// ---------- 8. round teapot ----------

// The teapot sits low enough that its lid clears the sill shadow band, and far enough right that its handle
// stays clear of the cup's handle. Every part is placed relative to the body centre.
const TEAPOT = { cx: 575, cy: 494, rx: 70, ry: 56 }
const TP = ([dx, dy]) => [TEAPOT.cx + dx, TEAPOT.cy + dy]
const tp = (dx, dy) => pt(TP([dx, dy]))
function teapotLayer() {
  const { cx, cy, rx, ry } = TEAPOT
  const body = ellipsePts(cx, cy, rx, ry, 40)
  // the lid dome, closed along the FRONT half of its rim so the silhouette meets the body with no slit
  const lidArc = `M${tp(-32, -52)}Q${tp(0, -86)} ${tp(32, -52)}`
  const lid = `${lidArc}A32 8 0 0 1 ${tp(-32, -52)}Z`
  const lidRim = ellipse(cx, cy - 52, 32, 8)
  const knob = circle(cx, cy - 75, 7)
  const spout = [[51, -32], [71, -46], [91, -60], [105, -70], [113, -64], [105, -52], [89, -30], [67, -2], [51, 0]].map(TP)
  const handleOuter = [[-63, -38], [-87, -32], [-107, -14], [-110, 12], [-97, 34], [-69, 44], [-55, 42]].map(TP)
  const handleInner = [[-57, 30], [-77, 28], [-93, 16], [-93, -6], [-79, -22], [-61, -28]].map(TP)
  const foot = [[-36, 54], [36, 54], [40, 64], [-40, 64]].map(TP)
  const silhouette = path(curveD(body, { close: true })) + path(lid) + lidRim + knob + path(polyD(spout)) + path(curveD([...handleOuter, ...handleInner], { close: true, tension: .8 })) + path(polyD(foot)) + ellipse(cx, cy + 64, 40, 8)
  let heavy = curveD(wobble(arcPts(cx, cy, rx, ry, -63, 243, 30), .6), { tension: .9 })
  heavy += lidArc
  heavy += curveD(spout.slice(0, 4)) + curveD([spout[7], spout[6], spout[5], spout[4]]) + lineD(...spout[3], ...spout[4])
  heavy += curveD(handleOuter, { tension: .8 }) + curveD(handleInner, { tension: .8 })
  heavy += arcD(cx - 40, cy + 64, cx + 40, cy + 64, 40, 8, 0, 0)
  let medium = arcD(cx - 36, cy + 54, cx + 36, cy + 54, 36, 7, 0, 0) + lineD(cx - 40, cy + 64, cx - 36, cy + 54) + lineD(cx + 40, cy + 64, cx + 36, cy + 54)
  medium += arcD(cx - 66, cy - 18, cx + 66, cy - 18, 70, 13, 0, 0) + arcD(cx - 69, cy - 9, cx + 69, cy - 9, 70, 13, 0, 0)
  medium += `M${tp(51, -32)}Q${tp(60, -16)} ${tp(51, 0)}M${tp(-63, -38)}q6 8 2 10M${tp(-55, 42)}q-4 -8 -2 -12`
  const spoutMouth = ellipse(cx + 109, cy - 67, 5.5, 3.5, 45)
  let fine = ''
  // highlights on the upper left of the body and the lid, hatching on the shaded right side
  fine += curveD(arcPts(cx, cy, rx - 9, ry - 8, 196, 232, 6)) + curveD(arcPts(cx, cy, rx - 15, ry - 13, 202, 226, 5))
  fine += hatchD(crescent(cx, cy, rx - 3, ry - 3, -48, 72, 16), 68, 6) + hatchD(crescent(cx, cy, rx - 3, ry - 3, 92, 150, 9), 20, 6)
  fine += hatchD([[11, -74], [31, -66], [31, -54], [11, -56]].map(TP), 60, 5.5) + hatchD([[5, 56], [37, 56], [39, 64], [7, 64]].map(TP), 70, 5.5)
  fine += hatchD([[75, -28], [91, -38], [105, -52], [101, -42], [85, -18], [69, -4]].map(TP), 50, 5.5) + hatchD([[-103, 16], [-95, 30], [-71, 40], [-69, 34], [-89, 22], [-95, 10]].map(TP), 110, 5.5)
  // dotted band motif between the two decorative arcs
  for (let i = 0; i < 9; i++) { const t = (i + .5) / 9, a = Math.PI * t; const x = cx + Math.cos(Math.PI - a) * 66 * .96, y = cy - 13.5 + Math.sin(a) * 12.5; fine += `M${fmt(x - 2.5)} ${fmt(y)}l2.5 -2.5l2.5 2.5` }
  return { id: 'teapot', silhouette, outline: false, lines: { heavy: path(heavy) + knob, medium: path(medium) + lidRim + spoutMouth, fine: path(fine) } }
}

// ---------- 9. cup on a saucer with a spoon ----------

const CUP = { cx: 395, rim: 494, base: 552, saucer: 562 }
function saucerLayer() {
  const silhouette = ellipse(395, 562, 68, 19) + path(`M327 562A68 19 0 0 0 463 562L463 566A68 19 0 0 1 327 566Z`)
  const heavy = arcD(327, 562, 463, 562, 68, 19, 0, 1) + arcD(327, 566, 463, 566, 68, 19, 0, 0) + lineD(327, 562, 327, 566) + lineD(463, 562, 463, 566)
  const medium = path(arcD(327, 562, 463, 562, 68, 19, 0, 0)) + ellipse(395, 561, 44, 12)
  const fine = hatchD([[420, 552], [460, 558], [456, 572], [418, 572]], 12, 5.5, { inset: 3 }) + hatchD([[332, 556], [372, 552], [370, 570], [336, 570]], 170, 5.5, { inset: 3 })
  return { id: 'saucer', silhouette, outline: false, lines: { heavy: path(heavy), medium, fine: path(fine) } }
}
function cupLayer() {
  const body = `M355 494A40 11 0 1 1 435 494L421 552A26 7 0 0 1 369 552Z`
  const handleOuter = [[433, 506], [452, 508], [461, 524], [453, 542], [430, 546]]
  const handleInner = [[430, 540], [446, 538], [450, 524], [444, 514], [433, 514]]
  const silhouette = path(body) + path(curveD([...handleOuter, ...handleInner], { close: true, tension: .8 }))
  let heavy = arcD(355, 494, 435, 494, 40, 11, 0, 0) + strokeD(355, 494, 369, 552, .6) + strokeD(435, 494, 421, 552, .6) + arcD(369, 552, 421, 552, 26, 7, 0, 0)
  heavy += curveD(handleOuter, { tension: .8 }) + curveD(handleInner, { tension: .8 })
  let medium = arcD(355, 494, 435, 494, 40, 11, 0, 1) + arcD(359, 494, 431, 494, 36, 9, 0, 1) + arcD(362, 498, 428, 498, 33, 8, 0, 1)
  medium += arcD(372, 540, 418, 540, 24, 5, 0, 0)
  let fine = hatchD([[420, 502], [434, 500], [421, 551], [408, 551]], 78, 5.5) + hatchD([[398, 486], [430, 492], [427, 500], [402, 498]], 15, 5.5, { inset: 2 })
  fine += curveD([[362, 506], [360, 522], [364, 540]]) + hatchD([[446, 518], [456, 520], [454, 538], [444, 536]], 100, 5.5)
  return { id: 'cup', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}
function spoonLayer() {
  const bowl = [352, 574], tip = [452, 558]
  const dx = tip[0] - bowl[0], dy = tip[1] - bowl[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * 2.6, ny = ux * 2.6
  const s = [bowl[0] + ux * 9, bowl[1] + uy * 9]
  const handle = [[s[0] + nx, s[1] + ny], [tip[0] + nx * 1.3, tip[1] + ny * 1.3], [tip[0] + ux * 3, tip[1] + uy * 3], [tip[0] - nx * 1.3, tip[1] - ny * 1.3], [s[0] - nx, s[1] - ny]]
  const silhouette = ellipse(bowl[0], bowl[1], 12, 7, -9) + path(curveD(handle, { close: true, tension: .5 }))
  const heavy = path(curveD(handle, { close: true, tension: .5 })) + ellipse(bowl[0], bowl[1], 12, 7, -9)
  const medium = ellipse(bowl[0] + 1, bowl[1], 8, 4, -9)
  const fine = path(lineD(s[0] + ux * 6, s[1] + uy * 6, tip[0] - ux * 8, tip[1] - uy * 8))
  return { id: 'spoon', silhouette, outline: false, lines: { heavy, medium, fine } }
}

// ---------- 10. bowl of lemons (back rim, fruit, front of the bowl) ----------

const BOWL = { cx: 710, cy: 560, rx: 78, ry: 22 }
function bowlBackLayer() {
  const { cx, cy, rx, ry } = BOWL
  const silhouette = ellipse(cx, cy, rx, ry)
  const medium = arcD(cx - rx, cy, cx + rx, cy, rx, ry, 0, 1) + arcD(cx - rx + 8, cy, cx + rx - 8, cy, rx - 8, ry - 4, 0, 1)
  const fine = hatchD([...arcPts(cx, cy, rx - 8, ry - 4, 180, 360, 14), ...arcPts(cx, cy + 4, rx - 22, ry - 10, 360, 180, 14)], 0, 5.5)
  return { id: 'bowlBack', silhouette, outline: false, lines: { medium: path(medium), fine: path(fine) } }
}
function lemonLayer(id, lemons) {
  let silhouette = '', heavy = '', medium = '', fine = ''
  for (const [cx, cy, rx, ry, rot] of lemons) {
    const pts = lemonPts(cx, cy, rx, ry, rot)
    silhouette += path(curveD(pts, { close: true, tension: .9 }))
    heavy += curveD(wobble(pts, .5), { close: true, tension: .9 })
    const L = (x, y) => rotatePt([cx + x, cy + y], rot, [cx, cy])
    // the blossom end: a ring where the peel puckers into the nipple, and a soft crease line toward it
    medium += `M${pt(L(rx * .76, -6))}Q${pt(L(rx * 1.08, 0))} ${pt(L(rx * .76, 6))}`
    fine += `M${pt(L(rx * .5, -3))}Q${pt(L(rx * .68, 1))} ${pt(L(rx * .9, 0))}`
    // the stem end: a small star-shaped dimple
    const stem = L(-rx * .9, 0)
    for (let s = 0; s < 5; s++) { const a = (s / 5) * Math.PI * 2 + rot * Math.PI / 180; fine += `M${pt(stem)}l${fmt(Math.cos(a) * 3.5)} ${fmt(Math.sin(a) * 3.5)}` }
    // peel pores on the shaded side plus the crescent hatch
    fine += stippleD(cx, cy, rx, ry, rot, 12, 3.5)
    fine += hatchD(crescent(cx, cy, rx - 2.5, ry - 2.5, 30, 120, 8).map(p => rotatePt(p, rot, [cx, cy])), 25, 6)
  }
  return { id, silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}
function bowlFrontLayer() {
  const { cx, cy, rx, ry } = BOWL
  const silhouette = path(`M${fmt(cx - rx)} ${fmt(cy)}A${rx} ${ry} 0 0 0 ${fmt(cx + rx)} ${fmt(cy)}Q784 592 758 604A48 9 0 0 1 662 604Q636 592 ${fmt(cx - rx)} ${fmt(cy)}Z`)
  let heavy = curveD(wobble(arcPts(cx, cy, rx, ry, 0, 180, 24), .5)) + `M788 560Q784 592 758 604M632 560Q636 592 662 604` + arcD(662, 604, 758, 604, 48, 9, 0, 0)
  // a thin glaze band below the rim, the foot ring, and shading on the right and under the belly
  let medium = arcD(638, 572, 782, 572, 72, 20, 0, 0) + arcD(664, 600, 756, 600, 46, 8, 0, 0)
  let fine = arcD(642, 578, 778, 578, 68, 19, 0, 0) + hatchD([[748, 568], [786, 562], [760, 602], [734, 604]], 70, 6) + hatchD([[676, 590], [748, 590], [744, 600], [680, 600]], 5, 5.5, { inset: 2 })
  fine += curveD(arcPts(cx, cy + 8, rx - 14, 22, 150, 172, 4))
  return { id: 'bowlFront', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium), fine: path(fine) } }
}

// ---------- 11. glass vase with eucalyptus ----------

const VASE = { cx: 868, base: 620, top: 548, rx: 30, mouth: 524 }
/** The glass body and the eucalyptus leaves as separate shapes for the authored guide. */
const VASE_PARTS = { glass: '', sprig: '' }
function vaseLayer() {
  const { cx, base, top, rx, mouth } = VASE
  const body = `M${fmt(cx - rx)} ${fmt(base)}L${fmt(cx - rx)} ${fmt(top)}Q${fmt(cx - rx)} ${fmt(top - 14)} ${fmt(cx - 13)} ${fmt(top - 20)}L${fmt(cx - 13)} ${fmt(mouth)}A13 4 0 1 1 ${fmt(cx + 13)} ${fmt(mouth)}L${fmt(cx + 13)} ${fmt(top - 20)}Q${fmt(cx + rx)} ${fmt(top - 14)} ${fmt(cx + rx)} ${fmt(top)}L${fmt(cx + rx)} ${fmt(base)}A${rx} 7 0 0 1 ${fmt(cx - rx)} ${fmt(base)}Z`
  let silhouette = path(body)
  VASE_PARTS.glass = path(body)
  let heavy = strokeD(cx - rx, base, cx - rx, top, .5) + `Q${fmt(cx - rx)} ${fmt(top - 14)} ${fmt(cx - 13)} ${fmt(top - 20)}` + strokeD(cx - 13, top - 20, cx - 13, mouth, .4)
  heavy += strokeD(cx + rx, base, cx + rx, top, .5) + `Q${fmt(cx + rx)} ${fmt(top - 14)} ${fmt(cx + 13)} ${fmt(top - 20)}` + strokeD(cx + 13, top - 20, cx + 13, mouth, .4)
  heavy += arcD(cx - rx, base, cx + rx, base, rx, 7, 0, 0)
  let mediumEl = ellipse(cx, mouth, 13, 4) + ellipse(cx, 578, rx, 7)
  let medium = arcD(cx - rx, base, cx + rx, base, rx, 7, 0, 1)
  let fine = lineD(cx - 21, 566, cx - 21, 612) + lineD(cx - 17, 580, cx - 17, 606) + hatchD([[cx + 16, 556], [cx + 28, 556], [cx + 28, 616], [cx + 16, 616]], 85, 6)
  // stems: seen through the glass below the mouth, kinked at the water line
  fine += `M${fmt(cx - 4)} ${fmt(mouth + 2)}L${fmt(cx - 8)} 576M${fmt(cx - 12)} 579L${fmt(cx - 14)} 612M${fmt(cx + 3)} ${fmt(mouth + 2)}L${fmt(cx + 6)} 576M${fmt(cx + 10)} 579L${fmt(cx + 12)} 610`
  const stems = [
    [[cx - 4, mouth], [cx - 8, 500], [cx - 20, 478], [cx - 30, 460], [cx - 36, 444]],
    [[cx + 3, mouth], [cx + 12, 502], [cx + 20, 484], [cx + 26, 466], [cx + 28, 450]],
  ]
  for (const stem of stems) {
    medium += curveD(stem)
    for (let i = 1; i < stem.length; i++) {
      const a = stem[i - 1], b = stem[i], m = lerpPt(a, b, .55)
      const dir = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
      for (const side of [1, -1]) {
        const ang = dir + side * 62
        const r = rotatePt([13, 0], ang)
        const c = [m[0] + r[0], m[1] + r[1]]
        silhouette += ellipse(c[0], c[1], 11, 7.5, ang)
        VASE_PARTS.sprig += ellipse(c[0], c[1], 11, 7.5, ang)
        mediumEl += ellipse(c[0], c[1], 11, 7.5, ang)
        medium += `M${pt(m)}L${pt([m[0] + r[0] * .3, m[1] + r[1] * .3])}`
        fine += lineD(m[0] + r[0] * .25, m[1] + r[1] * .25, c[0] + r[0] * .7, c[1] + r[1] * .7)
      }
    }
  }
  return { id: 'vase', silhouette, outline: false, lines: { heavy: path(heavy), medium: path(medium) + mediumEl, fine: path(fine) } }
}

// ---------- shadows and facets ----------

const FOOTPRINTS = {
  saucer: ellipsePts(395, 564, 68, 19, 24),
  teapot: ellipsePts(TEAPOT.cx, TEAPOT.cy + 66, 40, 8, 20),
  bowl: ellipsePts(710, 604, 48, 9, 20),
  vase: ellipsePts(868, 620, 30, 7, 16),
  books: [[166, 618], [322, 614], [310, 582], [160, 586]],
}
const POT_FOOT = ellipsePts(648, 383, 24, 4, 16)
function shadowSet(dx, dy, sillDx, sillDy) {
  return Object.values(FOOTPRINTS).map(fp => castClipped(fp, dx, dy)).join('') + castClipped(POT_FOOT, sillDx, sillDy)
}
const shadows = {
  'upper-left': shadowSet(44, 18, 22, 7),
  'upper-right': shadowSet(-44, 18, -22, 7),
  'left': shadowSet(62, 6, 30, 4),
  'right': shadowSet(-62, 6, -30, 4),
}
const longShadows = {
  'upper-left': shadowSet(108, 40, 48, 12),
  'upper-right': shadowSet(-108, 40, -48, 12),
  'left': shadowSet(150, 12, 70, 6),
  'right': shadowSet(-150, 12, -70, 6),
}
const facets = {
  // faces in shade when light comes from the LEFT: right-hand sides
  left: path(polyD(crescent(TEAPOT.cx, TEAPOT.cy, TEAPOT.rx, TEAPOT.ry, -50, 75, 18))) + path(polyD([[421, 496], [435, 494], [421, 552], [409, 552]]))
    + path(polyD([[768, 562], [788, 560], [758, 604], [740, 604]])) + path(polyD([[310, 564], [322, 596], [322, 614], [310, 582]])) + path(polyD([[292, 554], [300, 575], [300, 589], [292, 568]]))
    + path(polyD([[668, 331], [681, 331], [672, 382], [660, 382]])) + path(polyD([[884, 548], [898, 548], [898, 620], [884, 620]])) + path(polyD(crescent(TEAPOT.cx, TEAPOT.cy - 75, 7, 7, -60, 80, 4)))
    + path(polyD([[-3, 56], [40, 64], [37, 71], [0, 72]].map(TP))),
  // faces in shade when light comes from the RIGHT: left-hand sides
  right: path(polyD(crescent(TEAPOT.cx, TEAPOT.cy, TEAPOT.rx, TEAPOT.ry, 105, 240, 18))) + path(polyD([[355, 494], [369, 496], [381, 552], [369, 552]]))
    + path(polyD([[632, 560], [652, 562], [680, 604], [662, 604]])) + path(polyD([[166, 600], [180, 599], [180, 618], [166, 618]])) + path(polyD([[184, 579], [196, 578], [196, 593], [184, 593]]))
    + path(polyD([[615, 331], [628, 331], [636, 382], [624, 382]])) + path(polyD([[838, 548], [852, 548], [852, 620], [838, 620]])) + path(polyD(crescent(TEAPOT.cx, TEAPOT.cy - 75, 7, 7, 100, 240, 4)))
    + path(polyD([[-40, 64], [3, 56], [0, 72], [-37, 71]].map(TP))),
}

const [bookBottom, bookTop] = bookLayers()
const layers = [
  wallLayer(), sashLayer(), curtainLayer(), plantLayer(), tableLayer(), clothLayer(), bookBottom, bookTop,
  teapotLayer(), saucerLayer(), cupLayer(), spoonLayer(),
  bowlBackLayer(), lemonLayer('fruitBack', [[706, 532, 27, 17, -8]]), lemonLayer('fruit', [[674, 550, 28, 18, -22], [736, 548, 28, 18, 16]]), bowlFrontLayer(),
  vaseLayer(),
]
/** Silhouettes of the layers drawn after `id`, which hide hand-written guide shapes the way they hide layers. */
const inFrontOf = id => layers.slice(layers.findIndex(layer => layer.id === id) + 1).map(layer => layer.silhouette)
const panes = path(PANES.map(p => rectD(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0)).join(''))
export const scene = {
  id: 'window-still-life',
  indoor: true,
  wash: '#f5ead5',
  layers,
  // Named masks for the authored beginner guide: parts of a region a beginner paints in a different colour.
  guides: [
    // the wall and the window wood without the panes, so the wall wash can skip the glass
    { id: 'plaster', shape: cutout(path(rectD(55, 55, 890, 375)), [panes, ...inFrontOf('sash')]) },
    // the six panes only: left pale as sky, with the basil and the curtain in front of them cut out
    { id: 'glass', shape: cutout(panes, inFrontOf('sash')) },
    { id: 'sash', layers: ['sash'] },
    { id: 'herb-pot', shape: cutout(PLANT_PARTS.pot, [PLANT_PARTS.leaves]) },
    { id: 'herb-leaves', shape: PLANT_PARTS.leaves },
    { id: 'lemons', layers: ['fruitBack', 'fruit'] },
    { id: 'bowl', layers: ['bowlBack', 'bowlFront'] },
    { id: 'vase-glass', shape: VASE_PARTS.glass },
    { id: 'eucalyptus', shape: VASE_PARTS.sprig },
  ],
  regions: [
    { id: 'wall', label: '벽과 창문', material: 'stone', wash: '#e6ebe4', layers: ['wall', 'sash'] },
    { id: 'curtain', label: '커튼', material: 'fabric', wash: '#f1e0d6', layers: ['curtain'] },
    { id: 'table', label: '나무 테이블', material: 'wood', wash: '#e8d5b8', layers: ['table'] },
    { id: 'cloth', label: '접힌 천', material: 'fabric', wash: '#f2ece0', layers: ['cloth'] },
    { id: 'books', label: '책', material: 'other', wash: '#dfd4c8', layers: ['bookBottom', 'bookTop'] },
    { id: 'teapot', label: '찻주전자', material: 'ceramic', wash: '#d9e2e6', layers: ['teapot'] },
    { id: 'cup', label: '컵과 접시', material: 'ceramic', wash: '#f3f0e6', layers: ['saucer', 'cup', 'spoon'] },
    { id: 'fruit', label: '과일과 그릇', material: 'other', wash: '#f4ecc6', layers: ['bowlBack', 'fruitBack', 'fruit', 'bowlFront'] },
    { id: 'plants', label: '창가 화분', material: 'foliage', wash: '#cfdcc2', layers: ['plant'] },
    { id: 'vase', label: '유리 화병', material: 'other', wash: '#e0ebee', layers: ['vase'] },
  ],
  shadows,
  longShadows,
  facets,
}
