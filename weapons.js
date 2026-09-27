// ═══════════════ WEAPONS v3 — realistic models + reload animation ═══════════════
import * as THREE from 'three';

export const WEAPONS = {
  rifle: {
    name: 'AK-47 VULCAN', slot: 1,
    mag: 30, magSize: 30, reserve: 150,
    damage: 24, headMult: 2.2,
    rpm: 600, reloadTime: 2.4,
    spread: 0.010, spreadMoving: 0.030,
    recoil: 0.013, range: 120,
    auto: true, pellets: 1,
    tracerColor: 0xffd27a, sfx: 'rifle',
  },
  shotgun: {
    name: 'M3 SUPER 90', slot: 2,
    mag: 7, magSize: 7, reserve: 48,
    damage: 14, headMult: 1.6,
    rpm: 70, reloadTime: 3.2,
    spread: 0.058, spreadMoving: 0.075,
    recoil: 0.055, range: 40,
    auto: false, pellets: 9,
    tracerColor: 0xffb46a, sfx: 'shotgun',
  },
  katana: {
    name: 'COMBAT KNIFE', slot: 3,
    damage: 55, headMult: 1.5,
    rpm: 150, range: 3.2,
    reloadTime: 0, mag: Infinity, reserve: Infinity,
    sfx: 'katana',
  },
};

export class WeaponSystem {
  constructor(camera) {
    this.camera = camera;
    this.current = 'rifle';
    this.state = WEAPONS.rifle;
    this.lastShot = 0;
    this.reloading = false;
    this.reloadEnd = 0;
    this.reloadStart = 0;
    this.aiming = false;

    this.vm = new THREE.Group();
    camera.add(this.vm);
    this.buildViewModels();
    this.switchTo('rifle', true);
  }

