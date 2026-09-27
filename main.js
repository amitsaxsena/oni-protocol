// ═══════════════════ ONI PROTOCOL — main game ═══════════════════
import * as THREE from 'three';
import { World } from './world.js?v=9';
import { Player } from './player.js?v=10';
import { WeaponSystem, WEAPONS, animateViewmodel } from './weapons.js?v=10';
import { BotManager } from './bots.js?v=10';
import { FXSystem } from './effects.js?v=9';
import { initAudio, toggleAudio, startAmbient, sfx } from './audio.js?v=9';
import { buildChineseArt } from './wallart.js?v=9';

// ── renderer / scene ──
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // retina pe 2 nahi — 1.5 = ~45% fewer pixels (lag fix)
renderer.shadowMap.enabled = false;  // no object casts shadows → pass was pure wasted GPU time

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
scene.fog = new THREE.Fog(0xc8d4e8, 75, 230);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 300);
scene.add(camera);

// bright desert sun lighting (CS:GO style) + real shadows
scene.add(new THREE.HemisphereLight(0xbdd4ee, 0xc2a878, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
sun.position.set(40, 60, -25);
sun.castShadow = false;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 160;
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.bias = -0.0004;
scene.add(sun);
const sunFill = new THREE.DirectionalLight(0xd8e4ff, 0.35);
sunFill.position.set(-30, 40, 30);
scene.add(sunFill);

// ── systems ──
const world = new World(scene);
buildChineseArt(world);
const fx = new FXSystem(scene);
const player = new Player(camera, canvas);
scene.add(player.body.group);
const weapons = new WeaponSystem(camera);
const bots = new BotManager(scene, world, fx, sfx, {
  onPlayerDamage: (dmg, pos) => damagePlayer(dmg, pos),
  onWaveStart: (n) => {
    showBanner(`WAVE ${n}`, 'ENEMIES INBOUND');
    hud.waveLine.textContent = n;
    updateWaveEnemies();
  },
  onWaveClear: (n) => {
    sfx.waveClear();
    showBanner(`WAVE ${n} CLEAR`, 'AREA SECURE');
    score += 500 * n;
    updateScore();
    waveState = 'intermission';
    intermissionT = 4.5;
    updateWaveEnemies();
  },
  onSlam: (bot, dmg) => damagePlayer(dmg, bot.pos),
  onMelee: (bot, dmg) => {
    const toB = new THREE.Vector3().subVectors(player.pos, bot.pos).normalize();
    damagePlayer(dmg, player.pos.clone().addScaledVector(toB, -1.5));
  },
});

// ═══════════════ GAME STATE ═══════════════
let state = 'menu';           // menu | playing | paused | dead
let waveState = 'idle';       // idle | intermission
let intermissionT = 0;
let score = 0, kills = 0;
let shotsFired = 0, shotsHit = 0;
let combo = 0, comboTimer = 0;
let shakeAmt = 0;
let lastDamageT = -99;
let autoReloadT = 0;
let _stepAcc = 0, _wasCrouch = false, _prevLand = 0;

// ═══════════════ HUD ═══════════════
const $ = id => document.getElementById(id);
const hud = {
  healthNum: $('health-num'), healthBar: $('health-bar'), dashFill: $('dash-cd-fill'),
  reloadBarOuter: $('reload-bar-outer'), reloadBar: $('reload-bar'),
  weaponName: $('weapon-name'), mag: $('ammo-mag'), reserve: $('ammo-reserve'),
  reloadHint: $('reload-hint'), slots: { 1: $('slot-1'), 2: $('slot-2'), 3: $('slot-3') },
  waveLine: $('wave-line'), waveEnemies: $('wave-enemies'),
  score: $('score-num'), killfeed: $('killfeed'),
  crosshair: $('crosshair'), hitmarker: $('hitmarker'), combo: $('combo'),
  scopeOverlay: $('scope-overlay'),
  banner: $('banner'), bannerMain: $('banner-main'), bannerSub: $('banner-sub'),
  vDmg: $('vignette-damage'), vDash: $('vignette-dash'), vHeal: $('vignette-heal'),
  damageLayer: $('damage-layer'),
};

function showBanner(main, sub) {
  hud.bannerMain.textContent = main;
  hud.bannerSub.textContent = sub;
  hud.banner.style.opacity = 1;
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => hud.banner.style.opacity = 0, 2200);
}

function updateHealth() {
  hud.healthNum.textContent = Math.ceil(player.hp);
  hud.healthBar.style.width = (player.hp / player.maxHp * 100) + '%';
  hud.healthBar.classList.toggle('critical', player.hp < 30);
}

function updateAmmo() {
  const w = weapons.state;
  hud.weaponName.textContent = w.name;
  if (w.sfx === 'katana') {
    hud.mag.textContent = '∞';
    hud.reserve.textContent = '';
    hud.reloadHint.textContent = '';
    hud.reloadBarOuter.style.display = 'none';
    return;
  }
  hud.mag.textContent = w.mag;
  hud.mag.classList.toggle('low', w.mag <= w.magSize * 0.25);
  hud.reserve.textContent = ` / ${w.reserve}`;
  hud.reloadHint.textContent = weapons.reloading ? 'RELOADING…' : (w.mag === 0 ? 'PRESS R TO RELOAD' : '');
  if (weapons.reloading) {
    const left = Math.max(0, weapons.reloadEnd - nowS());
    hud.reloadBarOuter.style.display = 'block';
    hud.reloadBar.style.width = (100 * (1 - left / w.reloadTime)) + '%';
  } else {
    hud.reloadBarOuter.style.display = 'none';
  }
}

function updateScore() { hud.score.textContent = score; }
function updateWaveEnemies() { hud.waveEnemies.textContent = `HOSTILES: ${bots.aliveCount}`; }
function updateSlots() {
  Object.entries(hud.slots).forEach(([k, el]) => el.classList.toggle('active', +k === weapons.state.slot));
}

// floating damage numbers
const dmgNums = [];
function spawnDmgNum(worldPos, text, cls = '') {
  const v = worldPos.clone().project(camera);
  if (v.z > 1) return;
  const el = document.createElement('div');
  el.className = 'dmg-num ' + cls;
  el.textContent = text;
  const x = (v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 30;
  const y = (-v.y * 0.5 + 0.5) * innerHeight + (Math.random() - 0.5) * 30;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  hud.damageLayer.appendChild(el);
  dmgNums.push({ el, x, y, vy: -55 - Math.random() * 30, life: 0.85, max: 0.85 });
}

function updateDmgNums(dt) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const d = dmgNums[i];
    d.life -= dt;
    d.y += d.vy * dt;
    d.vy += 60 * dt;
    d.el.style.transform = `translate(0px, ${d.y - parseFloat(d.el.style.top)}px)`;
    d.el.style.opacity = Math.max(0, d.life / d.max);
    if (d.life <= 0) { d.el.remove(); dmgNums.splice(i, 1); }
  }
}

