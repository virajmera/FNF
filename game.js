// Neon Rush: an original rhythm game inspired by Friday Night Funkin'.
// The song is synthesized with the Web Audio API, so the project ships no audio files.

const canvas = document.getElementById('game');
const g2d = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const KEY_TO_LANE = {
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowUp: 2,
  ArrowRight: 3,
};
const LANE_COLORS = ['#c24dff', '#2fb8ff', '#3ddc6b', '#ff4d6d'];
const LANE_LABELS = ['←', '↓', '↑', '→'];

// Song timing
const SONG = { title: 'Neon Rush', bpm: 120 };
const BEAT = 60 / SONG.bpm;   // 0.5 s
const BAR = BEAT * 4;         // 2 s
const STEP = BAR / 8;         // eighth note, 0.25 s
const LEAD_IN = 2;            // seconds before the first note
const BARS = 32;
const SONG_END = LEAD_IN + BARS * BAR + 1;

// Play field
const SPEED = 450;            // pixels per second
const STRUM_Y = 500;
const LANE_W = 110;
const LANE_LEFT = (W - 4 * LANE_W) / 2;
const NOTE_W = 84;
const NOTE_H = 34;

const HIT_WINDOWS = { sick: 0.045, good: 0.09, bad: 0.135 };
const JUDGE = {
  sick: { points: 350, health: 3, weight: 1, color: '#7ef7ff' },
  good: { points: 200, health: 2, weight: 0.7, color: '#9dff7e' },
  bad: { points: 100, health: 0.5, weight: 0.4, color: '#ffd166' },
  miss: { points: 0, health: -6, weight: 0, color: '#ff4d6d' },
};

// Chord progression: Am, F, C, G. Each entry has a bass note and pad voicing.
const CHORDS = [
  { bass: 110.0, pad: [220.0, 261.63, 329.63] },  // Am
  { bass: 87.31, pad: [174.61, 220.0, 261.63] },  // F
  { bass: 130.81, pad: [261.63, 329.63, 392.0] }, // C
  { bass: 98.0, pad: [196.0, 246.94, 293.66] },   // G
];

// Note patterns, one bar each: eighth-note slots, digit = lane, '.' = rest.
const PATTERNS = {
  A: '0.1.2.3.',
  B: '1.3.0.2.',
  C: '0.2.3.1.',
  D: '2.0.2.3.',
};
const SECTION = ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'];

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
const laneFlash = [0, 0, 0, 0];

// ---------- Chart ----------

function buildChart() {
  const chart = [];
  for (let bar = 0; bar < BARS; bar++) {
    const pattern = PATTERNS[SECTION[bar % SECTION.length]];
    for (let slot = 0; slot < 8; slot++) {
      const symbol = pattern[slot];
      if (symbol === '.') continue;
      chart.push({
        time: LEAD_IN + bar * BAR + slot * STEP,
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
    const chord = CHORDS[bar % CHORDS.length];
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
  state = 'playing';
  showOverlay(null);
  requestAnimationFrame(frame);
}

function showMenu() {
  state = 'menu';
  if (audio) audio.ctx.close();
  audio = null;
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
  songTime = audio.ctx.currentTime - audio.clockStart;

  for (const note of notes) {
    if (!note.judged && songTime - note.time > HIT_WINDOWS.bad) {
      note.judged = true;
      judge('miss');
    }
  }

  if (health <= 0) return endSong(true);
  if (songTime > SONG_END) return endSong(false);

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

  // Receptors on the strum line
  for (let lane = 0; lane < 4; lane++) {
    const x = laneX(lane) - NOTE_W / 2;
    const flashing = now - laneFlash[lane] < 100;
    g2d.fillStyle = flashing ? LANE_COLORS[lane] : 'rgba(255, 255, 255, 0.08)';
    g2d.strokeStyle = LANE_COLORS[lane];
    g2d.lineWidth = 3;
    g2d.beginPath();
    g2d.roundRect(x, STRUM_Y - NOTE_H / 2, NOTE_W, NOTE_H, 10);
    g2d.fill();
    g2d.stroke();
  }

  // Falling notes
  for (const note of notes) {
    if (note.judged) continue;
    const y = STRUM_Y - (note.time - songTime) * SPEED;
    if (y < -NOTE_H || y > H + NOTE_H) continue;
    const x = laneX(note.lane) - NOTE_W / 2;
    g2d.fillStyle = LANE_COLORS[note.lane];
    g2d.beginPath();
    g2d.roundRect(x, y - NOTE_H / 2, NOTE_W, NOTE_H, 10);
    g2d.fill();
    g2d.fillStyle = 'rgba(0, 0, 0, 0.45)';
    g2d.font = '700 16px system-ui, sans-serif';
    g2d.textAlign = 'center';
    g2d.textBaseline = 'middle';
    g2d.fillText(LANE_LABELS[note.lane], laneX(note.lane), y);
  }

  drawHud(now);
}

function laneX(lane) {
  return LANE_LEFT + lane * LANE_W + LANE_W / 2;
}

function drawHud(now) {
  g2d.textAlign = 'left';
  g2d.textBaseline = 'alphabetic';
  g2d.fillStyle = '#f4f0ff';
  g2d.font = '700 22px system-ui, sans-serif';
  g2d.fillText(`Score ${score}`, 20, 36);
  g2d.font = '14px system-ui, sans-serif';
  g2d.fillStyle = '#a99cc9';
  g2d.fillText(SONG.title, 20, 58);

  g2d.textAlign = 'right';
  g2d.fillStyle = '#f4f0ff';
  g2d.font = '700 18px system-ui, sans-serif';
  g2d.fillText(`${accuracy().toFixed(1)}%`, W - 20, 36);

  // Combo
  if (combo >= 2) {
    g2d.textAlign = 'center';
    g2d.fillStyle = '#ffffff';
    g2d.font = '800 46px system-ui, sans-serif';
    g2d.fillText(String(combo), W / 2, 190);
    g2d.font = '600 14px system-ui, sans-serif';
    g2d.fillStyle = '#a99cc9';
    g2d.fillText('COMBO', W / 2, 212);
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

function showResults(failed) {
  const acc = accuracy();
  document.getElementById('result-title').textContent = failed ? 'Failed' : 'Song Complete';
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

  if (event.code === 'Enter') {
    event.preventDefault();
    startSong();
  } else if (event.code === 'Escape' && state === 'results') {
    showMenu();
  }
});

document.getElementById('play-btn').addEventListener('click', startSong);
document.getElementById('retry-btn').addEventListener('click', startSong);
document.getElementById('back-btn').addEventListener('click', showMenu);
