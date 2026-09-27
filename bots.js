// ═══════════════ BOTS v2 — dark operators with glowing optics ═══════════════
import * as THREE from 'three';
import { ARENA } from './world.js?v=9';

const BOT_TYPES = {
  grunt: {
    name: 'PHEONIX GRUNT', hp: 60, speed: 4.2, radius: 0.5, height: 1.8,
    score: 100, body: 0x6a5a3a, gear: 0x3a3222, visor: 0xff3355,
    attack: 'ranged', dmg: 8, fireRate: [1.1, 1.9], projSpeed: 30, keepDist: [9, 16],
  },
  stalker: {
    name: 'SAS RAPTOR', hp: 42, speed: 7.0, radius: 0.42, height: 1.75,
    score: 150, body: 0x4a4438, gear: 0x2e2a20, visor: 0x22ccff,
    attack: 'melee', dmg: 12, reach: 2.3, fireRate: [0.9, 1.3],
  },
  brute: {
    name: 'JUGGERNAUT', hp: 200, speed: 2.6, radius: 0.75, height: 2.45,
    score: 300, body: 0x5a5248, gear: 0x33302a, visor: 0xffaa33,
    attack: 'melee', dmg: 24, reach: 3.0, fireRate: [1.3, 1.8], leap: true,
  },
};

let BOT_ID = 0;

function makeHealthBar() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 14;
  const tex = new THREE.CanvasTexture(cv);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set(1.25, 0.14, 1);
  spr.renderOrder = 999;
  return { cv, tex, spr };
}

function drawHealthBar(bar, frac) {
  const c = bar.cv.getContext('2d');
  c.clearRect(0, 0, 128, 14);
  c.fillStyle = 'rgba(5,5,10,0.8)';
  c.fillRect(0, 0, 128, 14);
  const col = frac > 0.5 ? '#ff5566' : (frac > 0.25 ? '#ffaa33' : '#ff2244');
  c.fillStyle = col;
  c.fillRect(3, 3, 122 * Math.max(0, frac), 8);
  bar.tex.needsUpdate = true;
}

export class Bot {
  constructor(typeKey, pos, waveScale) {
    this.id = ++BOT_ID;
    this.type = BOT_TYPES[typeKey];
    this.typeKey = typeKey;
    this.hp = this.maxHp = Math.round(this.type.hp * waveScale);
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    this.alive = true;
    this.attackCd = 0.8 + Math.random();
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 1 + Math.random() * 2;
    this.spawnT = 0.5;
    this.deathT = 0;
    this.deathStyle = Math.random() < 0.5 ? 1 : -1;  // fall direction variety
    this.animT = Math.random() * 10;
    this.yaw = 0;
    this.radius = this.type.radius;
    this.height = this.type.height;
    this.leapCd = 3 + Math.random() * 2;
    this.airborne = false;
    this.flinchT = 0;
    this.buildMesh();
  }