function addKillfeed(text, pts) {
  const el = document.createElement('div');
  el.className = 'feed-item';
  el.innerHTML = `${text}<span class="pts">+${pts}</span>`;
  hud.killfeed.prepend(el);
  while (hud.killfeed.children.length > 5) hud.killfeed.lastChild.remove();
  setTimeout(() => { el.classList.add('fading'); setTimeout(() => el.remove(), 600); }, 2600);
}

function hitmarker(head = false) {
  const hm = hud.hitmarker;
  hm.classList.remove('pop', 'head');
  void hm.offsetWidth;
  if (head) hm.classList.add('head');
  hm.classList.add('pop');
}

function showCombo() {
  if (combo < 2) return;
  hud.combo.textContent = `${combo} KILL COMBO x${combo}`;
  hud.combo.classList.remove('show');
  void hud.combo.offsetWidth;
  hud.combo.classList.add('show');
  sfx.combo(Math.min(combo, 8));
}

function shake(a) { shakeAmt = Math.min(1.2, shakeAmt + a); }

// ═══════════════ SHOOTING ═══════════════
const raycaster = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _botMeshes = [];

function refreshBotMeshes() {
  _botMeshes.length = 0;
  for (const b of bots.bots) if (b.alive) for (const p of b.hitParts) _botMeshes.push(p);
  return _botMeshes;
}

function isMoving() {
  return player.keys['KeyW'] || player.keys['KeyA'] || player.keys['KeyS'] || player.keys['KeyD'];
}

