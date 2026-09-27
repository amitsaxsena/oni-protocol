// Headless sim: real world.js + wallart.js colliders, real bots.js logic.
// Run: node --experimental-default-type=module tools/sim_bots.mjs
import * as THREE from 'three';

// ── minimal DOM stub for canvas texture generation ──
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
  createElement(tag) {
    return { width: 0, height: 0, style: {}, getContext: () => fakeCtx(), addEventListener() {}, removeEventListener() {} };
  },
  createElementNS() { return { width: 0, height: 0, getContext: () => fakeCtx(), addEventListener() {} }; },
  addEventListener() {},
  getElementById() { return null; },
};
globalThis.window = { addEventListener() {} };
globalThis.addEventListener = () => {};

const { World, ARENA } = await import('../world.js');
const { buildChineseArt } = await import('../wallart.js');
const { BotManager } = await import('../bots.js');

const sceneStub = { add() {}, remove() {} };
const world = new World(sceneStub);
buildChineseArt(world);
console.log('colliders:', world.colliders.length, ' solidMeshes:', world.solidMeshes.length);

// ── BotManager with instrumentation ──
let shootCalls = 0, losTrue = 0, losFalse = 0, damageEvents = 0, meleeCalls = 0, slamCalls = 0;
const fxStub = { spawnPortal() {}, impact() {}, muzzleFlash() {} };
const sfxStub = { botSpawn() {}, botShot() {} };
const mgr = new BotManager(sceneStub, world, fxStub, sfxStub, {
  onPlayerDamage() { damageEvents++; },
  onWaveStart() {}, onWaveClear() {},
  onSlam() { slamCalls++; },
  onMelee() { meleeCalls++; damageEvents++; },
});

const origHasLOS = mgr.hasLOS.bind(mgr);
mgr.hasLOS = (a, b) => { const r = origHasLOS(a, b); r ? losTrue++ : losFalse++; return r; };
const origShoot = mgr.botShoot.bind(mgr);
mgr.botShoot = (bot, player) => { shootCalls++; return origShoot(bot, player); };

// player: standing still in the open
const player = { pos: new THREE.Vector3(0, 1.62, 26), alive: true, hp: 100 };

mgr.startWave(1);
const dt = 1 / 60;
let frames = 0;
for (let s = 0; s < 60; s++) {
  for (let i = 0; i < 60; i++) {
    mgr.update(dt, player, s + i / 60);
    frames++;
  }
}
console.log('frames:', frames);
console.log('alive bots:', mgr.bots.filter(b => b.alive).length, ' queued:', mgr.spawnQueue.length);
console.log('LOS true/false calls:', losTrue, '/', losFalse);
console.log('botShoot calls:', shootCalls, ' projectiles alive:', mgr.projectiles.length);
console.log('damage events (proj+melee):', damageEvents, ' melee:', meleeCalls, ' slam:', slamCalls);
console.log('bot states:', mgr.bots.map(b => `${b.typeKey} hp=${b.hp} d=${b.pos.distanceTo(player.pos).toFixed(1)}`).join(' | '));

// ── raw LOS sanity: open-field pairs ──
let t = 0, f = 0;
const P = () => new THREE.Vector3((Math.random() - .5) * 70, 1.6, (Math.random() - .5) * 70);
for (let i = 0; i < 2000; i++) origHasLOS(P(), P()) ? t++ : f++;
console.log('random open-air LOS true/false:', t, '/', f);