  buildMesh() {
    const t = this.type;
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: t.body, roughness: 0.95, metalness: 0 });
    const gear = new THREE.MeshStandardMaterial({ color: t.gear, roughness: 0.75, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.85, metalness: 0.1 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.9 });
    const team = new THREE.MeshBasicMaterial({ color: t.visor });   // team accent — scarf/armband/goggles
    const steel = new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.4, metalness: 0.8 });
    const s = t.height / 1.8;

    // ── torso: human body + plate carrier vest ──
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.185 * s, 0.42 * s, 4, 10), cloth);
    torso.position.y = 1.12 * s;
    torso.scale.z = 0.82;
    torso.userData = { bot: this, part: 'body' };
    g.add(torso);
    const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.21 * s, 0.34 * s, 4, 10), gear);
    vest.position.y = 1.16 * s;
    vest.scale.z = 0.9;
    g.add(vest);
    // mag pouches on the carrier
    for (let i = -1; i <= 1; i++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.11 * s, 0.06 * s), dark);
      pouch.position.set(i * 0.11 * s, 1.05 * s, 0.19 * s);
      g.add(pouch);
    }
    // belt + hips
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.06 * s, 12), dark);
    belt.position.y = 0.87 * s;
    g.add(belt);
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 10, 8), cloth);
    hips.position.y = 0.68 * s;
    hips.scale.set(1.1, 0.75, 0.9);
    g.add(hips);
    // backpack + bedroll
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.36 * s, 0.15 * s), gear);
    pack.position.set(0, 1.18 * s, -0.24 * s);
    g.add(pack);
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.28 * s, 8), cloth);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.97 * s, -0.25 * s);
    g.add(bedroll);
    // team scarf — dushman ka type pehchano (grunt/stalker/brute colour)
    const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.115 * s, 0.13 * s, 0.09 * s, 10), team);
    scarf.position.y = 1.44 * s;
    g.add(scarf);

    // ── head: face + balaclava + combat helmet + goggles ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 14, 12), skin);
    head.position.y = 1.6 * s;
    head.scale.z = 0.92;
    head.userData = { bot: this, part: 'head' };
    g.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 12, 10), dark);
    face.position.set(0, 1.565 * s, 0.02 * s);
    face.scale.set(1.02, 0.75, 1.0);
    g.add(face);
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 * s, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), gear);
    helm.position.y = 1.615 * s;
    helm.scale.z = 1.05;
    g.add(helm);
    const helmBack = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.12 * s, 0.1 * s), gear);
    helmBack.position.set(0, 1.56 * s, -0.115 * s);
    g.add(helmBack);
    const gogFrame = new THREE.Mesh(new THREE.BoxGeometry(0.235 * s, 0.07 * s, 0.05 * s), dark);
    gogFrame.position.set(0, 1.64 * s, 0.105 * s);
    g.add(gogFrame);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19 * s, 0.042 * s, 0.02 * s), team);
    visor.position.set(0, 1.64 * s, 0.133 * s);
    g.add(visor);
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.1 * s, 0.02 * s), dark);
    strapL.position.set(0.115 * s, 1.545 * s, 0.03 * s); g.add(strapL);
    const strapR = strapL.clone(); strapR.position.x = -0.115 * s; g.add(strapR);
    // no per-bot light in bright map (perf)
    this.visorGlow = null;

    // JUGGERNAUT: heavy ballistic faceplate
    if (this.typeKey === 'brute') {
      const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.14 * s, 0.05 * s), gear);
      facePlate.position.set(0, 1.585 * s, 0.115 * s);
      g.add(facePlate);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.03 * s, 0.02 * s), team);
      slit.position.set(0, 1.61 * s, 0.145 * s);
      g.add(slit);
    }

    // ── arms: pivot at shoulder (capsule hangs down) — realistic proportions ──
    const armGeo = new THREE.CapsuleGeometry(0.055 * s, 0.3 * s, 4, 8);
    armGeo.translate(0, -0.21 * s, 0);
    const armL = new THREE.Mesh(armGeo, cloth);
    armL.position.set(0.235 * s, 1.36 * s, 0);
    armL.userData = { bot: this, part: 'body' };
    g.add(armL);
    const armR = new THREE.Mesh(armGeo, cloth);
    armR.position.set(-0.235 * s, 1.36 * s, 0);
    armR.userData = { bot: this, part: 'body' };
    g.add(armR);
    // base pose: arms hold the weapon (melee types swing free)
    if (t.attack === 'ranged') {
      armL.rotation.x = -0.85; armL.rotation.z = -0.2;
      armR.rotation.x = -0.35; armR.rotation.z = 0.2;
    }
    // elbow + glove (children follow swing)
    const elbGeo = new THREE.SphereGeometry(0.058 * s, 8, 6);
    const elbL = new THREE.Mesh(elbGeo, cloth); elbL.position.y = -0.2 * s; armL.add(elbL);
    const elbR = new THREE.Mesh(elbGeo, cloth); elbR.position.y = -0.2 * s; armR.add(elbR);
    const gloveGeo = new THREE.SphereGeometry(0.06 * s, 8, 6);
    const glL = new THREE.Mesh(gloveGeo, dark); glL.position.y = -0.4 * s; armL.add(glL);
    const glR = new THREE.Mesh(gloveGeo, dark); glR.position.y = -0.4 * s; armR.add(glR);
    // team armband on left sleeve
    const armband = new THREE.Mesh(new THREE.CylinderGeometry(0.062 * s, 0.062 * s, 0.05 * s, 8), team);
    armband.position.y = -0.12 * s; armL.add(armband);
    // shoulder caps
    const capGeo = new THREE.SphereGeometry(0.085 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capL = new THREE.Mesh(capGeo, gear); capL.position.set(0.235 * s, 1.37 * s, 0); capL.rotation.z = -0.4; g.add(capL);
    const capR = new THREE.Mesh(capGeo, gear); capR.position.set(-0.235 * s, 1.37 * s, 0); capR.rotation.z = 0.4; g.add(capR);

    // ── legs: pivot at hip ──
    const legGeo = new THREE.CapsuleGeometry(0.07 * s, 0.34 * s, 4, 8);
    legGeo.translate(0, -0.26 * s, 0);
    const legL = new THREE.Mesh(legGeo, cloth);
    legL.position.set(0.115 * s, 0.62 * s, 0);
    legL.userData = { bot: this, part: 'body' };
    g.add(legL);
    const legR = new THREE.Mesh(legGeo, cloth);
    legR.position.set(-0.115 * s, 0.62 * s, 0);
    legR.userData = { bot: this, part: 'body' };
    g.add(legR);
    // knee pads + boots (children follow swing)
    const kneeGeo = new THREE.SphereGeometry(0.07 * s, 8, 6);
    const kneeL = new THREE.Mesh(kneeGeo, gear); kneeL.position.set(0, -0.34 * s, 0.03 * s); legL.add(kneeL);
    const kneeR = new THREE.Mesh(kneeGeo, gear); kneeR.position.set(0, -0.34 * s, 0.03 * s); legR.add(kneeR);
    const bootGeo = new THREE.BoxGeometry(0.14 * s, 0.1 * s, 0.26 * s);
    const bootL = new THREE.Mesh(bootGeo, dark); bootL.position.set(0, -0.55 * s, 0.05 * s); legL.add(bootL);
    const bootR = new THREE.Mesh(bootGeo, dark); bootR.position.set(0, -0.55 * s, 0.05 * s); legR.add(bootR);

    // ── weapons ──
    if (t.attack === 'ranged') {
      // rifle held across the chest, pointing forward (local +z faces the player)
      const gun = new THREE.Group();
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.1 * s, 0.62 * s), steel);
      gun.add(gunBody);
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.075 * s, 0.08 * s, 0.2 * s), dark);
      handguard.position.set(0, -0.005 * s, 0.22 * s);
      gun.add(handguard);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.15 * s, 0.08 * s), dark);
      mag.position.set(0, -0.11 * s, -0.04 * s);
      gun.add(mag);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055 * s, 0.09 * s, 0.18 * s), dark);
      stock.position.set(0, -0.015 * s, -0.38 * s);
      gun.add(stock);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.16 * s, 10), dark);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.09 * s, -0.06 * s);
      gun.add(scope);
      gun.position.set(0, 1.13 * s, 0.36 * s);
      g.add(gun);
      this.gunMuzzle = gun;
      // muzzle marker — shots spawn from the barrel tip
      const tip = new THREE.Object3D();
      tip.position.set(0, 0.02 * s, 0.34 * s);
      gun.add(tip);
      this.gunTip = tip;
    } else if (t.attack === 'melee' && this.typeKey === 'stalker') {
      // combat knife held forward
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.035 * s, 0.34 * s), steel);
      blade.position.set(0.15 * s, 1.02 * s, 0.42 * s);
      g.add(blade);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.12 * s, 8), dark);
      hilt.rotation.x = Math.PI / 2;
      hilt.position.set(0.15 * s, 1.02 * s, 0.22 * s);
      g.add(hilt);
    }

    this.parts = { torso, head, armL, armR, legL, legR, visor };
    this.hitParts = [torso, head, armL, armR, legL, legR];
    this.mesh = g;
    g.position.copy(this.pos);

    // health bar — ALWAYS visible so enemies are easy to spot
    this.bar = makeHealthBar();
    drawHealthBar(this.bar, 1);
    this.bar.spr.position.y = t.height + 0.4;
    g.add(this.bar.spr);

    // faint ground marker ring — spot enemies on dark floor
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: t.visor, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.06;
    g.add(marker);
    this.marker = marker;
  }

  get headWorldPos() {
    const v = new THREE.Vector3();
    this.parts.head.getWorldPosition(v);
    return v;
  }

  damage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flinchT = 0.18;   // hit reaction
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.deathT = 0.0001; return true; }
    return false;
  }

  update(dt, player, world, manager) {
    if (!this.alive) return;
    const t = this.type;

    if (this.spawnT > 0) {
      this.spawnT -= dt;
      const k = Math.max(0, this.spawnT / 0.5);
      this.mesh.position.y = this.pos.y - (1 - k) * 0.4;
      this.mesh.scale.setScalar(0.85 + (1 - k) * 0.15);
      return;
    }

    const toPlayer = new THREE.Vector3().subVectors(player.pos, this.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const dir = dist > 0.001 ? toPlayer.clone().normalize() : new THREE.Vector3(0, 0, 1);
    this.yaw = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = this.yaw;

    const eyePos = this.pos.clone().add(new THREE.Vector3(0, t.height * 0.85, 0));
    const los = manager.hasLOS(eyePos, player.pos);

    // ── movement AI ──
    const desired = new THREE.Vector3();
    if (t.attack === 'ranged') {
      const [minD, maxD] = t.keepDist;
      if (!los || dist > maxD) desired.copy(dir);
      else if (dist < minD) desired.copy(dir).negate();
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeDir *= -1; this.strafeT = 1.2 + Math.random() * 2; }
      desired.addScaledVector(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.strafeDir), 0.8);
    } else {
      if (dist > t.reach * 0.8) desired.copy(dir);
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeDir *= -1; this.strafeT = 0.9 + Math.random() * 1.4; }
      if (this.typeKey === 'stalker' && dist < 6) {
        desired.addScaledVector(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.strafeDir), 0.55);
      }
      if (t.leap && this.leapCd <= 0 && dist > 5 && dist < 13 && los && !this.airborne) {
        this.airborne = true;
        this.leapCd = 5 + Math.random() * 2;
        this.vel.copy(dir).multiplyScalar(dist / 0.75);
        this.vel.y = 7.5;
      }
    }

    if (desired.lengthSq() > 0) {
      desired.normalize().multiplyScalar(t.speed);
      this.vel.x += (desired.x - this.vel.x) * Math.min(1, dt * 8);
      this.vel.z += (desired.z - this.vel.z) * Math.min(1, dt * 8);
    } else {
      this.vel.x *= (1 - Math.min(1, dt * 8));
      this.vel.z *= (1 - Math.min(1, dt * 8));
    }

    this.leapCd = Math.max(0, this.leapCd - dt);
    if (this.airborne || this.pos.y > 0) {
      this.vel.y -= 20 * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.vel.y = 0;
        if (this.airborne) {
          this.airborne = false;
          if (dist < 3.2 && player.alive) manager.onSlam(this, t.dmg);
        }
      }
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this._pushOut(world);
    const lim = ARENA.half - 1.5;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));

    // separation
    for (const o of manager.bots) {
      if (o === this || !o.alive) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      const minD = this.radius + o.radius + 0.15;
      if (d2 < minD * minD && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        this.pos.x += (dx / d) * push;
        this.pos.z += (dz / d) * push;
      }
    }

    // ── attacks ──
    this.attackCd -= dt;
    if (this.attackCd <= 0 && player.alive) {
      if (t.attack === 'ranged' && los && dist < 30) {
        manager.botShoot(this, player);
        this.attackCd = t.fireRate[0] + Math.random() * (t.fireRate[1] - t.fireRate[0]);
      } else if (t.attack === 'melee' && dist < t.reach && los) {
        manager.onMelee(this, t.dmg);
        this.attackCd = t.fireRate[0] + Math.random() * (t.fireRate[1] - t.fireRate[0]);
      }
    }

    // ── walk animation (proper leg/arm swing) ──
    this.animT += dt;
    const spd = Math.hypot(this.vel.x, this.vel.z);
    const moving = spd > 0.5;
    const cycle = this.typeKey === 'stalker' ? 11 : (this.typeKey === 'brute' ? 5.5 : 8);
    const amp = moving ? Math.min(spd / t.speed, 1) * 0.65 : 0.04;
    const sw = Math.sin(this.animT * cycle) * amp;
    this.parts.legL.rotation.x = sw;
    this.parts.legR.rotation.x = -sw;
    if (t.attack === 'ranged') {
      // rifle stays shouldered — arms just sway
      this.parts.armL.rotation.x = -0.85 - sw * 0.18;
      this.parts.armR.rotation.x = -0.35 + sw * 0.18;
    } else {
      this.parts.armL.rotation.x = -sw * 0.6;
      this.parts.armR.rotation.x = sw * 0.6;
    }
    // body bob + slight lean
    const bob = moving ? Math.abs(Math.sin(this.animT * cycle)) * 0.06 : Math.abs(Math.sin(this.animT * 2)) * 0.02;
    this.mesh.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.mesh.rotation.x = moving ? 0.07 : 0;
    // hit flinch recoil
    if (this.flinchT > 0) {
      this.flinchT -= dt;
      const f = Math.max(0, this.flinchT / 0.18);
      this.mesh.rotation.x -= f * 0.35;             // snap back
      this.mesh.position.y += f * 0.06;
    }
    // marker pulses
    this.marker.material.opacity = 0.25 + Math.abs(Math.sin(this.animT * 2)) * 0.2;
  }

  // death: fall over realistically
  updateDeath(dt) {
    this.deathT += dt;
    const k = Math.min(1, this.deathT / 0.55);
    const ease = 1 - Math.pow(1 - k, 3);
    // rotate to fallen
    this.mesh.rotation.z = this.deathStyle * ease * (Math.PI / 2) * 0.94;
    this.mesh.rotation.x = ease * 0.15;
    this.mesh.position.y = this.pos.y + Math.sin(ease * Math.PI) * 0.12 - ease * 0.32;
    if (this.visorGlow) this.visorGlow.intensity = 0;
    this.marker.material.opacity = Math.max(0, 0.4 * (1 - k));
    this.bar.spr.visible = false;
    return this.deathT >= 1.1;   // ready for cleanup
  }

  _pushOut(world) {
    const r = this.radius;
    for (const b of world.colliders) {
      if (this.pos.y > b.max.y - 0.1) continue;
      if (this.pos.x > b.min.x - r && this.pos.x < b.max.x + r &&
          this.pos.z > b.min.z - r && this.pos.z < b.max.z + r &&
          b.max.y > 0.4) {
        const pushMinX = (b.max.x + r) - this.pos.x;
        const pushMaxX = this.pos.x - (b.min.x - r);
        const pushMinZ = (b.max.z + r) - this.pos.z;
        const pushMaxZ = this.pos.z - (b.min.z - r);
        const m = Math.min(pushMinX, pushMaxX, pushMinZ, pushMaxZ);
        if (m === pushMinX) this.pos.x = b.max.x + r;
        else if (m === pushMaxX) this.pos.x = b.min.x - r;
        else if (m === pushMinZ) this.pos.z = b.max.z + r;
        else this.pos.z = b.min.z - r;
      }
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
    this.bar.tex.dispose();
  }
}