function fireShot(nowS) {
  const w = weapons.state;

  if (w.sfx === 'katana') {
    weapons.addShotTime(nowS);
    sfx.katana();
    hud.crosshair.classList.add('melee');
    setTimeout(() => hud.crosshair.classList.remove('melee'), 150);
    fx.slash(weapons.gunTip, camera.quaternion);
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    fwd.y = 0; fwd.normalize();
    const tip = player.pos.clone().addScaledVector(fwd, 1.6);
    let hitAny = false;
    for (const bot of bots.bots) {
      if (!bot.alive) continue;
      const bp = bot.pos.clone().add(new THREE.Vector3(0, 1, 0));
      if (bp.distanceTo(tip) < 1.7 + bot.radius) {
        const hs = bot.typeKey !== 'brute' && Math.abs(bp.y - player.pos.y) < 0.9;
        const dmg = Math.round(WEAPONS.katana.damage * (hs ? 1.5 : 1));
        const killed = bot.damage(dmg, hs);
        spawnDmgNum(bp, dmg, hs ? 'head' : '');
        fx.impact(bp, fwd.clone().negate(), 0x8ee8ff, 10);
        if (killed) onBotKilled(bot, hs); else sfx.hit();
        hitAny = true;
      }
    }
    if (hitAny) { sfx.katanaHit(); hitmarker(); }
    return;
  }

  // guns
  if (w.mag <= 0) {
    sfx.dryFire();
    // AUTO-RELOAD when empty
    if (w.reserve > 0 && weapons.startReload(nowS)) { sfx.reload(); updateAmmo(); }
    return;
  }
  weapons.addShotTime(nowS);
  weapons.spendAmmo();
  shotsFired += w.pellets;

  sfx[w.sfx]();
  hud.crosshair.classList.add('fire');
  setTimeout(() => hud.crosshair.classList.remove('fire'), 90);

  const tip = player.thirdPerson
    ? camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 2.4)
    : weapons.gunTip;
  camera.getWorldDirection(_dir);
  fx.muzzleFlash(tip, _dir.clone(), 0xffc66a, w.slot === 2 ? 1.6 : 1);
  player.recoilPitch += w.recoil;
  weapons.vm.userData.kick = 1;
  if (w.slot === 2) player.vel.addScaledVector(_dir.clone().negate(), 2.5);

  let anyHit = false, headshot = false;
  for (let p = 0; p < w.pellets; p++) {
    camera.getWorldDirection(_dir);
    const sp = (isMoving() ? w.spreadMoving : w.spread) || 0;
    const dir = _dir.clone().add(new THREE.Vector3(
      (Math.random() - .5) * 2 * sp, (Math.random() - .5) * 2 * sp, (Math.random() - .5) * 2 * sp
    )).normalize();
    _eye.copy(player.pos);
    raycaster.set(_eye, dir);
    raycaster.far = w.range;

    const hitB = raycaster.intersectObjects(refreshBotMeshes(), false)[0];
    let hitW = null;
    for (const h of raycaster.intersectObjects(world.solidMeshes, false)) {
      hitW = h; break;
    }

    const end = hitB ? hitB.point : (hitW ? hitW.point : _eye.clone().addScaledVector(dir, w.range));
    fx.tracer(tip, end, w.tracerColor, w.slot === 2 ? 0.05 : 0.03);

    if (hitB && (!hitW || hitB.distance <= hitW.distance)) {
      const bot = hitB.object.userData.bot;
      const hs = hitB.object.userData.part === 'head';
      const dmg = Math.round(w.damage * (hs ? w.headMult : 1));
      const killed = bot.damage(dmg, hs);
      shotsHit++; anyHit = true; headshot = headshot || hs;
      fx.impact(hitB.point, hitB.face ? hitB.face.normal.clone() : new THREE.Vector3(0, 1, 0), 0xaa1111, 6);
      fx.blood(hitB.point, dir);
      spawnDmgNum(hitB.point, dmg, hs ? 'head' : '');
      if (killed) onBotKilled(bot, hs);
    } else if (hitW) {
      fx.impact(hitW.point, hitW.face ? hitW.face.normal.clone() : new THREE.Vector3(0, 1, 0), 0xd8c090, 4);
      fx.bulletHole(hitW.point, hitW.face ? hitW.face.normal : new THREE.Vector3(0, 1, 0));
      tryChainDrums(hitW.point, 0);
    }
  }

  if (anyHit) { hitmarker(headshot); if (headshot) sfx.headshot(); }
  updateAmmo();
}

