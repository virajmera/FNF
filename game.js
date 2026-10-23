// Neon Rush: an original rhythm game inspired by Friday Night Funkin'.
// The songs are synthesized with the Web Audio API, so the project ships no audio files.

const canvas = document.getElementById('game');
const g2d = canvas.getContext('2d');
let W = 0;
let H = 0;

const KEY_TO_LANE = {
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowUp: 2,
  ArrowRight: 3,
};
const LANE_COLORS = ['#c24dff', '#2fb8ff', '#3ddc6b', '#ff4d6d'];
const LANE_DARK = ['#4a1470', '#0a4670', '#0f5a2c', '#7a1a2e'];
// Arrow rotation per lane: left, down, up, right (the arrow shape points up by default).
const ARROW_ANGLES = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];
const ARROW_SHAPE = [[0, -1], [0.9, 0], [0.4, 0], [0.4, 1], [-0.4, 1], [-0.4, 0], [-0.9, 0]];

// Songs. Each one has its own tempo, chord progression, and note patterns.
const SONGS = [
  {
    title: 'Neon Rush',
    bpm: 120,
    chords: [
      { bass: 110.0, pad: [220.0, 261.63, 329.63] },  // Am
      { bass: 87.31, pad: [174.61, 220.0, 261.63] },  // F
      { bass: 130.81, pad: [261.63, 329.63, 392.0] }, // C
      { bass: 98.0, pad: [196.0, 246.94, 293.66] },   // G
    ],
    patterns: { A: '0.1.2.3.', B: '1.3.0.2.', C: '0.2.3.1.', D: '2.0.2.3.' },
    section: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'],
  },
  {
    title: 'Midnight Drift',
    bpm: 96,
    chords: [
      { bass: 73.42, pad: [146.83, 174.61, 220.0] },   // Dm
      { bass: 116.54, pad: [233.08, 293.66, 349.23] }, // Bb
      { bass: 87.31, pad: [174.61, 220.0, 261.63] },   // F
      { bass: 130.81, pad: [261.63, 329.63, 392.0] },  // C
    ],
    patterns: { A: '0...1.2.', B: '3.1.0...', C: '2.0.1...', D: '1.3.2.0.' },
    section: ['A', 'B', 'A', 'C', 'A', 'D', 'B', 'C'],
  },
  {
    title: 'Turbo Sunset',
    bpm: 150,
    chords: [
      { bass: 82.41, pad: [164.81, 196.0, 246.94] },  // Em
      { bass: 130.81, pad: [261.63, 329.63, 392.0] }, // C
      { bass: 98.0, pad: [196.0, 246.94, 293.66] },   // G
      { bass: 73.42, pad: [146.83, 185.0, 220.0] },   // D
    ],
    patterns: { A: '0.1.2.3.', B: '3.2.1.0.', C: '1.0.3.2.', D: '2.3.0.1.' },
    section: ['A', 'B', 'C', 'A', 'D', 'B', 'A', 'C'],
  },
  {
    title: 'Overdrive',
    bpm: 170,
    chords: [
      { bass: 65.41, pad: [130.81, 155.56, 196.0] },   // Cm
      { bass: 103.83, pad: [207.65, 261.63, 311.13] }, // Ab
      { bass: 77.78, pad: [155.56, 196.0, 233.08] },   // Eb
      { bass: 116.54, pad: [233.08, 293.66, 349.23] }, // Bb
    ],
    patterns: { A: '0.1.2.3.', B: '3.2.1.0.', C: '0.2.0.3.', D: '1.3.2.0.' },
    section: ['A', 'B', 'C', 'A', 'D', 'B', 'A', 'C'],
  },
  {
    title: 'Warp Speed',
    bpm: 190,
    chords: [
      { bass: 98.0, pad: [196.0, 233.08, 293.66] },   // Gm
      { bass: 77.78, pad: [155.56, 196.0, 233.08] },  // Eb
      { bass: 87.31, pad: [174.61, 220.0, 261.63] },  // F
      { bass: 73.42, pad: [146.83, 185.0, 220.0] },   // D
    ],
    patterns: {
      W1: '0.1.2.3.0.1.2.3.',
      W2: '0.2.1.3.0.2.1.3.',
      W3: '0...1...2...3...',
      W4: '3.1.2.0.3.1.2.0.',
    },
    section: ['W1', 'W2', 'W3', 'W1', 'W4', 'W2', 'W3', 'W4'],
  },
  {
    title: 'Hyperdrive',
    bpm: 210,
    chords: [
      { bass: 73.42, pad: [146.83, 174.61, 220.0] },   // Dm
      { bass: 116.54, pad: [233.08, 293.66, 349.23] }, // Bb
      { bass: 130.81, pad: [261.63, 329.63, 392.0] },  // C
      { bass: 110.0, pad: [220.0, 277.18, 329.63] },   // A
    ],
    patterns: {
      H1: '0.1.2.3.0.1.2.3.',
      H2: '0...2...1...3...',
      H3: '3.2.1.0.3.2.1.0.',
      H4: '0.3.1.2.0.3.1.2.',
    },
    section: ['H1', 'H2', 'H1', 'H3', 'H2', 'H4', 'H1', 'H3'],
  },
];

