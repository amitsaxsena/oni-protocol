// ═══════════ WORLD v4 — high-detail textured desert town ═══════════
import * as THREE from 'three';

export const ARENA = { half: 52 };

// ── texture kit: 512px + bump maps + weathering ──
function canvasOf(w, h, fn) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function speckle(c, w, h, n, alpha, light) {
  for (let i = 0; i < n; i++) {
    const v = Math.random();
    c.fillStyle = light
      ? `rgba(255,250,240,${alpha * v})`
      : `rgba(20,12,8,${alpha * v})`;
    c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function grimeBottom(c, w, h, strength = 0.5) {
  const g = c.createLinearGradient(0, h * 0.55, 0, h);
  g.addColorStop(0, 'rgba(40,28,16,0)');
  g.addColorStop(1, `rgba(40,28,16,${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

function waterStreaks(c, w, h, n = 8) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w;
    const g = c.createLinearGradient(x, 0, x, h * (0.3 + Math.random() * 0.5));
    g.addColorStop(0, 'rgba(50,40,28,0.25)');
    g.addColorStop(1, 'rgba(50,40,28,0)');
    c.fillStyle = g;
    c.fillRect(x, 0, 2 + Math.random() * 5, h);
  }
}

// ═══ BRICK: per-brick jitter, bevels, chips + matching bump ═══
function makeBrick() {
  const map = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#6e5a44';           // mortar
    c.fillRect(0, 0, w, h);
    const bh = 34, bw = 84;
    for (let row = 0, y = 4; y < h; y += bh, row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const r = 150 + Math.random() * 55;
        const g = 105 + Math.random() * 40;
        const b = 74 + Math.random() * 30;
        c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        // brick with slight irregular edges
        c.fillRect(x + off + 3, y + 3, bw - 6, bh - 6);
        // top bevel light
        c.fillStyle = 'rgba(255,240,220,0.22)';
        c.fillRect(x + off + 3, y + 3, bw - 6, 4);
        // bottom shadow
        c.fillStyle = 'rgba(30,18,10,0.3)';
        c.fillRect(x + off + 3, y + bh - 7, bw - 6, 4);
        // chips
        if (Math.random() < 0.4) {
          c.fillStyle = 'rgba(70,55,40,0.8)';
          c.fillRect(x + off + Math.random() * (bw - 14) + 4, y + Math.random() * (bh - 10) + 4, 3 + Math.random() * 6, 2 + Math.random() * 4);
        }
      }
    }
    speckle(c, w, h, 2200, 0.16, false);
    speckle(c, w, h, 900, 0.1, true);
    waterStreaks(c, w, h, 6);
    grimeBottom(c, w, h, 0.35);
  });
  const bump = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#303030'; c.fillRect(0, 0, w, h);   // mortar low
    const bh = 34, bw = 84;
    for (let row = 0, y = 4; y < h; y += bh, row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const v = 200 + Math.random() * 40 | 0;
        c.fillStyle = `rgb(${v},${v},${v})`;
        c.fillRect(x + off + 3, y + 3, bw - 6, bh - 6);
      }
    }
    speckle(c, w, h, 1500, 0.25, true);
  });
  return { map, bump };
}

// ═══ PLASTER: smooth with cracks, patches, edge break ═══
function makePlaster() {
  const map = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#c9b490';
    c.fillRect(0, 0, w, h);
    // repair patches
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(${170 + Math.random() * 40 | 0},${150 + Math.random() * 30 | 0},${115 + Math.random() * 25 | 0},0.55)`;
      c.beginPath();
      c.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 70, 20 + Math.random() * 50, Math.random() * 3, 0, 7);
      c.fill();
    }
    // cracks
    c.strokeStyle = 'rgba(60,45,30,0.5)';
    for (let i = 0; i < 10; i++) {
      c.lineWidth = 0.8 + Math.random() * 1.6;
      c.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      c.moveTo(x, y);
      for (let s = 0; s < 7; s++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 90; c.lineTo(x, y); }
      c.stroke();
    }
    // exposed brick at bottom edge
    const bh = 30, bw = 78;
    for (let row = 0, y = h - 66; y < h; y += bh, row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        c.fillStyle = `rgb(${135 + Math.random() * 40 | 0},${95 + Math.random() * 30 | 0},${65 + Math.random() * 20 | 0})`;
        if (Math.random() < 0.8) c.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      }
    }
    speckle(c, w, h, 1800, 0.12, false);
    waterStreaks(c, w, h, 10);
    grimeBottom(c, w, h, 0.45);
  });
  const bump = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#c8c8c8'; c.fillRect(0, 0, w, h);
    // crack grooves
    c.strokeStyle = '#404040';
    for (let i = 0; i < 10; i++) {
      c.lineWidth = 1 + Math.random() * 2;
      c.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      c.moveTo(x, y);
      for (let s = 0; s < 7; s++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 90; c.lineTo(x, y); }
      c.stroke();
    }
    const bh = 30, bw = 78;
    for (let row = 0, y = h - 66; y < h; y += bh, row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        c.fillStyle = '#909090';
        if (Math.random() < 0.8) c.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      }
    }
    speckle(c, w, h, 1200, 0.2, true);
  });
  return { map, bump };
}

