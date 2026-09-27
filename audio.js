// ═══════════════════ AUDIO ENGINE (WebAudio synth — no files needed) ═══════════════════

let ctx = null;
let master = null;
let enabled = true;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

export function setVolume(v) { if (master) master.gain.value = v; }
export function toggleAudio() { enabled = !enabled; return enabled; }

function now() { return ctx.currentTime; }

function env(gainNode, t0, attack, decay, peak) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + attack);
  g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function noiseBuffer(dur) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function playNoise({ dur = 0.2, freq = 1000, q = 1, type = 'bandpass', vol = 0.5, slideTo = null, delay = 0 }) {
  if (!ctx || !enabled) return;
  const t0 = now() + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur);
  const filt = ctx.createBiquadFilter();
  filt.type = type; filt.frequency.value = freq; filt.Q.value = q;
  if (slideTo) filt.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = ctx.createGain();
  env(g, t0, 0.005, dur, vol);
  src.connect(filt).connect(g).connect(master);
  src.start(t0); src.stop(t0 + dur + 0.1);
}

function playTone({ f0 = 440, f1 = null, dur = 0.2, type = 'sine', vol = 0.3, delay = 0 }) {
  if (!ctx || !enabled) return;
  const t0 = now() + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
  const g = ctx.createGain();
  env(g, t0, 0.005, dur, vol);
  osc.connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.1);
}