// Timing for the selected song. setupSong() fills these in.
let current = SONGS[0];
let BEAT = 0.5;
let BAR = 2;
let STEP = 0.25;
let SONG_END = 0;
const LEAD_IN = 2;            // seconds before the first note
const BARS = 32;

// Play field. SPEED, STRUM_Y and LANE_LEFT depend on the window size, so resize() sets them.
let SPEED = 450;              // pixels per second
let STRUM_Y = 500;
let LANE_LEFT = 0;
const LANE_W = 110;
const ARROW_SIZE = 44;

const HIT_WINDOWS = { sick: 0.045, good: 0.09, bad: 0.135 };
const JUDGE = {
  sick: { points: 350, health: 3, weight: 1, color: '#7ef7ff' },
  good: { points: 200, health: 2, weight: 0.7, color: '#9dff7e' },
  bad: { points: 100, health: 0.5, weight: 0.4, color: '#ffd166' },
  miss: { points: 0, health: -6, weight: 0, color: '#ff4d6d' },
};

// Combo streak tiers that turn on the fire. Each tier adds more flames.
const FIRE_TIERS = [
  { combo: 10, label: 'HOT', color: '#ffd166', rate: 18 },
  { combo: 25, label: 'ON FIRE', color: '#ff9f1c', rate: 40 },
  { combo: 50, label: 'INFERNO', color: '#ff3b1f', rate: 75 },
];

let selected = 0;             // index into SONGS on the menu
let audio = null;             // { ctx, master, noise, clockStart }
let state = 'menu';           // 'menu' | 'playing' | 'results'
let notes = [];
let songTime = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let health = 50;
let counts = { sick: 0, good: 0, bad: 0, miss: 0 };
let popup = null;
let particles = [];
let lastFrameMs = 0;
const laneFlash = [0, 0, 0, 0];

// ---------- Song setup and chart ----------

function setupSong(song) {
  current = song;
  BEAT = 60 / song.bpm;
  BAR = BEAT * 4;
  STEP = BAR / 8;
  SONG_END = LEAD_IN + BARS * BAR + 1;
}

function buildChart() {
  const chart = [];
  for (let bar = 0; bar < BARS; bar++) {
    const pattern = current.patterns[current.section[bar % current.section.length]];
    // A pattern has 8 slots (eighth notes) or 16 slots (sixteenth notes) per bar.
    const slotLen = BAR / pattern.length;
    for (let slot = 0; slot < pattern.length; slot++) {
      const symbol = pattern[slot];
      if (symbol === '.') continue;
      chart.push({
        time: LEAD_IN + bar * BAR + slot * slotLen,
        lane: Number(symbol),
        judged: false,
      });
    }
  }
  return chart;
}