// ═══ CONCRETE: aggregate + stains ═══
function makeConcrete() {
  const map = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#a8a49a';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 4000, 0.2, false);
    speckle(c, w, h, 2500, 0.14, true);
    // panel seams
    c.strokeStyle = 'rgba(50,48,44,0.6)';
    c.lineWidth = 3;
    c.strokeRect(2, 2, w - 4, h - 4);
    c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    // stains
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `rgba(70,62,50,${0.12 + Math.random() * 0.2})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 14 + Math.random() * 45, 0, 7);
      c.fill();
    }
    waterStreaks(c, w, h, 7);
    grimeBottom(c, w, h, 0.4);
  });
  const bump = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#b5b5b5'; c.fillRect(0, 0, w, h);
    speckle(c, w, h, 3500, 0.3, false);
    speckle(c, w, h, 2000, 0.25, true);
    c.strokeStyle = '#555';
    c.lineWidth = 3;
    c.strokeRect(2, 2, w - 4, h - 4);
  });
  return { map, bump };
}

// ═══ WOOD PLANKS: grain, nails, bevels ═══
function makeWood() {
  const map = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#4a3320';
    c.fillRect(0, 0, w, h);
    const pw = 64;
    for (let p = 0, x = 0; x < w; x += pw, p++) {
      const tone = 0.85 + Math.random() * 0.35;
      c.fillStyle = `rgb(${138 * tone | 0},${98 * tone | 0},${58 * tone | 0})`;
      c.fillRect(x + 2, 0, pw - 4, h);
      // grain
      c.strokeStyle = `rgba(70,45,22,${0.35 + Math.random() * 0.3})`;
      for (let g = 0; g < 7; g++) {
        c.lineWidth = 0.8 + Math.random();
        c.beginPath();
        const gx = x + 6 + Math.random() * (pw - 12);
        c.moveTo(gx, 0);
        for (let y = 0; y <= h; y += 24) c.lineTo(gx + Math.sin(y * 0.05 + gx) * 4, y);
        c.stroke();
      }
      // plank bevels
      c.fillStyle = 'rgba(255,230,200,0.16)';
      c.fillRect(x + 2, 0, 2, h);
      c.fillStyle = 'rgba(25,14,6,0.4)';
      c.fillRect(x + pw - 4, 0, 2, h);
      // nails
      c.fillStyle = '#2a2a2e';
      c.fillRect(x + 8, 14, 4, 4);
      c.fillRect(x + pw - 14, h - 20, 4, 4);
    }
    speckle(c, w, h, 900, 0.12, false);
  });
  const bump = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#787878'; c.fillRect(0, 0, w, h);
    const pw = 64;
    for (let x = 0; x < w; x += pw) {
      c.fillStyle = '#c0c0c0';
      c.fillRect(x + 2, 0, pw - 4, h);
      c.fillStyle = '#303030';
      c.fillRect(x + pw - 4, 0, 3, h);
    }
    speckle(c, w, h, 700, 0.2, true);
  });
  return { map, bump };
}

// ═══ METAL: corrugation + rust ═══
function makeMetal() {
  const map = canvasOf(256, 256, (c, w, h) => {
    c.fillStyle = '#767c82';
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(x, 0, 5, h);
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(x + 9, 0, 4, h);
    }
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(${130 + Math.random() * 60 | 0},${55 + Math.random() * 25 | 0},18,${0.15 + Math.random() * 0.4})`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 0, 7);
      c.fill();
    }
    speckle(c, w, h, 600, 0.14, false);
  });
  const bump = canvasOf(256, 256, (c, w, h) => {
    c.fillStyle = '#909090'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      c.fillStyle = '#383838';
      c.fillRect(x, 0, 5, h);
      c.fillStyle = '#d0d0d0';
      c.fillRect(x + 9, 0, 4, h);
    }
  });
  return { map, bump };
}