// ═══════════════ BOT MANAGER + WAVES ═══════════════
export class BotManager {
  constructor(scene, world, fx, sfx, callbacks) {
    this.scene = scene;
    this.world = world;
    this.fx = fx;
    this.sfx = sfx;
    this.cb = callbacks;
    this.bots = [];
    this.projectiles = [];
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.state = 'idle';
  }

  startWave(n) {
    this.wave = n;
    this.state = 'active';
    const count = Math.min(4 + Math.floor(n * 1.6), 20);
    const q = [];
    for (let i = 0; i < count; i++) {
      let type = 'grunt';
      const r = Math.random();
      if (n >= 2 && r < 0.3) type = 'stalker';
      if (n >= 3 && r > 0.82) type = 'brute';
      q.push(type);
    }
    this.spawnQueue = q;
    this.spawnTimer = 0.5;
    this.cb.onWaveStart(n, count);
  }

  get aliveCount() { return this.bots.filter(b => b.alive).length + this.spawnQueue.length; }

  // bridge methods called by bots
  onSlam(bot, dmg) { this.cb.onSlam && this.cb.onSlam(bot, dmg); }
  onMelee(bot, dmg) { this.cb.onMelee && this.cb.onMelee(bot, dmg); }

  _spawnPos(playerPos) {
    const spots = [];
    const maxR = ARENA.half - 6;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * Math.max(8, maxR - 18);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) > maxR) continue;
      if (Math.hypot(x - playerPos.x, z - playerPos.z) > 16) spots.push(new THREE.Vector3(x, 0, z));
    }
    if (!spots.length) return new THREE.Vector3(0, 0, -30);
    return spots[Math.floor(Math.random() * spots.length)];
  }

  update(dt, player, now) {
    if (this.state === 'active' && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = this.spawnQueue.shift();
        const pos = this._spawnPos(player.pos);
        const hpScale = 1 + (this.wave - 1) * 0.12;
        const bot = new Bot(type, pos, hpScale);
        this.scene.add(bot.mesh);
        this.bots.push(bot);
        this.fx.spawnPortal(pos, bot.type.visor);
        this.sfx.botSpawn();
        this.spawnTimer = 0.7 + Math.random() * 0.9;
      }
    }

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.update(dt, player, this.world, this);
    }

    // death anim + cleanup
    for (let i = this.bots.length - 1; i >= 0; i--) {
      const bot = this.bots[i];
      if (!bot.alive) {
        const done = bot.updateDeath(dt);
        if (done) {
          bot.dispose(this.scene);
          this.bots.splice(i, 1);
        }
      }
    }

    // projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);

      let hit = false;
      if (player.alive) {
        const dx = p.mesh.position.x - player.pos.x;
        const dy = p.mesh.position.y - player.pos.y;
        const dz = p.mesh.position.z - player.pos.z;
        if (dx * dx + dy * dy * 0.5 + dz * dz < 0.75) {
          this.cb.onPlayerDamage(p.dmg, p.mesh.position);
          hit = true;
        }
      }
      if (!hit) {
        for (const b of this.world.colliders) {
          if (p.mesh.position.x > b.min.x && p.mesh.position.x < b.max.x &&
              p.mesh.position.y > b.min.y && p.mesh.position.y < b.max.y &&
              p.mesh.position.z > b.min.z && p.mesh.position.z < b.max.z) { hit = true; break; }
        }
        if (p.mesh.position.y < 0.05) hit = true;
      }
      if (hit || p.life <= 0) {
        if (hit) this.fx.impact(p.mesh.position.clone(), new THREE.Vector3(0, 1, 0), p.color, 5);
        this.scene.remove(p.mesh);
        p.mesh.material.dispose(); p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // wave clear check (only when all spawned + all dead)
    if (this.state === 'active' && this.spawnQueue.length === 0 && this.bots.length === 0) {
      this.state = 'idle';
      this.cb.onWaveClear(this.wave);
    }
  }

  hasLOS(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.001) return true;
    dir.divideScalar(len);
    for (const b of this.world.colliders) {
      // skip broken (NaN) boxes — ONE bad box would block ALL line of sight forever
      if (!Number.isFinite(b.min.x) || !Number.isFinite(b.min.y) || !Number.isFinite(b.min.z) ||
          !Number.isFinite(b.max.x) || !Number.isFinite(b.max.y) || !Number.isFinite(b.max.z)) continue;
      let tmin = 0, tmax = len;
      let ok = true;
      const mins = [b.min.x, b.min.y, b.min.z];
      const maxs = [b.max.x, b.max.y, b.max.z];
      const o = [from.x, from.y, from.z];
      const d = [dir.x, dir.y, dir.z];
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-8) {
          if (o[a] < mins[a] || o[a] > maxs[a]) { ok = false; break; }
        } else {
          let t1 = (mins[a] - o[a]) / d[a];
          let t2 = (maxs[a] - o[a]) / d[a];
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (!(tmin <= tmax)) { ok = false; break; }  // NaN-safe
        }
      }
      if (ok) return false;
    }
    return true;
  }

  botShoot(bot, player) {
    const t = bot.type;
    const from = bot.gunTip ? bot.gunTip.getWorldPosition(new THREE.Vector3()) : bot.headWorldPos;
    if (!bot.gunTip) {
      from.addScaledVector(new THREE.Vector3().subVectors(player.pos, bot.pos).normalize(), 0.6);
      from.y -= 0.15;
    }
    const target = player.pos.clone().add(new THREE.Vector3(0, -0.15, 0));
    target.add(new THREE.Vector3((Math.random() - .5) * 1.15, (Math.random() - .5) * 0.8, (Math.random() - .5) * 1.15));
    const dir = new THREE.Vector3().subVectors(target, from).normalize();

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 5),
      new THREE.MeshBasicMaterial({ color: t.visor })
    );
    mesh.position.copy(from);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh, vel: dir.multiplyScalar(t.projSpeed), dmg: t.dmg, life: 3, color: t.visor
    });
    this.fx.muzzleFlash(from, dir, t.visor, 0.45);
    this.sfx.botShot();
  }

  clear() {
    this.bots.forEach(b => b.dispose(this.scene));
    this.bots = [];
    this.projectiles.forEach(p => { this.scene.remove(p.mesh); p.mesh.material.dispose(); p.mesh.geometry.dispose(); });
    this.projectiles = [];
    this.spawnQueue = [];
    this.state = 'idle';
    this.wave = 0;
  }
}
