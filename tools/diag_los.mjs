// Diagnose which collider(s) block every LOS ray.
// Run: node --experimental-default-type=module tools/diag_los.mjs
import * as THREE from 'three';

function fakeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      if (p === 'getImageData' || p === 'createImageData')
        return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: () => fakeCtx(), addEventListener() {} }; },
  createElementNS() { return { width: 0, height: 0, getContext: () => fakeCtx(), addEventListener() {} }; },
  addEventListener() {},
  getElementById() { return null; },
};
globalThis.window = { addEventListener() {} };
globalThis.addEventListener = () => {};

const { World } = await import('../world.js');
const { buildChineseArt } = await import('../wallart.js');

const world = new World({ add() {} });
buildChineseArt(world);

// slab test copy of hasLOS, per-box
function hitsBox(from, dir, len, b) {
  let tmin = 0, tmax = len;
  const mins = [b.min.x, b.min.y, b.min.z];
  const maxs = [b.max.x, b.max.y, b.max.z];
  const o = [from.x, from.y, from.z];
  const d = [dir.x, dir.y, dir.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < mins[a] || o[a] > maxs[a]) return false;
    } else {
      let t1 = (mins[a] - o[a]) / d[a];
      let t2 = (maxs[a] - o[a]) / d[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

// NaN check
world.colliders.forEach((b, i) => {
  if (Number.isNaN(b.min.x) || Number.isNaN(b.max.x) || Number.isNaN(b.min.y) || Number.isNaN(b.max.y) || Number.isNaN(b.min.z) || Number.isNaN(b.max.z))
    console.log('NaN BOX', i, JSON.stringify(b));
});

// horizontal open-air ray through map center
const from = new THREE.Vector3(0, 1.6, 35);
const to = new THREE.Vector3(0, 1.6, -35);
const dir = to.clone().sub(from);
const len = dir.length();
dir.normalize();
world.colliders.forEach((b, i) => {
  if (hitsBox(from, dir, len, b)) {
    console.log('BLOCKS center ray:', i, 'min=', b.min.toArray().map(v => +v.toFixed(2)).join(','), ' max=', b.max.toArray().map(v => +v.toFixed(2)).join(','));
  }
});

// stats: box with largest footprint
let biggest = null, area = -1;
world.colliders.forEach((b, i) => {
  const a = (b.max.x - b.min.x) * (b.max.z - b.min.z);
  if (a > area) { area = a; biggest = { i, b }; }
});
console.log('biggest footprint box:', biggest.i, 'area', area.toFixed(1), 'min', biggest.b.min.toArray(), 'max', biggest.b.max.toArray());
