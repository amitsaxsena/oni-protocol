// ═══════════ Chinese wall art — murals, banners, door signs ═══════════
import * as THREE from 'three';
import { ARENA } from './world.js?v=9';

// calligraphy-style large character
function calligraphyTexture(char, color = '#8a1a1a', bg = '#e8dcc0') {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, 256, 256);
  // aged paper stains
  for (let i = 0; i < 10; i++) {
    c.fillStyle = `rgba(120,90,40,${0.05 + Math.random() * 0.08})`;
    c.beginPath();
    c.arc(Math.random() * 256, Math.random() * 256, 15 + Math.random() * 40, 0, 7);
    c.fill();
  }
  // border
  c.strokeStyle = color;
  c.lineWidth = 8;
  c.strokeRect(10, 10, 236, 236);
  // character — serif brush feel
  c.fillStyle = color;
  c.font = 'bold 170px "KaiTi", "STKaiti", "Microsoft YaHei", serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(char, 128, 140);
  // red seal stamp
  c.fillStyle = 'rgba(180,30,30,0.85)';
  c.fillRect(190, 190, 44, 44);
  c.fillStyle = '#e8dcc0';
  c.font = 'bold 22px serif';
  c.fillText('印', 212, 214);
  return new THREE.CanvasTexture(cv);
}

// horizontal blessing banner (couplet)
function bannerTexture(text, color = '#e8b02e', bg = '#a01818') {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, 512, 128);
  // gold trim
  c.strokeStyle = color;
  c.lineWidth = 5;
  c.strokeRect(6, 6, 500, 116);
  c.strokeRect(14, 14, 484, 100);
  // tassel pattern ends
  c.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    c.fillRect(20 + i * 12, 100, 6, 20);
    c.fillRect(484 - i * 12, 100, 6, 20);
  }
  c.fillStyle = color;
  c.font = 'bold 72px "KaiTi", "Microsoft YaHei", serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 66);
  return new THREE.CanvasTexture(cv);
}