// ---------- Audio ----------

function createAudio() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  return { ctx, master, noise, clockStart: 0 };
}

function voice(a, type, freq, t, dur, vol) {
  const osc = a.ctx.createOscillator();
  const gain = a.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function kick(a, t) {
  const osc = a.ctx.createOscillator();
  const gain = a.ctx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain).connect(a.master);
  osc.start(t);
  osc.stop(t + 0.32);
}

function noiseHit(a, t, dur, filterType, freq, vol) {
  const src = a.ctx.createBufferSource();
  const filter = a.ctx.createBiquadFilter();
  const gain = a.ctx.createGain();
  src.buffer = a.noise;
  filter.type = filterType;
  filter.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(a.master);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur);
}

function scheduleMusic(a, start) {
  for (let bar = 0; bar < BARS; bar++) {
    const t0 = start + bar * BAR;
    const chord = current.chords[bar % current.chords.length];
    chord.pad.forEach(freq => voice(a, 'sine', freq, t0, BAR, 0.03));

    for (let slot = 0; slot < 8; slot++) {
      const t = t0 + slot * STEP;
      if (slot % 4 === 0) kick(a, t);
      if (slot % 4 === 2) noiseHit(a, t, 0.15, 'bandpass', 1800, 0.5);
      noiseHit(a, t, 0.04, 'highpass', 7000, 0.15);
      voice(a, 'triangle', slot % 4 === 2 ? chord.bass * 2 : chord.bass, t, STEP * 0.9, 0.3);
      voice(a, 'square', chord.pad[slot % 3] * 2, t, STEP * 0.8, 0.025);
    }
  }
}

// ---------- Game flow ----------

function startSong() {
  if (audio) audio.ctx.close();
  setupSong(SONGS[selected]);
  audio = createAudio();
  audio.clockStart = audio.ctx.currentTime + 0.1;
  scheduleMusic(audio, audio.clockStart + LEAD_IN);

  notes = buildChart();
  score = 0;
  combo = 0;
  maxCombo = 0;
  health = 50;
  counts = { sick: 0, good: 0, bad: 0, miss: 0 };
  popup = null;
  particles = [];
  lastFrameMs = performance.now();
  state = 'playing';
  showOverlay(null);
  requestAnimationFrame(frame);
}

function showMenu() {
  state = 'menu';
  if (audio) audio.ctx.close();
  audio = null;
  renderSongList();
  showOverlay('menu');
}

function endSong(failed) {
  state = 'results';
  songTime = audio.ctx.currentTime - audio.clockStart;
  draw();
  audio.ctx.close();
  audio = null;
  showResults(failed);
}

function frame() {
  if (state !== 'playing') return;
  const nowMs = performance.now();
  const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;
  songTime = audio.ctx.currentTime - audio.clockStart;

  for (const note of notes) {
    if (!note.judged && songTime - note.time > HIT_WINDOWS.bad) {
      note.judged = true;
      judge('miss');
    }
  }

  if (health <= 0) return endSong(true);
  if (songTime > SONG_END) return endSong(false);

  spawnFlames(dt);
  updateParticles(dt);
  draw();
  requestAnimationFrame(frame);
}

function judge(grade) {
  const j = JUDGE[grade];
  counts[grade]++;
  score += j.points;
  health = Math.min(100, Math.max(0, health + j.health));
  combo = grade === 'miss' ? 0 : combo + 1;
  maxCombo = Math.max(maxCombo, combo);
  popup = { text: grade.toUpperCase(), color: j.color, time: performance.now() };
}