// ═══════════════ DRUMS ═══════════════
function tryChainDrums(point, depth) {
  if (depth > 3) return;
  for (const d of world.getAliveDrums()) {
    if (d.pos.distanceTo(point) < 2.2) { explodeDrum(d, depth); return; }
  }
}

function explodeDrum(drum, depth = 0) {
  if (!world.explodeDrum(drum)) return;
  const pos = drum.pos.clone();
  fx.explosion(pos, true);
  sfx.explosion(true);
  shake(0.5);
  for (const b of bots.bots) {
    if (!b.alive) continue;
    const bp = b.pos.clone().add(new THREE.Vector3(0, 1, 0));
    const dist = bp.distanceTo(pos);
    if (dist < 6) {
      const dmg = Math.round(160 * (1 - dist / 6));
      const killed = b.damage(dmg, false);
      spawnDmgNum(bp, dmg, '');
      if (killed) onBotKilled(b, false);
    }
  }
  const pd = player.pos.distanceTo(pos);
  if (pd < 5 && player.alive) damagePlayer(Math.round(45 * (1 - pd / 5)), pos);
  fx.addFire(pos.clone(), { life: 2.6, radius: 1.0, rate: 26, sparkRate: 10 });
  setTimeout(() => tryChainDrums(pos, depth + 1), 180);
}

// ═══════════════ KILLS / SCORE ═══════════════
// subtle kill effect: small ember burst + brief flame (cheap, no lag)
function killEffects(bp) {
  for (let i = 0; i < 8; i++) {
    fx.spawnParticle(bp,
      new THREE.Vector3((Math.random() - .5) * 4, 1 + Math.random() * 4, (Math.random() - .5) * 4),
      i < 5 ? 0xff7733 : 0x552211, 0.4 + Math.random() * 0.4, 0.05);
  }
  fx.addFire(bp, { life: 0.9, radius: 0.35, rate: 6, sparkRate: 1.5 });
}

function onBotKilled(bot, headshot) {
  kills++;
  combo++; comboTimer = 3.0;
  const pts = Math.round(bot.type.score * (1 + (combo - 1) * 0.25) * (headshot ? 1.5 : 1));
  score += pts;
  updateScore();

  const bp = bot.pos.clone().add(new THREE.Vector3(0, 1, 0));
  killEffects(bp);
  sfx.kill();

  spawnDmgNum(headshot ? bot.headWorldPos : bp, headshot ? 'HEADKILL!' : 'KILL!', 'kill');
  addKillfeed(`${bot.type.name} ${headshot ? '⚔ HEADSHOT' : '💀'}`, pts);
  showCombo();
  hitmarker(headshot);
  updateWaveEnemies();

  // drops
  const r = Math.random();
  if (r < 0.22) spawnPickup(bot.pos, 'health');
  else if (r < 0.5) spawnPickup(bot.pos, 'ammo');
}

// ═══════════════ PLAYER DAMAGE ═══════════════
function damagePlayer(dmg, pos) {
  if (state !== 'playing' || !player.alive) return;
  player.damage(dmg);
  lastDamageT = nowS();
  updateHealth();
  hud.vDmg.style.opacity = 0.9;
  setTimeout(() => hud.vDmg.style.opacity = 0, 120);
  shake(0.3);
  sfx.hurt();
  if (pos) spawnDmgNum(pos, `-${dmg}`, 'head');
  if (!player.alive) {
    state = 'dead';
    combo = 0;
    sfx.playerDeath();
    document.exitPointerLock();
    $('final-wave').textContent = bots.wave;
    $('final-kills').textContent = kills;
    $('final-score').textContent = score;
    $('final-accuracy').textContent = shotsFired ? Math.round(100 * shotsHit / shotsFired) + '%' : '—';
    $('gameover').classList.remove('hidden');
    $('hud').style.display = 'none';
  }
}

// ═══════════════ PICKUPS ═══════════════
const pickups = [];
const pickupGeo = new THREE.OctahedronGeometry(0.3);
function spawnPickup(pos, kind) {
  const color = kind === 'health' ? 0x3cff8c : 0xffd24a;
  const m = new THREE.Mesh(pickupGeo, new THREE.MeshBasicMaterial({ color }));
  m.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
  scene.add(m);
  pickups.push({ mesh: m, kind, t: 0, life: 25 });
}

