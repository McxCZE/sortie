import {
  BufferGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Vector2,
  Vector3,
} from "three";

export const HEIGHT = 3.2;
export const PROFILE: [number, number][] = [
  [0, 0.08],
  [0.4, 0.08],
  [0.49, 0.14],
  [0.51, 0.25],
  [0.51, 2.46],
  [0.48, 2.59],
  [0.32, 2.79],
  [0.22, 2.91],
  [0.22, HEIGHT],
];
const samples: { x: number; y: number; weight: number }[] = [];
for (let j = 0; j < 48; j++) {
  const y = 0.09 + (j / 47) * (HEIGHT - 0.09);
  let radius = 0.22;
  for (let k = 1; k < PROFILE.length; k++) {
    const [r0, y0] = PROFILE[k - 1],
      [r1, y1] = PROFILE[k];
    if (y >= y0 && y <= y1 && y1 > y0) {
      radius = r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      break;
    }
  }
  for (let r = 0; r < 3; r++)
    for (let a = 0; a < 12; a++)
      samples.push({
        x: radius * Math.sqrt((r + 0.5) / 3) * Math.cos((a * Math.PI) / 6),
        y,
        weight: radius * radius,
      });
}
const total = samples.reduce((sum, s) => sum + s.weight, 0);
export function fillHeight(fraction: number, angle: number) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const ordered = samples
    .map((p) => ({ h: p.y * c - p.x * s, w: p.weight }))
    .sort((a, b) => a.h - b.h);
  const wanted = Math.max(0, Math.min(1, fraction)) * total;
  let accumulated = 0;
  for (const p of ordered) {
    accumulated += p.w;
    if (accumulated >= wanted) return p.h;
  }
  return ordered.at(-1)!.h;
}
// At the pouring angle the surface meets the lower edge of the open neck.
export function pouringAngle(fraction: number) {
  let low = 0,
    high = Math.PI * 0.55;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2,
      c = Math.cos(mid),
      s = Math.sin(mid),
      lip = HEIGHT * c - 0.22 * s;
    const retained =
      samples.reduce(
        (sum, p) => sum + (p.y * c - p.x * s <= lip ? p.weight : 0),
        0,
      ) / total;
    if (retained > fraction) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
export function createLiquidGeometry() {
  const geometry = new BufferGeometry();
  // A fixed buffer avoids allocating GPU resources during each animation frame.
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(30000), 3),
  );
  geometry.setDrawRange(0, 0);
  return geometry;
}
const wall = new LatheGeometry(
  PROFILE.map(([r, y]) => new Vector2(r, y)),
  40,
).toNonIndexed();
const vertices = wall.getAttribute("position");
export function updateLiquid(
  geometry: BufferGeometry,
  fraction: number,
  angle: number,
  lowerFraction = 0,
) {
  const height = fillHeight(fraction, angle),
    lowerHeight =
      lowerFraction > 0 ? fillHeight(lowerFraction, angle) : -Infinity;
  if (fraction <= lowerFraction + 0.00001) {
    geometry.setDrawRange(0, 0);
    return height;
  }
  const normal = new Vector3(-Math.sin(angle), Math.cos(angle), 0);
  const out = geometry.getAttribute("position"),
    topCuts: Vector3[] = [],
    bottomCuts: Vector3[] = [];
  let count = 0;
  const write = (a: Vector3, b: Vector3, c: Vector3) => {
    for (const p of [a, b, c]) out.setXYZ(count++, p.x, p.y, p.z);
  };
  function clip(
    polygon: Vector3[],
    boundary: number,
    sign: number,
    cuts: Vector3[],
  ) {
    const result: Vector3[] = [];
    for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j],
        b = polygon[(j + 1) % polygon.length],
        da = (a.dot(normal) - boundary) * sign,
        db = (b.dot(normal) - boundary) * sign;
      if (da <= 0) result.push(a);
      if (da <= 0 !== db <= 0) {
        const p = a.clone().lerp(b, da / (da - db));
        result.push(p);
        cuts.push(p);
      }
    }
    return result;
  }
  for (let i = 0; i < vertices.count; i += 3) {
    let polygon = [0, 1, 2].map((j) =>
      new Vector3().fromBufferAttribute(vertices, i + j),
    );
    polygon = clip(polygon, height, 1, topCuts);
    if (lowerFraction > 0) polygon = clip(polygon, lowerHeight, -1, bottomCuts);
    for (let j = 1; j < polygon.length - 1; j++)
      write(polygon[0], polygon[j], polygon[j + 1]);
  }
  function cap(cuts: Vector3[], reverse: boolean) {
    if (cuts.length < 3) return;
    const center = cuts
        .reduce((v, p) => v.add(p), new Vector3())
        .multiplyScalar(1 / cuts.length),
      axis = new Vector3(Math.cos(angle), Math.sin(angle), 0);
    cuts.sort(
      (a, b) =>
        Math.atan2(a.z - center.z, a.clone().sub(center).dot(axis)) -
        Math.atan2(b.z - center.z, b.clone().sub(center).dot(axis)),
    );
    for (let i = 0; i < cuts.length; i++) {
      const a = cuts[i],
        b = cuts[(i + 1) % cuts.length];
      write(center, reverse ? a : b, reverse ? b : a);
    }
  }
  cap(topCuts, false);
  cap(bottomCuts, true);
  geometry.setDrawRange(0, count);
  out.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return height;
}
export const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export const UNIT_VOLUME = 0.215;
