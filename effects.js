// ═══════════════ EFFECTS v2 — pooled lights, capped particles (no lag) ═══════════════
import * as THREE from 'three';

const MAX_PARTICLES = 300;   // hard cap — prevents lag spikes
const MAX_LIGHTS = 5;        // pooled point lights — kept ALWAYS visible at intensity 0
                             // (toggling light visibility changes the shader light count and
                             //  forces ALL materials to recompile mid-combat = lag spikes)

export class FXSystem {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.particles = [];
    this.fires = [];
    this.shocks = [];
    this.lights = [];

    // ── LIGHT POOL: reuse lights instead of creating/destroying (lag fix) ──
    this.lightPool = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.visible = true;   // never toggle — see MAX_LIGHTS note above
      scene.add(l);
      this.lightPool.push({ light: l, life: 0, maxLife: 1, peak: 0 });
    }

    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._planeGeo = new THREE.PlaneGeometry(1, 1);
    this._sprGeo = new THREE.SphereGeometry(0.09, 6, 5);
    this._matCache = new Map();

    // bullet holes (decals) — shared material, capped
    this.holes = [];
    this.MAX_HOLES = 60;
    this._holeTex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(10,8,6,0.95)');
      g.addColorStop(0.4, 'rgba(30,24,18,0.75)');
      g.addColorStop(1, 'rgba(30,24,18,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    })();
    this._holeMat = new THREE.MeshBasicMaterial({ map: this._holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this._holeGeo = new THREE.PlaneGeometry(0.16, 0.16);
  }

  // persistent bullet hole decal (CS:GO style)
  bulletHole(pos, normal) {
    if (this.holes.length >= this.MAX_HOLES) {
      const old = this.holes.shift();
      this.scene.remove(old);
    }
    const m = new THREE.Mesh(this._holeGeo, this._holeMat);
    m.position.copy(pos).addScaledVector(normal, 0.012);
    m.lookAt(m.position.clone().add(normal));
    m.rotation.z = Math.random() * Math.PI * 2;
    m.scale.setScalar(0.8 + Math.random() * 0.5);
    this.scene.add(m);
    this.holes.push(m);
  }

  // blood spray on bot hit
  blood(pos, dir) {
    for (let i = 0; i < 7; i++) {
      const v = dir.clone().multiplyScalar(2 + Math.random() * 3)
        .add(new THREE.Vector3((Math.random() - .5) * 2.5, Math.random() * 2, (Math.random() - .5) * 2.5));
      this.spawnParticle(pos, v, i < 4 ? 0x9a1010 : 0x550808, 0.3 + Math.random() * 0.25, 0.05, -11);
    }
  }

  _mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!this._matCache.has(key)) {
      this._matCache.set(key, new THREE.MeshBasicMaterial({
        color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...opts
      }));
    }
    return this._matCache.get(key).clone();
  }

  // acquire a pooled light — if none free, steals the oldest one (no creation)
  _acquireLight(color, intensity, dist, life) {
    let slot = this.lightPool.find(s => s.life <= 0);
    if (!slot) {
      // steal oldest
      slot = this.lightPool.reduce((a, b) => (a.life / a.maxLife > b.life / b.maxLife ? a : b));
    }
    slot.light.color.setHex(color);
    slot.light.distance = dist;
    slot.peak = intensity;
    slot.light.intensity = intensity;
    slot.life = life;
    slot.maxLife = life;
    return slot;
  }

  // ── tracer ──
  tracer(from, to, color = 0xffe08a, width = 0.03, life = 0.07) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.1 || this.tracers.length > 40) return;
    const geo = new THREE.CylinderGeometry(width, width * 0.5, len, 4, 1, true);
    geo.translate(0, len / 2, 0);
    const mesh = new THREE.Mesh(geo, this._mat(color, { opacity: 0.9 }));
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life, maxLife: life });
  }

  // ── impact: small, cheap ──
  impact(pos, normal, color = 0xffd27a, count = 5) {
    count = Math.min(count, 7);
    for (let i = 0; i < count; i++) {
      const v = normal.clone()
        .multiplyScalar(2 + Math.random() * 2)
        .add(new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2.5, (Math.random() - .5) * 3));
      this.spawnParticle(pos, v, color, 0.2 + Math.random() * 0.2, 0.04);
    }
  }

  // ── muzzle flash (pooled light) ──
  muzzleFlash(pos, dir, color = 0xffc66a, scale = 1) {
    const slot = this._acquireLight(color, 14 * scale, 9, 0.05);
    slot.light.position.copy(pos);
    for (let i = 0; i < 3; i++) {
      const v = dir.clone().multiplyScalar(5 + Math.random() * 6)
        .add(new THREE.Vector3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2));
      this.spawnParticle(pos, v, 0xffd98a, 0.08 + Math.random() * 0.08, 0.035);
    }
  }

  // ── particle with global cap ──
  spawnParticle(pos, vel, color, life, size, gravity = -9) {
    if (this.particles.length >= MAX_PARTICLES) {
      // recycle oldest
      const old = this.particles.shift();
      this.scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const m = new THREE.Mesh(this._boxGeo, this._mat(color, { opacity: 1 }));
    m.position.copy(pos);
    m.scale.setScalar(size);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    this.scene.add(m);
    this.particles.push({
      mesh: m, vel, life, maxLife: life, gravity,
      spin: (Math.random() - .5) * 10, spark: true
    });
  }

  // ── fire emitter (small default — subtle) ──
  addFire(pos, opts = {}) {
    const {
      life = 1.6, radius = 0.45, rate = 9, wind = new THREE.Vector3(0, 1.4, 0),
      sparkRate = 2, smoke = false
    } = opts;
    // fires share ONE pooled light per 2 emitters max — use weak static light only if available
    const emitter = {
      pos: pos.clone(), life, maxLife: life, rate, sparkRate, smoke, wind,
      light: null, radius, acc: 0, sparkAcc: 0, smokeAcc: 0, elapsed: 0,
      slot: null
    };
    // try grab a pooled light (non-fatal if none)
    if (this.lightPool.some(s => s.life <= 0)) {
      emitter.slot = this._acquireLight(0xff7a2d, 3.5, radius * 9, life);
      emitter.light = emitter.slot.light;
      emitter.light.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    }
    this.fires.push(emitter);
    return emitter;
  }

  _emitFireParticle(e) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * e.radius;
    const p = e.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.15, Math.sin(a) * r));
    const color = Math.random() < 0.75 ? (Math.random() < 0.5 ? 0xff6a1a : 0xffb02e) : 0xffe27a;
    const vel = e.wind.clone().add(new THREE.Vector3((Math.random() - .5) * 0.7, 0.4 + Math.random(), (Math.random() - .5) * 0.7));
    const m = new THREE.Mesh(this._planeGeo, this._mat(color, { opacity: 0.8, side: THREE.DoubleSide }));
    m.position.copy(p);
    const s = 0.13 + Math.random() * 0.15;
    m.scale.setScalar(s);
    this.scene.add(m);
    this.particles.push({
      mesh: m, vel, life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
      gravity: 1.2, spin: 0, spark: false, shrink: true, baseScale: s, fire: true
    });
  }

  _emitSpark(e) {
    const p = e.pos.clone().add(new THREE.Vector3((Math.random() - .5) * e.radius, 0.15, (Math.random() - .5) * e.radius));
    this.spawnParticle(p,
      new THREE.Vector3((Math.random() - .5) * 2, 1.5 + Math.random() * 2.5, (Math.random() - .5) * 2),
      0xffd24a, 0.35 + Math.random() * 0.3, 0.035, -7);
  }

  // ── explosion (drums only now — moderate size) ──
  explosion(pos, big = false) {
    const s = big ? 1.5 : 1;

    const core = new THREE.Mesh(this._sprGeo, this._mat(0xfff3c0, { opacity: 1 }));
    core.position.copy(pos);
    core.scale.setScalar(1.5 * s);
    this.scene.add(core);
    this.shocks.push({ mesh: core, life: 0.14, maxLife: 0.14, grow: 5 * s, sphere: true });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.6, 28),
      this._mat(0xffa14a, { opacity: 0.8, side: THREE.DoubleSide })
    );
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    this.shocks.push({ mesh: ring, life: 0.4, maxLife: 0.4, grow: 8 * s, ring: true });

    this.addFire(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), {
      life: big ? 1.3 : 0.8, radius: 0.5 * s, rate: big ? 22 : 14, sparkRate: big ? 8 : 5
    });

    const nDebris = big ? 12 : 7;
    for (let i = 0; i < nDebris; i++) {
      const v = new THREE.Vector3((Math.random() - .5), Math.random() * 0.9 + 0.2, (Math.random() - .5))
        .normalize().multiplyScalar((4 + Math.random() * 6) * s);
      this.spawnParticle(pos, v, Math.random() < .5 ? 0xff8a3c : 0x2c2428,
        0.6 + Math.random() * 0.5, 0.06 + Math.random() * 0.07, -13);
    }

    const slot = this._acquireLight(0xff8a3c, big ? 40 : 24, 15 * s, 0.3);
    slot.light.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
  }

  // ── slash arc ──
  slash(pos, quat, color = 0x8ee8ff) {
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 1.0, 22, 1, -0.6, 2.4),
      this._mat(color, { opacity: 0.8, side: THREE.DoubleSide })
    );
    arc.position.copy(pos);
    arc.quaternion.copy(quat);
    this.scene.add(arc);
    this.shocks.push({ mesh: arc, life: 0.14, maxLife: 0.14, grow: 3, ring: false });
  }

  // ── spawn portal ring ──
  spawnPortal(pos, color = 0xff2d78) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.48, 28),
      this._mat(color, { opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    this.shocks.push({ mesh: ring, life: 0.55, maxLife: 0.55, grow: 3.5, ring: true });
    const slot = this._acquireLight(color, 10, 8, 0.55);
    slot.light.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
  }

  // ── pickup burst ──
  pickupBurst(pos, color = 0x3cff8c) {
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3((Math.random() - .5) * 2.5, 1 + Math.random() * 2, (Math.random() - .5) * 2.5);
      this.spawnParticle(pos, v, color, 0.35 + Math.random() * 0.25, 0.045, -3);
    }
  }

  setCameraQuat(q) { this.cameraQuat = q; }

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(t.life / t.maxLife, 0) * 0.9;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose(); t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.life -= dt;
      const k = Math.max(s.life / s.maxLife, 0);
      s.mesh.material.opacity = k * 0.85;
      if (s.grow) s.mesh.scale.multiplyScalar(1 + (1 - k) * s.grow * dt * 6);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose(); s.mesh.material.dispose();
        this.shocks.splice(i, 1);
      }
    }

    for (let i = this.fires.length - 1; i >= 0; i--) {
      const e = this.fires[i];
      e.life -= dt;
      e.elapsed += dt;
      if (e.slot) {
        e.slot.light.intensity = 3.5 * Math.max(e.life / e.maxLife, 0) * (0.8 + Math.sin(e.elapsed * 25) * 0.2);
      }
      e.acc += dt * e.rate;
      while (e.acc >= 1) { e.acc -= 1; this._emitFireParticle(e); }
      e.sparkAcc += dt * e.sparkRate;
      while (e.sparkAcc >= 1) { e.sparkAcc -= 1; this._emitSpark(e); }
      if (e.life <= 0) {
        if (e.slot) { e.slot.life = 0; e.slot.light.intensity = 0; }
        this.fires.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y += p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.spin) p.mesh.rotation.z += p.spin * dt;
      const k = Math.max(p.life / p.maxLife, 0);
      if (p.fire) {
        p.mesh.quaternion.copy(this.cameraQuat || p.mesh.quaternion);
        p.mesh.scale.setScalar(p.baseScale * (0.4 + k * 0.6));
        p.mesh.material.opacity = k * 0.8;
      } else {
        p.mesh.material.opacity = Math.min(1, k * 1.6);
        if (p.spark) p.mesh.scale.multiplyScalar(Math.max(0.5, 1 - dt * 1.5));
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    for (const slot of this.lightPool) {
      if (slot.life > 0) {
        slot.life -= dt;
        const k = Math.max(slot.life / slot.maxLife, 0);
        slot.light.intensity = slot.peak * k;
        if (slot.life <= 0) slot.light.intensity = 0;
      }
    }
  }

  clear() {
    [...this.tracers.map(t => t.mesh), ...this.shocks.map(s => s.mesh),
     ...this.particles.map(p => p.mesh), ...this.holes].forEach(m => {
      this.scene.remove(m);
    });
    this.fires.forEach(e => { if (e.slot) { e.slot.life = 0; e.slot.light.intensity = 0; } });
    this.lightPool.forEach(s => { s.life = 0; s.light.intensity = 0; });
    this.tracers = []; this.particles = []; this.fires = []; this.shocks = []; this.holes = [];
  }
}