// ── weapon sounds (layered, punchy CS-style) ──
export const sfx = {
  rifle() {
    // crack (high transient) + body (mid) + boom (low) + mechanical tick
    playNoise({ dur: 0.05, freq: 5200, q: 0.6, vol: 0.55, slideTo: 1400 });
    playNoise({ dur: 0.14, freq: 900, q: 0.5, vol: 0.45, slideTo: 180, type: 'lowpass' });
    playTone({ f0: 190, f1: 50, dur: 0.11, type: 'sawtooth', vol: 0.32 });
    playNoise({ dur: 0.03, freq: 7000, q: 1, vol: 0.18 });
    // tail echo
    playNoise({ dur: 0.3, freq: 500, q: 0.4, vol: 0.1, slideTo: 120, type: 'lowpass', delay: 0.05 });
  },
  shotgun() {
    playNoise({ dur: 0.08, freq: 3800, q: 0.5, vol: 0.7, slideTo: 700 });
    playNoise({ dur: 0.3, freq: 500, q: 0.4, vol: 0.6, slideTo: 60, type: 'lowpass' });
    playTone({ f0: 110, f1: 30, dur: 0.25, type: 'sawtooth', vol: 0.45 });
    playNoise({ dur: 0.5, freq: 300, q: 0.3, vol: 0.14, slideTo: 70, type: 'lowpass', delay: 0.06 });
  },
  katana() {
    playNoise({ dur: 0.14, freq: 6000, q: 2, type: 'highpass', vol: 0.4, slideTo: 1200 });
    playTone({ f0: 1600, f1: 400, dur: 0.1, type: 'sine', vol: 0.08 });
  },
  katanaHit() {
    playNoise({ dur: 0.1, freq: 3400, q: 1.4, vol: 0.5 });
    playTone({ f0: 900, f1: 220, dur: 0.09, type: 'triangle', vol: 0.25 });
  },
  // full reload foley: mag release click → mag out → mag in → bolt rack
  reload() {
    playTone({ f0: 1100, f1: 800, dur: 0.03, type: 'square', vol: 0.12 });           // release click
    playNoise({ dur: 0.08, freq: 1800, q: 2, vol: 0.2, delay: 0.12 });               // mag out slide
    playTone({ f0: 320, f1: 180, dur: 0.06, type: 'square', vol: 0.16, delay: 0.3 }); // mag out drop
    playNoise({ dur: 0.06, freq: 2200, q: 2, vol: 0.22, delay: 0.9 });               // mag grab
    playTone({ f0: 180, f1: 420, dur: 0.07, type: 'square', vol: 0.2, delay: 1.1 });  // mag in thunk
    playNoise({ dur: 0.05, freq: 2600, q: 1.5, vol: 0.25, delay: 1.55 });            // bolt back
    playTone({ f0: 500, f1: 260, dur: 0.05, type: 'square', vol: 0.22, delay: 1.7 }); // bolt release clack
  },
  shotgunReload() {
    // shell insert foley loop feel
    playNoise({ dur: 0.07, freq: 2000, q: 2, vol: 0.2 });
    playTone({ f0: 240, f1: 400, dur: 0.06, type: 'square', vol: 0.16, delay: 0.08 });
  },
  dryFire() { playTone({ f0: 1200, f1: 700, dur: 0.04, type: 'square', vol: 0.14 }); },
  weaponSwitch() {
    playNoise({ dur: 0.05, freq: 2400, q: 2, vol: 0.15 });
    playTone({ f0: 400, f1: 700, dur: 0.06, type: 'square', vol: 0.1, delay: 0.04 });
  },

  // hits & kills
  hit() { playTone({ f0: 1300, f1: 500, dur: 0.06, type: 'triangle', vol: 0.22 }); },
  headshot() {
    playTone({ f0: 1900, f1: 700, dur: 0.09, type: 'triangle', vol: 0.28 });
    playTone({ f0: 2600, f1: 1200, dur: 0.06, type: 'sine', vol: 0.18, delay: 0.02 });
  },
  kill() {
    // small fiery pop
    playNoise({ dur: 0.3, freq: 500, q: 0.5, vol: 0.35, slideTo: 80, type: 'lowpass' });
    playTone({ f0: 300, f1: 60, dur: 0.28, type: 'sawtooth', vol: 0.22 });
  },
  explosion(big = false) {
    const d = big ? 0.9 : 0.5;
    playNoise({ dur: d, freq: 350, q: 0.3, type: 'lowpass', vol: big ? 0.8 : 0.5, slideTo: 40 });
    playTone({ f0: 90, f1: 28, dur: d, type: 'sawtooth', vol: big ? 0.45 : 0.28 });
    playNoise({ dur: 0.15, freq: 3000, q: 0.5, vol: 0.2 }); // crack
  },

  // player
  dash() {
    playNoise({ dur: 0.25, freq: 1400, q: 0.8, type: 'bandpass', vol: 0.3, slideTo: 3000 });
  },
  jump() { playTone({ f0: 300, f1: 550, dur: 0.1, type: 'sine', vol: 0.12 }); },
  hurt() {
    playTone({ f0: 220, f1: 90, dur: 0.2, type: 'sawtooth', vol: 0.3 });
    playNoise({ dur: 0.15, freq: 600, q: 1, vol: 0.2 });
  },
  heal() {
    playTone({ f0: 600, f1: 1200, dur: 0.25, type: 'sine', vol: 0.18 });
  },
  playerDeath() {
    playTone({ f0: 400, f1: 40, dur: 1.4, type: 'sawtooth', vol: 0.4 });
    playNoise({ dur: 1.2, freq: 800, q: 0.5, vol: 0.3, slideTo: 60, type: 'lowpass' });
  },

  // bot
  botShot() {
    playNoise({ dur: 0.12, freq: 1600, q: 0.8, vol: 0.22, slideTo: 200 });
    playTone({ f0: 500, f1: 150, dur: 0.1, type: 'square', vol: 0.1 });
  },
  botSpawn() {
    playTone({ f0: 80, f1: 400, dur: 0.4, type: 'sawtooth', vol: 0.16 });
    playNoise({ dur: 0.35, freq: 2000, q: 3, vol: 0.1, slideTo: 400 });
  },

  // ui / waves
  waveStart() {
    playTone({ f0: 220, f1: 440, dur: 0.35, type: 'square', vol: 0.16 });
    playTone({ f0: 440, f1: 880, dur: 0.4, type: 'square', vol: 0.14, delay: 0.18 });
  },
  waveClear() {
    [660, 880, 1320].forEach((f, i) => playTone({ f0: f, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.12 }));
  },
  combo(n) { playTone({ f0: 700 + n * 90, f1: 1100 + n * 120, dur: 0.12, type: 'square', vol: 0.12 }); },
  pickup() { [880, 1320].forEach((f, i) => playTone({ f0: f, dur: 0.12, type: 'sine', vol: 0.15, delay: i * 0.07 })); },
};