  buildViewModels() {
    // ── materials ──
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35, metalness: 0.9 });
    const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.5 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4f26, roughness: 0.65, metalness: 0.1 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x5e3a1c, roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.25, metalness: 1 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.3, metalness: 1 });
    const hands = new THREE.MeshStandardMaterial({ color: 0x9a7358, roughness: 0.85 });
    const gloves = new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.9 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xb8c4cc, roughness: 0.15, metalness: 1 });

    const mkHands = (g, leftPos, rightPos) => {
      // simple gloved hands gripping
      const mkHand = (p, rot) => {
        const h = new THREE.Group();
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.11), gloves);
        h.add(palm);
        for (let i = 0; i < 4; i++) {
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.028), gloves);
          f.position.set(0, -0.014, 0.045 - i * 0.03);
          h.add(f);
        }
        const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.07), gloves);
        thumb.position.set(0.035, 0.01, 0);
        h.add(thumb);
        const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), gloves);
        wrist.position.set(0, -0.01, 0.11);
        h.add(wrist);
        h.position.copy(p);
        h.rotation.set(rot.x, rot.y, rot.z);
        g.add(h);
        return h;
      };
      mkHand(leftPos, { x: 0, y: 0.2, z: 0 });
      mkHand(rightPos, { x: 0, y: -0.2, z: 0 });
    };

    // ═══ AK-47 style rifle ═══
    const rifle = new THREE.Group();
    // receiver
    const rcv = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.42), gunmetal);
    rcv.position.set(0, 0, -0.18); rifle.add(rcv);
    // dust cover top
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.34), gunmetal);
    cover.position.set(0, 0.062, -0.16); rifle.add(cover);
    // barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 10), steel);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.025, -0.56); rifle.add(barrel);
    // gas tube above barrel
    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), gunmetal);
    gas.rotation.x = Math.PI / 2; gas.position.set(0, 0.055, -0.46); rifle.add(gas);
    // front sight + muzzle
    const fSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), gunmetal);
    fSight.position.set(0, 0.075, -0.72); rifle.add(fSight);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, 0.06, 8), steel);
    muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.025, -0.77); rifle.add(muzzle);
    // wooden handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.22), wood);
    handguard.position.set(0, 0.005, -0.48); rifle.add(handguard);
    // wooden stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.26), darkWood);
    stock.position.set(0, -0.01, 0.18); stock.rotation.x = -0.06; rifle.add(stock);
    // pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.055), darkWood);
    grip.position.set(0, -0.1, -0.02); grip.rotation.x = 0.35; rifle.add(grip);
    // trigger guard
    const tg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.07), gunmetal);
    tg.position.set(0, -0.062, -0.06); rifle.add(tg);
    // curved magazine (the AK signature)
    const magGroup = new THREE.Group();
    const mag1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.075), gunmetal);
    magGroup.add(mag1);
    const mag2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.075), gunmetal);
    mag2.position.set(0, -0.1, 0.028); mag2.rotation.x = -0.5; magGroup.add(mag2);
    const mag3 = new THREE.Mesh(new THREE.BoxGeometry(0.043, 0.08, 0.07), gunmetal);
    mag3.position.set(0, -0.175, 0.085); mag3.rotation.x = -0.95; magGroup.add(mag3);
    magGroup.position.set(0, -0.075, -0.12);
    rifle.add(magGroup);
    this.rifleMag = magGroup;
    // charging handle
    const chandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), steel);
    chandle.position.set(0.05, 0.04, -0.05); rifle.add(chandle);
    this.rifleCharging = chandle;
    // iron sights rear
    const rSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.02), gunmetal);
    rSight.position.set(0, 0.088, -0.02); rifle.add(rSight);
    mkHands(rifle,
      new THREE.Vector3(0, -0.05, -0.47),   // left on handguard
      new THREE.Vector3(0.005, -0.09, -0.03) // right on grip
    );

    // ═══ M3 shotgun ═══
    const sg = new THREE.Group();
    const sRcv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), gunmetal);
    sRcv.position.set(0, 0, -0.12); sg.add(sRcv);
    const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.55, 10), steel);
    sBarrel.rotation.x = Math.PI / 2; sBarrel.position.set(0, 0.03, -0.5); sg.add(sBarrel);
    const sTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), gunmetal);
    sTube.rotation.x = Math.PI / 2; sTube.position.set(0, -0.035, -0.46); sg.add(sTube);
    // pump handle (slides during reload)
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.14, 10, 1, true), black);
    pump.rotation.x = Math.PI / 2; pump.position.set(0, -0.002, -0.42); sg.add(pump);
    this.sgPump = pump;
    // ghost ring sights
    const sRear = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), gunmetal);
    sRear.position.set(0, 0.075, 0.0); sg.add(sRear);
    const sFront = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.008), brass);
    sFront.position.set(0, 0.065, -0.75); sg.add(sFront);
    // stock + grip
    const sStock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), black);
    sStock.position.set(0, -0.015, 0.2); sStock.rotation.x = -0.08; sg.add(sStock);
    const sGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), black);
    sGrip.position.set(0, -0.09, 0.02); sGrip.rotation.x = 0.3; sg.add(sGrip);
    // shell holder on receiver
    for (let i = 0; i < 4; i++) {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8),
        i % 2 ? brass : new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.6 }));
      shell.rotation.z = Math.PI / 2;
      shell.position.set(-0.045, 0.04 - i * 0.028, -0.08);
      sg.add(shell);
    }
    mkHands(sg,
      new THREE.Vector3(0, -0.045, -0.42),
      new THREE.Vector3(0.005, -0.085, 0.0)
    );

    // ═══ combat knife ═══
    const kn = new THREE.Group();
    const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.28), bladeMat);
    kBlade.position.set(0, 0.01, -0.2); kn.add(kBlade);
    // blade tip (cone)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 4), bladeMat);
    tip.rotation.x = -Math.PI / 2; tip.position.set(0, 0.01, -0.38); kn.add(tip);
    // serrations
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.015), bladeMat);
      s.position.set(0, 0.032, -0.12 - i * 0.03);
      kn.add(s);
    }
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.02), black);
    guard.position.set(0, 0, -0.05); kn.add(guard);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.13, 8), black);
    handle.rotation.x = Math.PI / 2; handle.position.set(0, -0.005, 0.03); kn.add(handle);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), steel);
    pommel.position.set(0, -0.005, 0.1); kn.add(pommel);
    mkHands(kn,
      new THREE.Vector3(0.02, -0.06, 0.05),
      new THREE.Vector3(0.005, -0.055, 0.035)
    );

    this.models = { rifle, shotgun: sg, katana: kn };
    Object.values(this.models).forEach(m => { m.visible = false; this.vm.add(m); });
  }

  get gunTip() {
    const p = new THREE.Vector3();
    const offsets = {
      rifle: new THREE.Vector3(0.17, -0.12, -0.9),
      shotgun: new THREE.Vector3(0.18, -0.12, -0.95),
      katana: new THREE.Vector3(0, -0.1, -0.4),
    };
    p.copy(offsets[this.current] || offsets.rifle);
    this.camera.updateMatrixWorld();
    return p.applyMatrix4(this.camera.matrixWorld);
  }

  switchTo(key, instant = false) {
    if (!WEAPONS[key] || (key === this.current && !instant)) return;
    if (this.reloading && !instant) return;
    this.current = key;
    this.state = WEAPONS[key];
    this.reloading = false;
    Object.entries(this.models).forEach(([k, m]) => m.visible = k === key);
    this.vm.position.set(0, -0.35, 0.15);
    this.vm.userData.drawT = 0.25;
  }

  canFire(now) {
    const w = this.state;
    if (this.reloading) return false;
    if (w.sfx === 'katana') return now - this.lastShot >= 60 / w.rpm;
    return w.mag > 0 && now - this.lastShot >= 60 / w.rpm;
  }

  startReload(now) {
    const w = this.state;
    if (this.reloading || w.sfx === 'katana') return false;
    if (w.mag >= w.magSize || w.reserve <= 0) return false;
    this.reloading = true;
    this.reloadStart = now;
    this.reloadEnd = now + w.reloadTime;
    return true;
  }

  getReloadProgress(now) {
    if (!this.reloading) return 0;
    return Math.min(1, (now - this.reloadStart) / (this.reloadEnd - this.reloadStart));
  }

  tickReload(now) {
    if (!this.reloading) return false;
    if (now >= this.reloadEnd) {
      const w = this.state;
      const need = w.magSize - w.mag;
      const take = Math.min(need, w.reserve);
      w.mag += take; w.reserve -= take;
      this.reloading = false;
      return true;
    }
    return false;
  }

  addShotTime(now) { this.lastShot = now; }
  spendAmmo() { if (this.state.mag !== Infinity) this.state.mag--; }
}