function onLanePressed(lane) {
  laneFlash[lane] = performance.now();
  songTime = audio.ctx.currentTime - audio.clockStart;

  let best = null;
  let bestDiff = Infinity;
  for (const note of notes) {
    if (note.judged || note.lane !== lane) continue;
    const diff = Math.abs(songTime - note.time);
    if (diff <= HIT_WINDOWS.bad && diff < bestDiff) {
      best = note;
      bestDiff = diff;
    }
  }
  if (!best) return;

  best.judged = true;
  if (bestDiff <= HIT_WINDOWS.sick) judge('sick');
  else if (bestDiff <= HIT_WINDOWS.good) judge('good');
  else judge('bad');
  spawnSparks(lane);
}

// ---------- Particles and fire ----------

const MAX_PARTICLES = 700;

function addParticle(p) {
  if (particles.length < MAX_PARTICLES) particles.push(p);
}

// Flames rise from the strum line while a combo streak is active.
function spawnFlames(dt) {
  const level = fireLevel();
  if (level === 0) return;
  const rate = FIRE_TIERS[level - 1].rate;
  for (let lane = 0; lane < 4; lane++) {
    let count = Math.floor(rate * dt);
    if (Math.random() < rate * dt - count) count++;
    for (let i = 0; i < count; i++) {
      const life = 0.45 + Math.random() * 0.5;
      addParticle({
        x: laneX(lane) + (Math.random() - 0.5) * ARROW_SIZE * 1.4,
        y: STRUM_Y + ARROW_SIZE * 0.5,
        vx: (Math.random() - 0.5) * 60,
        vy: -(140 + Math.random() * 180) * (1 + 0.2 * level),
        life,
        maxLife: life,
        size: 7 + Math.random() * 8 + level * 2,
        color: null,
      });
    }
  }
}

// A burst of sparks from a receptor on each hit.
function spawnSparks(lane) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 180;
    const life = 0.3 + Math.random() * 0.2;
    addParticle({
      x: laneX(lane),
      y: STRUM_Y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 4,
      color: LANE_COLORS[lane],
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function fireColor(t) {
  if (t > 0.66) return '#fff3a0';
  if (t > 0.33) return '#ff9f1c';
  return '#ff3b1f';
}

function drawParticles() {
  g2d.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const t = p.life / p.maxLife;
    g2d.globalAlpha = Math.min(1, t * 1.5);
    g2d.fillStyle = p.color || fireColor(t);
    g2d.beginPath();
    g2d.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, Math.PI * 2);
    g2d.fill();
  }
  g2d.globalAlpha = 1;
  g2d.globalCompositeOperation = 'source-over';
}

function fireLevel() {
  let level = 0;
  FIRE_TIERS.forEach((tier, i) => {
    if (combo >= tier.combo) level = i + 1;
  });
  return level;
}

// ---------- Rendering ----------

function accuracy() {
  const total = counts.sick + counts.good + counts.bad + counts.miss;
  if (total === 0) return 100;
  const weighted = Object.keys(counts).reduce((sum, k) => sum + counts[k] * JUDGE[k].weight, 0);
  return (weighted / total) * 100;
}

function rankFor(acc) {
  if (acc >= 95) return 'S';
  if (acc >= 85) return 'A';
  if (acc >= 70) return 'B';
  if (acc >= 50) return 'C';
  return 'D';
}

function draw() {
  const now = performance.now();
  const grad = g2d.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0b2e');
  grad.addColorStop(1, '#050510');
  g2d.fillStyle = grad;
  g2d.fillRect(0, 0, W, H);

  // Beat pulse on the lane background
  const sinceBeat = (songTime - LEAD_IN) % BEAT;
  const pulse = songTime >= LEAD_IN ? Math.max(0, 1 - sinceBeat / 0.15) : 0;
  g2d.fillStyle = `rgba(194, 77, 255, ${0.04 + pulse * 0.08})`;
  g2d.fillRect(LANE_LEFT, 0, 4 * LANE_W, H);

  // Lane guides
  for (let i = 0; i < 4; i++) {
    g2d.fillStyle = 'rgba(255, 255, 255, 0.03)';
    g2d.fillRect(LANE_LEFT + i * LANE_W, 0, LANE_W, H);
  }

  drawOnFireGlow();

  // Receptors on the strum line
  for (let lane = 0; lane < 4; lane++) {
    const lit = now - laneFlash[lane] < 100;
    drawArrow(lane, STRUM_Y, { textured: lit, glow: lit ? 28 : 0, outline: LANE_COLORS[lane] });
  }

  // Falling notes
  const level = fireLevel();
  for (const note of notes) {
    if (note.judged) continue;
    const y = STRUM_Y - (note.time - songTime) * SPEED;
    if (y < -ARROW_SIZE || y > H + ARROW_SIZE) continue;
    drawArrow(note.lane, y, { textured: true, glow: level > 0 ? 22 : 10, outline: 'rgba(255, 255, 255, 0.7)' });
  }

  drawParticles();
  drawHud(now);
}