// ═══ SAND: fine ripples + pebbles ═══
function makeSand() {
  const map = canvasOf(512, 512, (c, w, h) => {
    c.fillStyle = '#c2a878';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 5000, 0.1, true);
    speckle(c, w, h, 3500, 0.1, false);
    c.strokeStyle = 'rgba(120,95,55,0.12)';
    for (let y = 0; y < h; y += 11) {
      c.lineWidth = 1.5;
      c.beginPath();
      for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.045 + y * 0.7) * 3);
      c.stroke();
    }
    // pebbles
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(${100 + Math.random() * 60 | 0},${85 + Math.random() * 40 | 0},${60 + Math.random() * 30 | 0},0.7)`;
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 0, 7);
      c.fill();
    }
  });
  return { map, bump: null };
}

// ═══ torn poster texture ═══
function makePoster(text, mainColor) {
  return canvasOf(256, 340, (c, w, h) => {
    c.fillStyle = '#ddd2b8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = mainColor;
    c.fillRect(14, 14, w - 28, 90);
    c.fillStyle = '#ddd2b8';
    c.font = 'bold 52px "KaiTi", "Microsoft YaHei", serif';
    c.textAlign = 'center';
    c.fillText(text, w / 2, 78);
    // body lines
    c.fillStyle = 'rgba(40,30,20,0.75)';
    c.font = '26px "KaiTi", serif';
    ['招', '聘', '英', '雄'].forEach((ch, i) => c.fillText(ch, w / 2, 150 + i * 44));
    // red seal
    c.fillStyle = 'rgba(170,25,25,0.9)';
    c.fillRect(w - 70, h - 90, 44, 44);
    // torn edges (erase corners + strips)
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 14; i++) {
      const edge = Math.random() < 0.5;
      const t = Math.random();
      c.beginPath();
      if (edge) { c.arc(t * w, Math.random() < 0.5 ? 0 : h, 8 + Math.random() * 20, 0, 7); }
      else { c.arc(Math.random() < 0.5 ? 0 : w, t * h, 8 + Math.random() * 18, 0, 7); }
      c.fill();
    }
    // scratch strips
    for (let i = 0; i < 5; i++) {
      c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 20 + Math.random() * 60);
    }
    c.globalCompositeOperation = 'source-over';
  });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.drumGroups = [];
    this.solidMeshes = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.clouds = [];
    this.dustMotes = null;
    this.birds = null;
    this.build();
  }

  addCollider(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(box);
    this.solidMeshes.push(mesh);
  }

  build() {
    this.buildSky();
    this.buildGround();
    this.buildBoundary();
    this.buildDustBuildings();
    this.buildCrates();
    this.buildSandbags();
    this.buildBarrels();
    this.buildWalls();
    this.buildPosters();
    this.buildClouds();
    this.buildCables();
    this.buildDustMotes();
    this.buildBirds();
  }

  buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          top: { value: new THREE.Color(0x4a86c8) },
          bottom: { value: new THREE.Color(0xd8c8a8) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(bottom, top, clamp(h*1.6, 0.0, 1.0)), 1.0); }`
      })
    );
    this.group.add(sky);

    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: canvasOf(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,250,230,1)');
        g.addColorStop(0.25, 'rgba(255,240,200,0.7)');
        g.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      }), transparent: true, depthWrite: false
    }));
    sun.scale.setScalar(60);
    sun.position.set(90, 110, -60);
    this.group.add(sun);
  }

  buildGround() {
    const sand = makeSand();
    sand.map.repeat.set(24, 24);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA.half * 2, ARENA.half * 2),
      new THREE.MeshStandardMaterial({ map: sand.map, roughness: 0.96 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);
    this.solidMeshes.push(floor);

    // dirt roads (span the full arena)
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA.half * 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 1 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    this.group.add(road);
    const road2 = road.clone();
    road2.rotation.z = Math.PI / 2;
    this.group.add(road2);

    // manholes + debris
    const mhMat = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.8, metalness: 0.4 });
    [[-10, 3], [12, -3], [0, 18], [-20, -12], [24, 8]].forEach(([x, z]) => {
      const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16), mhMat);
      mh.position.set(x, 0.03, z);
      this.group.add(mh);
    });
    // scattered stones
    for (let i = 0; i < 26; i++) {
      const st = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.16, 0),
        new THREE.MeshStandardMaterial({ color: 0x9a8a6e, roughness: 1 })
      );
      st.position.set((Math.random() - .5) * (ARENA.half * 2 - 8), 0.06, (Math.random() - .5) * (ARENA.half * 2 - 8));
      st.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.group.add(st);
    }
  }

  buildBoundary() {
    const conc = makeConcrete();
    const H = ARENA.half;
    const mk = (w, d, x, z) => {
      const map = conc.map.clone(); map.needsUpdate = true;
      const bump = conc.bump.clone(); bump.needsUpdate = true;
      map.repeat.set(Math.max(2, w / 8), 1);
      bump.repeat.copy(map.repeat);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, 6, d),
        new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, roughness: 0.94 })
      );
      wall.position.set(x, 3, z);
      this.group.add(wall);
      this.addCollider(wall);

      // painted red band at base with gold trim
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.2, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x8e1d16, roughness: 0.9 })
      );
      band.position.set(x, 0.85, z + (d > w ? 0 : (z > 0 ? -0.52 : 0.52)));
      if (d > w) band.rotation.y = Math.PI / 2;
      this.group.add(band);
      const trim = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.2, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xc8a02e, roughness: 0.6, metalness: 0.4 })
      );
      trim.position.set(band.position.x, 1.44, band.position.z);
      trim.rotation.y = band.rotation.y;
      this.group.add(trim);
      // wall cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.3, 0.25, d + 0.3),
        new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.9 })
      );
      cap.position.set(x, 6.1, z);
      this.group.add(cap);
    };
    mk(H * 2 + 2, 1, 0, -H - 0.5);
    mk(H * 2 + 2, 1, 0, H + 0.5);
    mk(1, H * 2 + 2, -H - 0.5, 0);
    mk(1, H * 2 + 2, H + 0.5, 0);
  }

  buildDustBuildings() {
    const brick = makeBrick();
    const plaster = makePlaster();
    const wood = makeWood();

    const mkBuilding = (x, z, w, h, d, kind) => {
      const src = kind === 'brick' ? brick : plaster;
      const map = src.map.clone(); map.needsUpdate = true;
      const bump = src.bump.clone(); bump.needsUpdate = true;
      map.repeat.set(Math.max(1.5, w / 5), Math.max(1, h / 5));
      bump.repeat.copy(map.repeat);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.7, roughness: 0.94 })
      );
      b.position.set(x, h / 2, z);
      this.group.add(b);
      this.addCollider(b);

      // cornice (top ledge) + base skirt
      const cor = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x9a8c72, roughness: 0.9 })
      );
      cor.position.set(x, h + 0.12, z);
      this.group.add(cor);
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.24, 0.9, d + 0.24),
        new THREE.MeshStandardMaterial({ color: 0x6e6455, roughness: 0.95 })
      );
      skirt.position.set(x, 0.45, z);
      this.group.add(skirt);

      // wooden door + frame
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.4),
        new THREE.MeshStandardMaterial({ map: wood.map.clone(), roughness: 0.9 })
      );
      door.material.map.needsUpdate = true;
      door.position.set(x, 1.2, z + d / 2 + 0.03);
      this.group.add(door);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.7, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.85 })
      );
      frame.position.set(x, 1.35, z + d / 2 + 0.01);
      this.group.add(frame);

      // windows with frames
      const winMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.35, metalness: 0.7 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.85 });
      for (let i = 0; i < Math.floor(w / 4); i++) {
        const wx = x - w / 2 + 2 + i * 4;
        const wf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.08), frameMat);
        wf.position.set(wx, h * 0.62, z + d / 2 + 0.01);
        this.group.add(wf);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), winMat);
        win.position.set(wx, h * 0.62, z + d / 2 + 0.07);
        this.group.add(win);
        // wooden shutters
        [-0.75, 0.75].forEach(sx => {
          const sh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.06),
            new THREE.MeshStandardMaterial({ map: wood.map, roughness: 0.9 }));
          sh.position.set(wx + sx, h * 0.62, z + d / 2 + 0.06);
          this.group.add(sh);
        });
      }
      // awning
      const awn = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.09, 1.3),
        new THREE.MeshStandardMaterial({ color: kind === 'brick' ? 0x8a3a2a : 0x3a6a4a, roughness: 0.95 })
      );
      awn.position.set(x, 2.85, z + d / 2 + 0.65);
      awn.rotation.x = 0.28;
      this.group.add(awn);
      // support poles
      [-1.2, 1.2].forEach(px => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 }));
        pole.position.set(x + px, 2.5, z + d / 2 + 1.15);
        this.group.add(pole);
      });
    };

    mkBuilding(-28, -30, 14, 7, 10, 'brick');
    mkBuilding(0, -32, 16, 6, 8, 'plaster');
    mkBuilding(28, -30, 14, 8, 10, 'brick');
    mkBuilding(-34, -8, 10, 6, 14, 'plaster');
    mkBuilding(34, -8, 10, 7, 14, 'brick');
    mkBuilding(-30, 18, 12, 6, 12, 'plaster');
    mkBuilding(30, 18, 12, 7, 12, 'brick');
    mkBuilding(-16, 34, 14, 6, 8, 'brick');
    mkBuilding(16, 34, 14, 7, 8, 'plaster');

    // outer ring (expanded arena)
    mkBuilding(-44, -44, 12, 6, 10, 'plaster');
    mkBuilding(44, -44, 12, 7, 10, 'brick');
    mkBuilding(-44, 44, 12, 7, 10, 'brick');
    mkBuilding(44, 44, 12, 6, 10, 'plaster');
    mkBuilding(-46, 4, 10, 6, 12, 'brick');
    mkBuilding(46, 4, 10, 7, 12, 'plaster');
    mkBuilding(-20, -46, 12, 6, 8, 'brick');
    mkBuilding(20, 46, 12, 6, 8, 'plaster');
  }

  buildCrates() {
    const wood = makeWood();
    const defs = [
      [-10, -8, 0], [-9, -10.4, 0], [10, -8, 0], [-2, 14, 0.5], [2.2, 14, 0],
      [-22, 6, 0.3], [22, 6, 0],      [-14, 22, 0], [14, 22, 0.2], [0, -20, 0],
      [-4, -20, 0], [4, -20, 0], [26, -18, 0.4], [-26, -18, 0],
      [8, 30, 0], [-8, 30, 0], [30, 28, 0], [-30, 28, 0],
      // outer ring
      [-40, 36, 0], [40, -36, 0.3], [-48, -30, 0], [48, 30, 0],
      [-30, 46, 0], [30, -46, 0], [-48, 30, 0], [48, -30, 0],
    ];
    defs.forEach(([x, z, rot]) => {
      const map = wood.map.clone(); map.needsUpdate = true;
      const bump = wood.bump.clone(); bump.needsUpdate = true;
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.4, roughness: 0.9 })
      );
      crate.position.set(x, 1, z);
      crate.rotation.y = rot;
      this.group.add(crate);
      this.addCollider(crate);
      // metal corner brackets
      const bm = new THREE.MeshStandardMaterial({ color: 0x4a4a50, metalness: 0.8, roughness: 0.4 });
      [[-0.97, -0.97], [0.97, -0.97], [-0.97, 0.97], [0.97, 0.97]].forEach(([bx, bz]) => {
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.05, 0.1), bm);
        br.position.set(x + bx, 1, z + bz);
        br.rotation.y = rot;
        this.group.add(br);
      });
      if (Math.random() < 0.3) {
        const c2 = crate.clone();
        c2.position.y = 3;
        c2.rotation.y += 0.4;
        this.group.add(c2);
        this.colliders.push(new THREE.Box3(
          new THREE.Vector3(x - 1, 2, z - 1), new THREE.Vector3(x + 1, 4, z + 1)
        ));
        this.solidMeshes.push(c2);
      }
    });
  }

  buildSandbags() {
    const bagCv = canvasOf(128, 128, (c, w, h) => {
      c.fillStyle = '#9a8a62'; c.fillRect(0, 0, w, h);
      speckle(c, w, h, 1400, 0.15, false);
      // burlap weave
      c.strokeStyle = 'rgba(70,58,35,0.25)';
      for (let y = 0; y < h; y += 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      for (let x = 0; x < w; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      grimeBottom(c, w, h, 0.3);
    });
    const bagMat = new THREE.MeshStandardMaterial({ map: bagCv, roughness: 1 });
    const rows = [
      [-16, -16, 0, 6], [16, -16, 0, 6], [-6, 8, Math.PI / 2, 5], [6, 8, Math.PI / 2, 5],
      [0, 24, 0, 7], [-24, 14, Math.PI / 2, 4], [24, 14, Math.PI / 2, 4],
      // outer ring
      [-40, 12, Math.PI / 2, 5], [40, -12, Math.PI / 2, 5],
      [-10, -44, 0, 5], [10, 44, 0, 5],
    ];
    rows.forEach(([x, z, rot, n]) => {
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        for (let layer = 0; layer < 3; layer++) {
          const bag = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bagMat);
          bag.scale.set(1.2, 0.55, 0.8);
          bag.position.set(
            (i - n / 2 + 0.5) * 1.05 + (layer % 2) * 0.3,
            0.3 + layer * 0.42,
            (Math.random() - .5) * 0.15
          );
          bag.rotation.y = Math.random() * 0.4;
          g.add(bag);
        }
      }
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.group.add(g);
      const along = rot === 0 ? { w: n * 1.05, d: 1.2 } : { w: 1.2, d: n * 1.05 };
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(x - along.w / 2, 0, z - along.d / 2),
        new THREE.Vector3(x + along.w / 2, 1.5, z + along.d / 2)
      ));
    });
  }

  buildBarrels() {
    const metal = makeMetal();
    const positions = [
      [-12, -4], [12, -4], [-3, 20], [3, 20], [-28, -22], [28, -22],
      [18, 16], [-18, 16], [0, -2], [22, 30], [-22, 30],
      // outer ring
      [36, 36], [-36, -36], [-48, 16], [48, -16], [6, -38], [-6, 38],
    ];
    const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12);
    positions.forEach(([x, z]) => {
      const map = metal.map.clone(); map.needsUpdate = true;
      const bump = metal.bump.clone(); bump.needsUpdate = true;
      const g = new THREE.Group();
      const body = new THREE.Mesh(drumGeo,
        new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.3, roughness: 0.6, metalness: 0.6 }));
      body.position.y = 0.55;
      g.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0xa02818, roughness: 0.7 }));
      band.position.y = 0.6;
      g.add(band);
      g.position.set(x, 0, z);
      this.group.add(g);
      this.drumGroups.push({ group: g, pos: new THREE.Vector3(x, 0.55, z), alive: true, glow: band });
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(x - 0.45, 0, z - 0.45),
        new THREE.Vector3(x + 0.45, 1.15, z + 0.45)
      ));
    });
  }

  buildWalls() {
    const brick = makeBrick();
    const conc = makeConcrete();
    const defs = [
      [-12, 2, 7, 1, 2.6, 'brick'], [12, 2, 7, 1, 2.6, 'brick'],
      [0, -12, 9, 1, 2.6, 'concrete'],
      [-22, -6, 1, 8, 2.8, 'brick'], [22, -6, 1, 8, 2.8, 'brick'],
      [-8, 26, 8, 1, 2.4, 'concrete'], [8, 26, 8, 1, 2.4, 'concrete'],
      [-34, 4, 1, 7, 2.8, 'brick'], [34, 4, 1, 7, 2.8, 'brick'],
      // outer ring cover
      [-40, -24, 8, 1, 2.6, 'brick'], [40, 24, 8, 1, 2.6, 'brick'],
      [-24, 44, 1, 8, 2.6, 'concrete'], [24, -44, 1, 8, 2.6, 'concrete'],
      [0, 46, 9, 1, 2.4, 'concrete'], [0, -44, 9, 1, 2.4, 'brick'],
      [0, 36, 10, 1, 2.4, 'concrete'],
      [-18, 12, 1, 6, 2.4, 'brick'], [18, 12, 1, 6, 2.4, 'brick'],
    ];
    defs.forEach(([x, z, w, d, h, kind]) => {
      const src = kind === 'brick' ? brick : conc;
      const map = src.map.clone(); map.needsUpdate = true;
      const bump = src.bump.clone(); bump.needsUpdate = true;
      map.repeat.set(Math.max(1, Math.max(w, d) / 4), 1);
      bump.repeat.copy(map.repeat);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.55, roughness: 0.93 })
      );
      wall.position.set(x, h / 2, z);
      this.group.add(wall);
      this.addCollider(wall);
      // wall cap
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(w + (d > w ? 0 : 0.25), 0.18, d + (w > d ? 0 : 0.25)),
        new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.9 })
      );
      cap.position.set(x, h + 0.09, z);
      this.group.add(cap);
    });
  }

  buildPosters() {
    // torn posters on walls & buildings
    const texts = [
      ['武', '#8e1d16'], ['鏢', '#1d4a8e'], ['招', '#8e6a1d'], ['快', '#2a6e2a'],
      ['鏢', '#8e1d16'], ['招', '#1d4a8e'], ['武', '#8e6a1d'], ['快', '#6e2a2a'],
      ['招', '#8e1d16'], ['鏢', '#2a6e2a'],
    ];
    const spots = [
      { x: -20.5, y: 2.2, z: -51.4, ry: 0 }, { x: 8, y: 3.4, z: -51.4, ry: 0 },
      { x: 22, y: 2.6, z: -51.4, ry: 0 }, { x: -51.4, y: 2.8, z: 16, ry: Math.PI / 2 },
      { x: 51.4, y: 2.4, z: -2, ry: -Math.PI / 2 }, { x: -51.4, y: 3.6, z: -8, ry: Math.PI / 2 },
      { x: 51.4, y: 3.2, z: 18, ry: -Math.PI / 2 }, { x: -34.4, y: 2.6, z: -4, ry: Math.PI / 2 },
      { x: 0, y: 2.4, z: -11.4, ry: 0 }, { x: 18.6, y: 3.2, z: 12, ry: -Math.PI / 2 },
    ];
    spots.forEach(({ x, y, z, ry }, i) => {
      const [t, col] = texts[i % texts.length];
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.5),
        new THREE.MeshStandardMaterial({ map: makePoster(t, col), transparent: true, roughness: 0.95 })
      );
      p.position.set(x, y, z);
      p.rotation.y = ry;
      p.rotation.z = (Math.random() - .5) * 0.16;
      this.group.add(p);
    });
  }

  buildClouds() {
    const tex = canvasOf(256, 128, (c) => {
      for (let i = 0; i < 26; i++) {
        const g = c.createRadialGradient(40 + Math.random() * 176, 40 + Math.random() * 60, 4, 40 + Math.random() * 176, 40 + Math.random() * 60, 22 + Math.random() * 26);
        g.addColorStop(0, 'rgba(255,255,255,0.75)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 256, 128);
      }
    });
    for (let i = 0; i < 7; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false }));
      spr.scale.set(40 + Math.random() * 30, 14 + Math.random() * 8, 1);
      spr.position.set((Math.random() - .5) * 260, 55 + Math.random() * 30, (Math.random() - .5) * 260);
      spr.userData.speed = 0.4 + Math.random() * 0.5;
      this.group.add(spr);
      this.clouds.push(spr);
    }
  }

  buildCables() {
    const cableMat = new THREE.LineBasicMaterial({ color: 0x181818 });
    const spans = [
      [-28, -22, 0, -22], [0, -25, 14, -25], [28, -22, 40, -22],
      [-34, -4, -34, 8], [34, -4, 34, 8], [-14, 28, 14, 28],
      [-20, 14, -8, 14], [8, 14, 20, 14],
    ];
    spans.forEach(([x1, z1, x2, z2]) => {
      const pts = [];
      const N = 12;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const sag = Math.sin(t * Math.PI) * 0.9;
        pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, 5.2 - sag, z1 + (z2 - z1) * t));
      }
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
      if (Math.random() < 0.6) {
        const t = 0.3 + Math.random() * 0.4;
        const lan = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0xcc2211, emissiveIntensity: 0.9, roughness: 0.6 })
        );
        lan.scale.y = 0.85;
        lan.position.set(x1 + (x2 - x1) * t, 5.2 - Math.sin(t * Math.PI) * 0.9 - 0.35, z1 + (z2 - z1) * t);
        this.group.add(lan);
      }
    });
  }

  buildDustMotes() {
    const N = 250;
    const R = ARENA.half - 4;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * R * 2;
      pos[i * 3 + 1] = 0.3 + Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - .5) * R * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustMotes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8c8a0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
    this.group.add(this.dustMotes);
  }

  buildBirds() {
    const N = 14;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.birds = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x2a2a30, size: 0.5 }));
    this.birds.userData.t = 0;
    this.group.add(this.birds);
  }

  getAliveDrums() { return this.drumGroups.filter(d => d.alive); }

  explodeDrum(drum) {
    if (!drum.alive) return false;
    drum.alive = false;
    drum.group.visible = false;
    const p = drum.pos;
    this.colliders = this.colliders.filter(b => !(
      Math.abs(b.min.x - (p.x - 0.45)) < 0.01 && Math.abs(b.max.z - (p.z + 0.45)) < 0.01
    ));
    return true;
  }

  update(dt = 0.016, t = 0) {
    this.clouds.forEach(c => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 150) c.position.x = -150;
    });
    if (this.dustMotes) {
      const R = ARENA.half - 4;
      const p = this.dustMotes.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + dt * 0.6;
        let y = p.getY(i) + Math.sin(t + i) * dt * 0.15;
        if (x > R) x = -R;
        p.setX(i, x);
        p.setY(i, y);
      }
      p.needsUpdate = true;
    }
    if (this.birds) {
      this.birds.userData.t += dt * 0.12;
      const tt = this.birds.userData.t;
      const p = this.birds.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = tt + i * 0.5;
        const r = 50 + (i % 3) * 14;
        p.setXYZ(i, Math.cos(a) * r, 34 + Math.sin(tt * 2 + i) * 3, Math.sin(a) * r);
      }
      p.needsUpdate = true;
    }
  }
}