// ── viewmodel animation incl. realistic reload sequence ──
export function animateViewmodel(ws, player, dt, moving, firingKick, now) {
  const vm = ws.vm;
  const w = ws.current;

  const baseX = ws.aiming ? 0 : 0.17;
  const baseY = ws.aiming ? -0.105 : -0.135;
  const baseZ = ws.aiming ? -0.2 : -0.3;

  vm.userData.drawT = Math.max(0, (vm.userData.drawT || 0) - dt);
  const draw = vm.userData.drawT / 0.25;

  const targetPos = new THREE.Vector3(baseX, baseY, baseZ);
  const bob = Math.sin(player.bobT * 1.9) * (moving ? 0.011 : 0.002);
  targetPos.y += bob;
  targetPos.x += Math.cos(player.bobT * 0.95) * (moving ? 0.008 : 0.001);

  vm.position.lerp(targetPos, 1 - Math.pow(0.0001, dt));
  vm.position.y -= draw * 0.3;

  // recoil kick
  vm.userData.kick = Math.max(0, (vm.userData.kick || 0) - dt * 10);
  const kick = vm.userData.kick + firingKick;
  vm.position.z += kick * 0.06;
  vm.rotation.x = kick * 0.1 + draw * 0.6;

  // weapon-specific anims
  const model = ws.models[ws.current];
  if (!model) return;

  if (ws.reloading && w !== 'katana') {
    const p = ws.getReloadProgress(now);
    // phases: 0-0.25 tilt+magout, 0.25-0.5 mag in, 0.5-0.75 bolt, 0.75-1 settle
    let tiltY = 0, tiltZ = 0, dropY = 0;
    if (p < 0.3) {
      const k = p / 0.3;
      tiltZ = k * 0.5; tiltY = k * 0.2; dropY = k * 0.06;
      if (ws.rifleMag) ws.rifleMag.position.y = -0.075 - k * 0.12;
    } else if (p < 0.6) {
      const k = (p - 0.3) / 0.3;
      tiltZ = 0.5 - k * 0.35; tiltY = 0.2; dropY = 0.06;
      if (ws.rifleMag) ws.rifleMag.position.y = -0.075 - 0.12 + (0.12 * Math.min(1, k * 1.4));
      // shotgun pump pull
      if (ws.sgPump) ws.sgPump.position.z = -0.42 + Math.sin(k * Math.PI) * 0.12;
    } else if (p < 0.85) {
      const k = (p - 0.6) / 0.25;
      tiltZ = 0.15 - k * 0.15; tiltY = 0.2 - k * 0.2; dropY = 0.06 - k * 0.06;
      // charging handle pull
      if (ws.rifleCharging) ws.rifleCharging.position.z = -0.05 + Math.sin(k * Math.PI) * 0.07;
      vm.rotation.x += Math.sin(k * Math.PI) * 0.12;
    } else {
      const k = (p - 0.85) / 0.15;
      tiltZ = 0; tiltY = 0; dropY = 0;
      if (ws.rifleMag) ws.rifleMag.position.y = -0.075;
      if (ws.sgPump) ws.sgPump.position.z = -0.42;
      if (ws.rifleCharging) ws.rifleCharging.position.z = -0.05;
      vm.rotation.x += (1 - k) * 0.05;
    }
    vm.rotation.z += tiltZ;
    vm.rotation.y = tiltY;
    vm.position.y -= dropY;
  } else {
    vm.rotation.z = w === 'katana' ? 0.1 + kick * 0.03 : 0.015 + kick * 0.03;
    vm.rotation.y = 0;
    if (ws.rifleMag) ws.rifleMag.position.y = -0.075;
    if (ws.sgPump) ws.sgPump.position.z = -0.42;
    if (ws.rifleCharging) ws.rifleCharging.position.z = -0.05;
  }
}