function updatePickups(dt, nowS) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt; p.life -= dt;
    p.mesh.rotation.y += dt * 2.5;
    p.mesh.position.y = 0.8 + Math.sin(p.t * 3) * 0.15;
    p.mesh.visible = p.life > 5 || Math.sin(nowS * 10) > 0;
    if (p.mesh.position.distanceTo(player.pos) < 1.4 && player.alive) {
      let taken = false;
      if (p.kind === 'health') {
        if (player.hp < player.maxHp) {
          player.heal(35);
          hud.vHeal.style.opacity = 1;
          setTimeout(() => hud.vHeal.style.opacity = 0, 150);
          updateHealth();
          taken = true;
        }
      } else {
        if (weapons.current === 'katana') weapons.switchTo('rifle', true);
        const st = weapons.state;
        if (st.reserve !== Infinity) {
          st.reserve = Math.min(999, st.reserve + st.magSize * 2);
          updateAmmo();
          taken = true;
        }
      }
      if (taken) {
        fx.pickupBurst(p.mesh.position, p.kind === 'health' ? 0x3cff8c : 0xffd24a);
        sfx.pickup();
        scene.remove(p.mesh);
        pickups.splice(i, 1);
      }
    } else if (p.life <= 0) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }
}

// ═══════════════ INPUT ═══════════════
let firing = false;
const nowS = () => performance.now() / 1000;

canvas.addEventListener('mousedown', e => {
  if (state !== 'playing') return;
  if (!player.locked) { player.requestLock(); return; }
  if (e.button === 0) { firing = true; if (weapons.canFire(nowS())) fireShot(nowS()); }
  if (e.button === 2) weapons.aiming = true;
});
addEventListener('mouseup', e => {
  if (e.button === 0) firing = false;
  if (e.button === 2) weapons.aiming = false;
});
addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  if (state === 'menu' || state === 'dead') return;
  if (e.code === 'KeyR' && state === 'playing') {
    e.preventDefault();  // stop Ctrl+R / browser reload when typing R
    if (weapons.startReload(nowS())) { sfx.reload(); updateAmmo(); }
  }
  if (e.code === 'Digit1') { weapons.switchTo('rifle'); sfx.weaponSwitch(); updateAmmo(); updateSlots(); }
  if (e.code === 'Digit2') { weapons.switchTo('shotgun'); sfx.weaponSwitch(); updateAmmo(); updateSlots(); }
  if (e.code === 'Digit3') { weapons.switchTo('katana'); sfx.weaponSwitch(); updateAmmo(); updateSlots(); }
  if (e.code === 'KeyQ') { weapons.switchTo('katana'); sfx.weaponSwitch(); updateAmmo(); updateSlots(); }
  if (e.code === 'KeyE') {
    if (state === 'playing' && player.tryDash()) {
      sfx.dash();
      hud.vDash.style.opacity = 1;
      setTimeout(() => hud.vDash.style.opacity = 0, 180);
    }
  }
  if (e.code === 'F4') {
    e.preventDefault();
    player.thirdPerson = !player.thirdPerson;
    sfx.pov();
    showBanner(player.thirdPerson ? 'THIRD PERSON' : 'FIRST PERSON', 'POV切換');
  }
  // best-effort Ctrl+W rokne ki koshish (Firefox; Chrome me V use karo)
  if (e.ctrlKey && e.code === 'KeyW') e.preventDefault();
  if (e.code === 'Space' && state === 'playing') { if (player.jump()) sfx.jump(); }
  if (e.code === 'KeyM') { const on = toggleAudio(); showBanner(on ? 'AUDIO ON' : 'AUDIO OFF', ''); }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    document.exitPointerLock();
    $('pause-screen').classList.remove('hidden');
  } else if (state === 'paused') {
    resume();
  }
}

function resume() {
  state = 'playing';
  $('pause-screen').classList.add('hidden');
  player.requestLock();
}

document.addEventListener('pointerlockchange', () => {
  if (!player.locked && state === 'playing') togglePause();
});

$('btn-start').addEventListener('click', () => {
  initAudio();
  startAmbient();
  $('start-screen').classList.add('hidden');
  $('hud').style.display = 'block';
  state = 'playing';
  updateHealth(); updateAmmo(); updateSlots(); updateScore(); updateWaveEnemies();
  player.requestLock();
  waveState = 'intermission';
  intermissionT = 2.0;
});