// mural texture — dragon-ish swirls + mountains
function muralTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const c = cv.getContext('2d');
  // plaster bg
  c.fillStyle = '#d8ccb0';
  c.fillRect(0, 0, 1024, 512);
  // stains
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(100,80,50,${0.03 + Math.random() * 0.06})`;
    c.beginPath();
    c.arc(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 80, 0, 7);
    c.fill();
  }
  // mountains silhouettes
  c.fillStyle = 'rgba(60,70,90,0.55)';
  c.beginPath();
  c.moveTo(0, 380);
  for (let x = 0; x <= 1024; x += 40) c.lineTo(x, 340 - Math.sin(x * 0.012) * 60 - Math.random() * 25);
  c.lineTo(1024, 512); c.lineTo(0, 512);
  c.fill();
  c.fillStyle = 'rgba(40,50,70,0.7)';
  c.beginPath();
  c.moveTo(0, 430);
  for (let x = 0; x <= 1024; x += 30) c.lineTo(x, 400 - Math.sin(x * 0.02 + 2) * 45 - Math.random() * 15);
  c.lineTo(1024, 512); c.lineTo(0, 512);
  c.fill();
  // red sun
  c.fillStyle = 'rgba(180,40,30,0.8)';
  c.beginPath(); c.arc(790, 150, 55, 0, 7); c.fill();
  // golden dragon swirl (simplified serpentine stroke)
  c.strokeStyle = 'rgba(190,140,40,0.9)';
  c.lineWidth = 14;
  c.lineCap = 'round';
  c.beginPath();
  for (let x = 60; x <= 720; x += 8) {
    const y = 180 + Math.sin(x * 0.014) * 55 + Math.sin(x * 0.05) * 12;
    x === 60 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.stroke();
  // dragon head hint
  c.fillStyle = 'rgba(190,140,40,0.95)';
  c.beginPath(); c.arc(730, 150, 26, 0, 7); c.fill();
  c.strokeStyle = 'rgba(190,140,40,0.95)';
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(740, 138); c.lineTo(772, 118); c.stroke(); // horn
  // claw strokes
  c.lineWidth = 8;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(700 + i * 22, 210);
    c.lineTo(690 + i * 22, 250);
    c.stroke();
  }
  // calligraphy column
  c.fillStyle = 'rgba(30,30,30,0.85)';
  c.font = 'bold 54px "KaiTi", "Microsoft YaHei", serif';
  const poem = ['龍', '騰', '四', '海'];
  poem.forEach((ch, i) => c.fillText(ch, 930, 90 + i * 70));
  // bottom border band
  c.fillStyle = 'rgba(140,30,25,0.85)';
  c.fillRect(0, 480, 1024, 32);
  return new THREE.CanvasTexture(cv);
}

// circular "fu" door plaque
function plaqueTexture(char = '福') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#8a1a1a';
  c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill();
  c.strokeStyle = '#e8b02e';
  c.lineWidth = 6;
  c.beginPath(); c.arc(128, 128, 108, 0, 7); c.stroke();
  c.fillStyle = '#e8b02e';
  c.font = 'bold 130px "KaiTi", "Microsoft YaHei", serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(char, 128, 138);
  return new THREE.CanvasTexture(cv);
}

export function buildChineseArt(world) {
  const group = new THREE.Group();
  world.group.add(group);
  const H = ARENA.half;

  // ── big mural on north boundary wall (facing player spawn) ──
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 5),
    new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.95 })
  );
  mural.position.set(0, 2.6, -H + 0.52);
  mural.rotation.y = 0;
  group.add(mural);
  // wooden frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.8 });
  [[-12.2, 0], [12.2, 0]].forEach(([fx]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.4, 0.12), frameMat);
    post.position.set(fx, 2.6, -H + 0.48);
    group.add(post);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(25, 0.3, 0.12), frameMat);
  top.position.set(0, 5.4, -H + 0.48);
  group.add(top);

  // ── vertical couplet banners on both sides of mural ──
  ['福', '安'].forEach((ch, i) => {
    const tex = calligraphyTexture(ch, '#c8b02e', '#a01818');
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 4.6),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
    );
    banner.position.set(-16.5 + i * 33, 2.5, -H + 0.5);
    group.add(banner);
  });

  // ── wall plaques scattered on side walls ──
  const plaques = [
    { x: -H + 0.52, z: -20, ry: Math.PI / 2, ch: '武' },
    { x: -H + 0.52, z: 6, ry: Math.PI / 2, ch: '勇' },
    { x: H - 0.52, z: -20, ry: -Math.PI / 2, ch: '義' },
    { x: H - 0.52, z: 6, ry: -Math.PI / 2, ch: '禮' },
    { x: -H + 0.52, z: 28, ry: Math.PI / 2, ch: '信' },
    { x: H - 0.52, z: 28, ry: -Math.PI / 2, ch: '和' },
  ];
  plaques.forEach(({ x, z, ry, ch }) => {
    const tex = plaqueTexture(ch);
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
    );
    m.position.set(x, 3.2, z);
    m.rotation.y = ry;
    group.add(m);
  });

  // ── hanging cloth banners across streets (sway in wind) ──
  const bannerDefs = [
    { x1: -18, z1: -14, x2: -4, z2: -14 },
    { x1: 4, z1: -14, x2: 18, z2: -14 },
    { x1: -14, z1: 10, x2: -2, z2: 10 },
    { x1: 2, z1: 10, x2: 14, z2: 10 },
    { x1: -20, z1: 26, x2: -8, z2: 26 },
    { x1: 8, z1: 26, x2: 20, z2: 26 },
  ];
  const bannerTexts = ['恭喜發財', '龍馬精神', '生意興隆', '出入平安', '心想事成', '萬事如意'];
  world.clothBanners = [];
  bannerDefs.forEach((d, i) => {
    const len = Math.hypot(d.x2 - d.x1, d.z2 - d.z1);
    const tex = bannerTexture(bannerTexts[i % bannerTexts.length]);
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(len, 0.85, 8, 1),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.95 })
    );
    b.position.set((d.x1 + d.x2) / 2, 4.6, (d.z1 + d.z2) / 2);
    b.rotation.y = Math.atan2(d.z2 - d.z1, d.x2 - d.x1);
    // sag
    b.rotation.z = 0.04;
    group.add(b);
    // support poles
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.85 });
    [{ x: d.x1, z: d.z1 }, { x: d.x2, z: d.z2 }].forEach(p => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 6), poleMat);
      pole.position.set(p.x, 2.5, p.z);
      group.add(pole);
      world.colliders.push(new THREE.Box3(
        new THREE.Vector3(p.x - 0.12, 0, p.z - 0.12),
        new THREE.Vector3(p.x + 0.12, 5, p.z + 0.12)
      ));
    });
    world.clothBanners.push(b);
  });

  // ── doorway signs on buildings (horizontal boards) ──
  const doorSigns = [
    { x: -28, z: -24.8, t: '武馆' }, { x: 0, z: -27.8, t: '客栈' }, { x: 28, z: -24.8, t: '酒家' },
    { x: -34, z: 0.2, t: '茶樓', ry: Math.PI / 2 }, { x: 34, z: 0.2, t: '賭坊', ry: -Math.PI / 2 },
    { x: -16, z: 29.8, t: '布莊' }, { x: 16, z: 29.8, t: '鐵舖' },
  ];
  doorSigns.forEach(({ x, z, t, ry = 0 }) => {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#20160c';
    c.fillRect(0, 0, 256, 64);
    c.strokeStyle = '#c8a02e';
    c.lineWidth = 4;
    c.strokeRect(4, 4, 248, 56);
    c.fillStyle = '#e8c04e';
    c.font = 'bold 40px "KaiTi", "Microsoft YaHei", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(t, 128, 34);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 0.75),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })
    );
    m.position.set(x, 3.3, z);
    m.rotation.y = ry;
    group.add(m);
  });

  return group;
}