// Warm glow along the bottom of the screen once the combo is hot.
function drawOnFireGlow() {
  const level = fireLevel();
  if (level < 2) return;
  const glowH = H * 0.35;
  const grad = g2d.createLinearGradient(0, H - glowH, 0, H);
  grad.addColorStop(0, 'rgba(255, 90, 20, 0)');
  grad.addColorStop(1, `rgba(255, 90, 20, ${level === 2 ? 0.18 : 0.3})`);
  g2d.fillStyle = grad;
  g2d.fillRect(0, H - glowH, W, glowH);
}

function laneX(lane) {
  return LANE_LEFT + lane * LANE_W + LANE_W / 2;
}

// Draws one arrow. Textured arrows get a metallic gradient, a shine line, and an optional glow.
function drawArrow(lane, y, { textured, glow, outline }) {
  g2d.save();
  g2d.translate(laneX(lane), y);
  g2d.rotate(ARROW_ANGLES[lane]);
  g2d.beginPath();
  ARROW_SHAPE.forEach(([x, py], i) => {
    if (i === 0) g2d.moveTo(x * ARROW_SIZE, py * ARROW_SIZE);
    else g2d.lineTo(x * ARROW_SIZE, py * ARROW_SIZE);
  });
  g2d.closePath();

  if (textured) {
    const grad = g2d.createLinearGradient(0, -ARROW_SIZE, 0, ARROW_SIZE);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, LANE_COLORS[lane]);
    grad.addColorStop(1, LANE_DARK[lane]);
    g2d.fillStyle = grad;
  } else {
    g2d.fillStyle = 'rgba(255, 255, 255, 0.08)';
  }
  g2d.shadowColor = LANE_COLORS[lane];
  g2d.shadowBlur = glow;
  g2d.fill();
  g2d.shadowBlur = 0;

  g2d.strokeStyle = outline;
  g2d.lineWidth = 3;
  g2d.stroke();

  if (textured) {
    g2d.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    g2d.lineWidth = 2;
    g2d.beginPath();
    g2d.moveTo(0, -ARROW_SIZE * 0.6);
    g2d.lineTo(0, ARROW_SIZE * 0.5);
    g2d.stroke();
  }
  g2d.restore();
}

// Match the canvas to the window so the play field fills it, sharp on high-DPI screens.
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  LANE_LEFT = (W - 4 * LANE_W) / 2;
  STRUM_Y = H * 0.83;
  SPEED = H * 0.75;
}

window.addEventListener('resize', resize);
resize();

