// ═══════════════════ PLAYER — FPS controller ═══════════════════
import * as THREE from 'three';

const EYE = 1.62;
const RADIUS = 0.42;

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

    // ── dash movement ──
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vel.x = this.dashDir.x * 26;
      this.vel.z = this.dashDir.z * 26;
      this.vel.y = Math.max(this.vel.y, -2);
    } else {
      const dir = this._wishDir();
      const speed = 9.5;
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
    const feet = () => this.pos.y - EYE;

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
    if (this.pos.y - EYE <= 0) {
      if (wasAir && this.vel.y < -10) this.landImpact = 0.25;
      this.pos.y = EYE;
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
          if (feet() <= top && feet() > top - 0.55 && this.pos.y - EYE - this.vel.y * dt >= top - 0.3) {
            this.pos.y = top + EYE;
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
          if (this.pos.y + 0.25 > b.min.y && this.pos.y - EYE < b.min.y) {
            this.pos.y = b.min.y - 0.25 + EYE * 0;
            this.pos.y = b.min.y - 0.3;
            this.vel.y = 0;
          }
        }
      }
    }

    // arena clamp
    const lim = 40.4;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));

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