$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', () => location.reload());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ═══════════════ MAIN LOOP ═══════════════
const clock = new THREE.Clock();
let baseFov = 75;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const nS = nowS();

  fx.setCameraQuat(camera.quaternion);
  world.update(dt, t);

  // cloth banners sway in wind
  if (world.clothBanners) {
    world.clothBanners.forEach((b, i) => {
      b.rotation.z = Math.sin(t * 1.6 + i * 1.7) * 0.05;
    });
  }

  if (state === 'playing') {
    player.update(dt, world.colliders);

    // stance + footsteps + landing sounds
    if (player.crouching !== _wasCrouch) { sfx.stance(player.crouching); _wasCrouch = player.crouching; }
    if (player.onGround) {
      _stepAcc += Math.hypot(player.vel.x, player.vel.z) * dt;
      const stride = player.crouching ? 1.8 : (player.sprinting ? 3.2 : 2.5);
      if (_stepAcc > stride) {
        _stepAcc = 0;
        sfx.footstep(player.crouching ? 0.06 : (player.sprinting ? 0.2 : 0.13));
      }
    }
    if (player.landImpact > 0.23 && _prevLand <= 0.23) sfx.land();
    _prevLand = player.landImpact;

    // weapons tick
    weapons.tickReload(nS);
    if (weapons.reloading) updateAmmo();
    if (firing && weapons.state.auto && weapons.canFire(nS)) fireShot(nS);

    // wave logic
    if (waveState === 'intermission') {
      intermissionT -= dt;
      if (intermissionT <= 0) {
        waveState = 'active';
        bots.startWave(bots.wave + 1);
      }
    }

    bots.update(dt, player, nS);
    updatePickups(dt, nS);

    // AUTO-RELOAD: mag khali ho jaye to khud reload (after short delay)
    if (weapons.state.sfx !== 'katana' && weapons.state.mag === 0 && weapons.state.reserve > 0 && !weapons.reloading) {
      autoReloadT += dt;
      if (autoReloadT > 0.4) {
        autoReloadT = 0;
        if (weapons.startReload(nS)) sfx.reload();
        updateAmmo();
      }
    } else {
      autoReloadT = 0;
    }

    // health regen after 5s without damage
    if (player.alive && player.hp < player.maxHp && nS - lastDamageT > 5) {
      player.heal(6 * dt);
      updateHealth();
    }

    // combo decay
    if (combo > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; hud.combo.classList.remove('show'); }
    }

    updateDashUI();
    updateDmgNums(dt);
  } else {
    hud.scopeOverlay.classList.remove('show');
    // menu idle camera drift
    if (state === 'menu') {
      camera.position.set(Math.sin(t * 0.1) * 20, 8, Math.cos(t * 0.1) * 20 + 10);
      camera.lookAt(0, 3, 0);
    }
  }

  fx.update(dt);

  // viewmodel + fov + scope
  if (state === 'playing') {
    const scoped = !player.thirdPerson && weapons.aiming && weapons.current === 'rifle' && !weapons.reloading;
    hud.scopeOverlay.classList.toggle('show', scoped);
    hud.crosshair.classList.toggle('scoped', scoped);
    weapons.vm.visible = !player.thirdPerson && !scoped;   // scope/TPP me viewmodel chhupo
    animateViewmodel(weapons, player, dt, isMoving(), 0, nS);
    // shotgun shell insert sounds mid-reload
    if (weapons.reloading && weapons.current === 'shotgun') {
      const p = weapons.getReloadProgress(nS);
      if (p > weapons._lastShellP && (p * 4 | 0) > ((weapons._lastShellP || 0) * 4 | 0) && p < 0.85) sfx.shotgunReload();
      weapons._lastShellP = p;
    } else {
      weapons._lastShellP = 0;
    }
    const targetFov = scoped ? 38
      : (weapons.aiming && weapons.current !== 'katana' ? 55
        : (player.dashTime > 0 ? 84 : (player.sprinting ? 83 : 75)));
    baseFov += (targetFov - baseFov) * Math.min(1, dt * 10);
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }

  // shake
  if (shakeAmt > 0.001) {
    camera.position.x += (Math.random() - .5) * shakeAmt * 0.35;
    camera.position.y += (Math.random() - .5) * shakeAmt * 0.35;
    shakeAmt *= Math.pow(0.0001, dt);
  }

  renderer.render(scene, camera);
}

function updateDashUI() {
  hud.dashFill.style.width = (100 * (1 - player.dashCd / 2.2)) + '%';
}

// hide loading, go
document.getElementById('loading').style.display = 'none';
loop();