function drawHud(now) {
  g2d.textAlign = 'left';
  g2d.textBaseline = 'alphabetic';
  g2d.fillStyle = '#f4f0ff';
  g2d.font = '700 22px system-ui, sans-serif';
  g2d.fillText(`Score ${score}`, 20, 36);
  g2d.font = '14px system-ui, sans-serif';
  g2d.fillStyle = '#a99cc9';
  g2d.fillText(current.title, 20, 58);

  g2d.textAlign = 'right';
  g2d.fillStyle = '#f4f0ff';
  g2d.font = '700 18px system-ui, sans-serif';
  g2d.fillText(`${accuracy().toFixed(1)}%`, W - 20, 36);

  // Combo, with a fire label that changes as the streak grows
  if (combo >= 2) {
    const level = fireLevel();
    const tier = level > 0 ? FIRE_TIERS[level - 1] : null;
    g2d.textAlign = 'center';
    g2d.fillStyle = tier ? tier.color : '#ffffff';
    g2d.font = '800 46px system-ui, sans-serif';
    g2d.fillText(String(combo), W / 2, 190);
    g2d.font = '600 14px system-ui, sans-serif';
    g2d.fillStyle = tier ? tier.color : '#a99cc9';
    g2d.fillText(tier ? tier.label : 'COMBO', W / 2, 212);
  }

  // Judgement popup
  if (popup) {
    const age = now - popup.time;
    if (age < 600) {
      g2d.globalAlpha = 1 - age / 600;
      g2d.textAlign = 'center';
      g2d.fillStyle = popup.color;
      g2d.font = '800 30px system-ui, sans-serif';
      g2d.fillText(popup.text, W / 2, STRUM_Y - 80);
      g2d.globalAlpha = 1;
    }
  }

  // Health bar
  const barW = 400;
  const barX = (W - barW) / 2;
  const barY = H - 36;
  g2d.fillStyle = 'rgba(255, 255, 255, 0.12)';
  g2d.fillRect(barX, barY, barW, 14);
  const grad = g2d.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#c24dff');
  grad.addColorStop(1, '#2fb8ff');
  g2d.fillStyle = grad;
  g2d.fillRect(barX, barY, barW * (health / 100), 14);
}

// ---------- Overlays ----------

function showOverlay(name) {
  for (const id of ['menu', 'results']) {
    document.getElementById(id).classList.toggle('hidden', id !== name);
  }
}

// Builds the song buttons. Clicking one starts that song.
function renderSongList() {
  const list = document.getElementById('song-list');
  list.innerHTML = '';
  SONGS.forEach((song, i) => {
    const button = document.createElement('button');
    button.className = 'song-btn' + (i === selected ? ' selected' : '');
    const title = document.createElement('span');
    title.textContent = song.title;
    const bpm = document.createElement('small');
    bpm.textContent = `${song.bpm} BPM`;
    button.append(title, bpm);
    button.addEventListener('click', () => {
      selected = i;
      startSong();
    });
    list.appendChild(button);
  });
}

function moveSelection(step) {
  selected = (selected + step + SONGS.length) % SONGS.length;
  renderSongList();
}

function showResults(failed) {
  const acc = accuracy();
  document.getElementById('result-title').textContent = failed ? 'Failed' : `${current.title} Complete`;
  document.getElementById('rank').textContent = failed ? 'F' : rankFor(acc);
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-acc').textContent = `${acc.toFixed(1)}%`;
  document.getElementById('final-combo').textContent = maxCombo;
  document.getElementById('n-sick').textContent = counts.sick;
  document.getElementById('n-good').textContent = counts.good;
  document.getElementById('n-bad').textContent = counts.bad;
  document.getElementById('n-miss').textContent = counts.miss;
  showOverlay('results');
}

// ---------- Input ----------

window.addEventListener('keydown', event => {
  if (event.repeat) return;

  if (state === 'playing') {
    if (event.code === 'Escape') {
      showMenu();
    } else if (event.code in KEY_TO_LANE) {
      event.preventDefault();
      onLanePressed(KEY_TO_LANE[event.code]);
    }
    return;
  }

  if (state === 'menu') {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
      moveSelection(event.code === 'ArrowUp' ? -1 : 1);
    } else if (event.code === 'Enter') {
      event.preventDefault();
      startSong();
    }
    return;
  }

  if (event.code === 'Enter') {
    event.preventDefault();
    startSong();
  } else if (event.code === 'Escape') {
    showMenu();
  }
});

document.getElementById('retry-btn').addEventListener('click', startSong);
document.getElementById('back-btn').addEventListener('click', showMenu);
renderSongList();
