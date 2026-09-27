// ═══════════════════ PLAYER — FPS controller ═══════════════════
import * as THREE from 'three';
import { ARENA } from './world.js?v=9';

const EYE = 1.62;
const CROUCH_EYE = 1.05;
const RADIUS = 0.42;

// third-person player body — realistic soldier (only visible when POV = TPP, F4 toggles)
function buildBody() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2e3a4a, roughness: 0.95, metalness: 0 });
  const gear = new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 0.75, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc09575, roughness: 0.9 });
  const accent = new THREE.MeshBasicMaterial({ color: 0x37d6ff });
  const steel = new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.4, metalness: 0.8 });

  // torso + plate carrier + belt + hips
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.185, 0.42, 4, 10), cloth);
  torso.position.y = 1.12; torso.scale.z = 0.82; g.add(torso);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.34, 4, 10), gear);
  vest.position.y = 1.16; vest.scale.z = 0.9; g.add(vest);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02), accent);
  strip.position.set(0, 1.26, 0.2); g.add(strip);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), dark);
  belt.position.y = 0.87; g.add(belt);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), cloth);
  hips.position.y = 0.68; hips.scale.set(1.1, 0.75, 0.9); g.add(hips);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.15), gear);
  pack.position.set(0, 1.18, -0.24); g.add(pack);

  // head: face + balaclava + helmet + goggles
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skin);
  head.position.y = 1.6; head.scale.z = 0.92; g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), dark);
  face.position.set(0, 1.565, 0.02); face.scale.set(1.02, 0.75, 1.0); g.add(face);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), gear);
  helm.position.y = 1.615; helm.scale.z = 1.05; g.add(helm);
  const gogFrame = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.07, 0.05), dark);
  gogFrame.position.set(0, 1.64, 0.105); g.add(gogFrame);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.042, 0.02), accent);
  visor.position.set(0, 1.64, 0.133); g.add(visor);

  // arms — pivot at shoulder, held on the rifle
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.3, 4, 8);
  armGeo.translate(0, -0.21, 0);
  const armL = new THREE.Mesh(armGeo, cloth);
  armL.position.set(0.235, 1.36, 0); armL.rotation.x = -0.85; armL.rotation.z = -0.2; g.add(armL);
  const armR = new THREE.Mesh(armGeo, cloth);
  armR.position.set(-0.235, 1.36, 0); armR.rotation.x = -0.35; armR.rotation.z = 0.2; g.add(armR);
  const glL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark); glL.position.y = -0.4; armL.add(glL);
  const glR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark); glR.position.y = -0.4; armR.add(glR);

  // legs — pivot at hip + boots
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.34, 4, 8);
  legGeo.translate(0, -0.26, 0);
  const legL = new THREE.Mesh(legGeo, cloth);
  legL.position.set(0.115, 0.62, 0); g.add(legL);
  const legR = new THREE.Mesh(legGeo, cloth);
  legR.position.set(-0.115, 0.62, 0); g.add(legR);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), dark);
  bootL.position.set(0, -0.55, 0.05); legL.add(bootL);
  const bootR = bootL.clone(); legR.add(bootR);

  // rifle held across the chest, pointing forward
  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.62), steel);
  gun.add(gunBody);
  const gm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.08), dark);
  gm.position.set(0, -0.11, -0.04); gun.add(gm);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.16, 10), dark);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.09, -0.06); gun.add(scope);
  gun.position.set(0, 1.13, 0.36);
  g.add(gun);

  g.visible = false;
  return { group: g, parts: { armL, armR, legL, legR } };
}

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.vel = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, EYE, 26);
    this.yaw = Math.PI;       // facing arena center
    this.pitch = 0;
    this.hp = 100; this.maxHp = 100;
    this.onGround = true;
    this.jumps = 0;
    this.maxJumps = 2;
    this.dashCd = 0;
    this.dashTime = 0;
    this.dashDir = new THREE.Vector3();
    this.alive = true;
    this.keys = {};
    this.sensitivity = 0.0021;
    this.bobT = 0;
    this.landImpact = 0;
    this.recoilPitch = 0;

    // stance & POV state
    this.eyeH = EYE;
    this.crouching = false;
    this.sprinting = false;
    this.thirdPerson = false;
    this._animT = 0;
    this._bodyScale = 1;
    this.body = buildBody();

    this._bindInput();
  }

  _bindInput() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== this.dom) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch));
    });
  }

  requestLock() { this.dom.requestPointerLock(); }
  get locked() { return document.pointerLockElement === this.dom; }

  respawn() {
    this.hp = this.maxHp;
    this.pos.set(0, EYE, 26);
    this.vel.set(0, 0, 0);
    this.yaw = Math.PI; this.pitch = 0;
    this.alive = true;
    this.dashCd = 0; this.dashTime = 0;
    this.eyeH = EYE;
    this.crouching = false;
    this.sprinting = false;
    this._bodyScale = 1;
  }

  damage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; return true; }
    return false;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // dash direction from current input
  _wishDir() {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(f.z, 0, -f.x);
    const d = new THREE.Vector3();
    if (this.keys['KeyW']) d.add(f);
    if (this.keys['KeyS']) d.sub(f);
    if (this.keys['KeyD']) d.sub(r);
    if (this.keys['KeyA']) d.add(r);
    return d.lengthSq() > 0 ? d.normalize() : null;
  }

  tryDash() {
    if (this.dashCd > 0 || this.dashTime > 0 || !this.alive) return false;
    const dir = this._wishDir() || new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.dashDir.copy(dir);
    this.dashTime = 0.14;
    this.dashCd = 2.2;
    return true;
  }

  jump() {
    if (!this.alive) return false;
    if (this.onGround) { this.vel.y = 8.6; this.onGround = false; this.jumps = 1; return true; }
    if (this.jumps < this.maxJumps) { this.vel.y = 8.0; this.jumps++; return true; }
    return false;
  }

  update(dt, colliders) {
    if (!this.alive) return;

    // ── crouch (hold Shift) — smooth eye height, feet stay planted ──
    this.crouching = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const targetEye = this.crouching ? CROUCH_EYE : EYE;
    const dEye = targetEye - this.eyeH;
    if (Math.abs(dEye) > 0.0004) {
      const step = Math.sign(dEye) * Math.min(Math.abs(dEye), dt * 4.2);
      this.eyeH += step;
      this.pos.y += step;
    }

    const dir = this._wishDir();
    // ── sprint (hold Ctrl ya V; Ctrl+W Chrome me tab band kar deta hai) ──
    this.sprinting = !!(this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyV'])
      && !this.crouching && !!dir && this.onGround;

    // ── dash movement ──
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vel.x = this.dashDir.x * 26;
      this.vel.z = this.dashDir.z * 26;
      this.vel.y = Math.max(this.vel.y, -2);
    } else {
      const speed = this.crouching ? 5.0 : (this.sprinting ? 14.5 : 9.5);
      const accel = this.onGround ? 60 : 25;
      if (dir) {
        this.vel.x += dir.x * accel * dt;
        this.vel.z += dir.z * accel * dt;
      }
      // friction
      const fr = this.onGround ? 10 : 1.2;
      this.vel.x -= this.vel.x * fr * dt;
      this.vel.z -= this.vel.z * fr * dt;
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > speed && this.dashTime <= 0) {
        this.vel.x *= speed / hs; this.vel.z *= speed / hs;
      }
      // gravity
      this.vel.y -= 24 * dt;
    }

    this.dashCd = Math.max(0, this.dashCd - dt);

    // ── integrate + collide (axis separated AABB vs AABB) ──
    const r = RADIUS;
    const feet = () => this.pos.y - this.eyeH;

    // X axis
    this.pos.x += this.vel.x * dt;
    this._collideAxis('x', r, colliders, feet);
    // Z axis
    this.pos.z += this.vel.z * dt;
    this._collideAxis('z', r, colliders, feet);
    // Y axis
    this.pos.y += this.vel.y * dt;
    const wasAir = !this.onGround;
    this.onGround = false;
    if (this.pos.y - this.eyeH <= 0) {
      if (wasAir && this.vel.y < -10) this.landImpact = 0.25;
      this.pos.y = this.eyeH;
      this.vel.y = 0;
      this.onGround = true;
      this.jumps = 0;
    }
    // land on colliders (simple: if falling and feet inside box top)
    if (this.vel.y <= 0) {
      for (const b of colliders) {
        if (this.pos.x > b.min.x - r && this.pos.x < b.max.x + r &&
            this.pos.z > b.min.z - r && this.pos.z < b.max.z + r) {
          const top = b.max.y;
          if (feet() <= top && feet() > top - 0.55 && this.pos.y - this.eyeH - this.vel.y * dt >= top - 0.3) {
            this.pos.y = top + this.eyeH;
            this.vel.y = 0;
            this.onGround = true;
            this.jumps = 0;
          }
        }
      }
    }
    // head bump
    if (this.vel.y > 0) {
      for (const b of colliders) {
        if (this.pos.x > b.min.x - r && this.pos.x < b.max.x + r &&
            this.pos.z > b.min.z - r && this.pos.z < b.max.z + r) {
          if (this.pos.y + 0.25 > b.min.y && this.pos.y - this.eyeH < b.min.y) {
            this.pos.y = b.min.y - 0.3 + this.eyeH;
            this.vel.y = 0;
          }
        }
      }
    }

    // arena clamp
    const lim = ARENA.half - 1.6;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));

    // ── third-person body (F4) ──
    const B = this.body;
    B.group.visible = this.thirdPerson;
    if (this.thirdPerson) {
      B.group.position.set(this.pos.x, this.pos.y - this.eyeH, this.pos.z);
      B.group.rotation.y = this.yaw + Math.PI;
      this._animT += dt;
      const spd = Math.hypot(this.vel.x, this.vel.z);
      const moving = spd > 0.6 && this.onGround;
      const cyc = this.sprinting ? 13 : 8.5;
      const amp = moving ? Math.min(spd / 9.5, 1) * 0.75 : 0.05;
      const sw = Math.sin(this._animT * cyc) * amp;
      B.parts.legL.rotation.x = sw;
      B.parts.legR.rotation.x = -sw;
      B.parts.armL.rotation.x = -0.85 - sw * 0.2;
      B.parts.armR.rotation.x = -0.35 + sw * 0.2;
      const scaleTarget = this.crouching ? 0.74 : 1;
      this._bodyScale += (scaleTarget - this._bodyScale) * Math.min(1, dt * 10);
      B.group.scale.y = this._bodyScale;
    }

    // ── camera ──
    this.bobT += dt * (this.onGround ? Math.hypot(this.vel.x, this.vel.z) : 0);
    const bobY = Math.sin(this.bobT * 1.9) * 0.045 * Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 9);
    const bobX = Math.cos(this.bobT * 0.95) * 0.03 * Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 9);
    this.landImpact = Math.max(0, this.landImpact - dt * 1.4);

    this.camera.position.set(
      this.pos.x + bobX * Math.cos(this.yaw),
      this.pos.y + bobY - this.landImpact * 0.5,
      this.pos.z + bobX * Math.sin(this.yaw)
    );
    this.recoilPitch = Math.max(0, this.recoilPitch - dt * 3.5);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch;

    // ── third-person camera offset (F4 toggle) ──
    if (this.thirdPerson) {
      const fwx = -Math.sin(this.yaw), fwz = -Math.cos(this.yaw);
      this.camera.position.x += -fwx * 3.1 + fwz * 0.7;
      this.camera.position.z += -fwz * 3.1 - fwx * 0.7;
      this.camera.position.y += 0.45;
      if (this.camera.position.y < 0.4) this.camera.position.y = 0.4;
    }
  }

  _collideAxis(axis, r, colliders, feet) {
    const p = this.pos;
    for (const b of colliders) {
      if (feet() >= b.max.y - 0.05) continue;          // standing on top
      if (p.y < b.min.y + 0.2) continue;               // fully below
      if (p.x > b.min.x - r && p.x < b.max.x + r &&
          p.z > b.min.z - r && p.z < b.max.z + r) {
        if (axis === 'x') {
          const pushLeft = (b.max.x + r) - p.x;
          const pushRight = p.x - (b.min.x - r);
          p.x += pushLeft < pushRight ? pushLeft : -pushRight;
          this.vel.x = 0;
        } else {
          const pushNear = (b.max.z + r) - p.z;
          const pushFar = p.z - (b.min.z - r);
          p.z += pushNear < pushFar ? pushNear : -pushFar;
          this.vel.z = 0;
        }
      }
    }
  }

  // get eye position + forward direction
  getEye(out) { return out.copy(this.pos); }
  getForward(out) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)).normalize();
  }
}
