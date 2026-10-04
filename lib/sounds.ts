// ============================================================
// VOXELIO SOUNDS — procedural audio engine (no files needed)
// ============================================================

let audioContext: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// ============================================================
// SOUND EFFECTS
// ============================================================

export function playChop() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 800;
  noiseFilter.Q.value = 1.2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.1);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.25, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function playTreeFall() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.9);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + 0.9);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.1);
}

export function playCoin() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.45);
  });
}

export function playPickup() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function playError() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.setValueAtTime(150, now + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

// ============================================================
// OBBY SOUND EFFECTS
// ============================================================

export function playCheckpoint() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.5);
  });

  const ping = ctx.createOscillator();
  ping.type = "sine";
  ping.frequency.value = 1567.98;
  const pingGain = ctx.createGain();
  pingGain.gain.setValueAtTime(0, now + 0.27);
  pingGain.gain.linearRampToValueAtTime(0.12, now + 0.29);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  ping.connect(pingGain).connect(ctx.destination);
  ping.start(now + 0.27);
  ping.stop(now + 1.0);
}

export function playFall() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

export function playJump() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function playVictory() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });

  const chordStart = now + 0.55;
  [523.25, 659.25, 783.99].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, chordStart);
    gain.gain.linearRampToValueAtTime(0.15, chordStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.8);

    osc.connect(gain).connect(ctx.destination);
    osc.start(chordStart);
    osc.stop(chordStart + 2.0);
  });
}

// ============================================================
// CHAOS COLISEUM — combat sounds
// ============================================================

export function playSwordSwing() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.sin(t * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
  filter.Q.value = 3.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.22);

  const ring = ctx.createOscillator();
  ring.type = "triangle";
  ring.frequency.setValueAtTime(2600, now);
  ring.frequency.exponentialRampToValueAtTime(1800, now + 0.15);

  const ringGain = ctx.createGain();
  ringGain.gain.setValueAtTime(0.06, now);
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  ring.connect(ringGain).connect(ctx.destination);
  ring.start(now);
  ring.stop(now + 0.22);
}

export function playSwordHit() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const clangFreqs = [880, 1180, 1560, 2100];
  clangFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = (i - 1.5) * 15;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  });

  const thud = ctx.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(160, now);
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.18);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.3, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  thud.connect(thudGain).connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.24);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 800;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.07);
}

export function playPlayerHurt() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playPlayerDeath() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [440, 330, 220, 165];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

export function playKillConfirm() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.07;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });
}

export function playStreakSound(streak: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const clampedStreak = Math.min(streak, 4);
  const baseFreq = 660 * Math.pow(1.18, clampedStreak);

  [baseFreq, baseFreq * 1.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });
}

export function playCountdownBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 660;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.setValueAtTime(0.18, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playGoBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 1320;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
  gain.gain.setValueAtTime(0.25, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

export function playRoundWin() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

export function playRoundLose() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [392, 311.13];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.25;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.95);
  });
}

// ============================================================
// RELAXING AMBIENT MUSIC (Lumberyard)
// ============================================================

let musicNodes: { stop: () => void } | null = null;
let musicEnabled = false;

export function startAmbientMusic() {
  if (musicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  musicEnabled = true;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  const reverbLength = Math.floor(ctx.sampleRate * 3.5);
  const reverbBuffer = ctx.createBuffer(2, reverbLength, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = reverbBuffer.getChannelData(channel);
    for (let i = 0; i < reverbLength; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 2.5);
    }
  }
  reverb.buffer = reverbBuffer;

  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.5;
  reverbGain.connect(reverb);
  reverb.connect(masterGain);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.35;
  dryGain.connect(masterGain);

  const chords: number[][] = [
    [174.61, 220.0, 261.63, 329.63],
    [130.81, 164.81, 196.0, 246.94],
    [110.0, 164.81, 220.0, 261.63],
    [98.0, 146.83, 196.0, 246.94],
  ];

  const NUM_VOICES = 4;
  const CHORD_DURATION = 10;

  const oscillators: OscillatorNode[] = [];

  for (let i = 0; i < NUM_VOICES; i++) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = chords[0][i];
    osc.detune.value = (i - NUM_VOICES / 2) * 4;

    const gain = ctx.createGain();
    gain.gain.value = 0.25 / NUM_VOICES;

    osc.connect(gain);
    gain.connect(reverbGain);
    gain.connect(dryGain);

    osc.start(ctx.currentTime);
    oscillators.push(osc);
  }

  const bassOsc = ctx.createOscillator();
  bassOsc.type = "sine";
  bassOsc.frequency.value = 65.41;

  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.35;
  bassOsc.connect(bassGain);
  bassGain.connect(reverbGain);
  bassGain.connect(dryGain);
  bassOsc.start(ctx.currentTime);

  let chordIndex = 0;

  const advanceChord = () => {
    if (!musicEnabled) return;
    const chord = chords[chordIndex];
    const now = ctx.currentTime;

    oscillators.forEach((osc, i) => {
      const target = chord[i % chord.length];
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(target, now + 3.5);
    });

    chordIndex = (chordIndex + 1) % chords.length;
  };

  const interval = setInterval(advanceChord, CHORD_DURATION * 1000);

  musicNodes = {
    stop: () => {
      musicEnabled = false;
      clearInterval(interval);
      oscillators.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      try { bassOsc.stop(); } catch {}
      try { masterGain.disconnect(); } catch {}
    },
  };
}

export function stopAmbientMusic() {
  if (musicNodes) {
    musicNodes.stop();
    musicNodes = null;
  }
  musicEnabled = false;
}

export function isMusicPlaying() {
  return musicEnabled;
}

// ============================================================
// OBBY BACKGROUND MUSIC — bouncy, upbeat
// ============================================================

let obbyMusicNodes: { stop: () => void } | null = null;
let obbyMusicEnabled = false;

export function startObbyMusic() {
  if (obbyMusicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  obbyMusicEnabled = true;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.06;
  masterGain.connect(ctx.destination);

  const NOTE_FREQ: Record<string, number> = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  };

  const MELODY: Array<[string, number]> = [
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["E5", 0.5],
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["A5", 0.5],
    ["G5", 0.5], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5],
    ["D5", 0.5], ["E5", 0.5], ["C5", 1.0],
  ];

  const BASS: Array<[string, number]> = [
    ["C4", 2.0], ["C4", 1.0], ["C4", 1.0],
    ["G4", 2.0], ["G4", 1.0], ["G4", 1.0],
    ["A4", 2.0], ["A4", 1.0], ["A4", 1.0],
    ["F4", 2.0], ["F4", 1.0], ["F4", 1.0],
  ];

  const BPM = 140;
  const BEAT = 60 / BPM;

  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  const scheduleNote = (
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
    gain.gain.setValueAtTime(gainValue, startTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain).connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    oscs.push(osc);
    gains.push(gain);
  };

  let cancelled = false;
  let melodyIndex = 0;
  let bassIndex = 0;
  let nextNoteTime = ctx.currentTime + 0.1;
  let melodyRemaining = MELODY[0][1];
  let bassRemaining = BASS[0][1];

  const tick = () => {
    if (cancelled || !obbyMusicEnabled) return;
    const now = ctx.currentTime;

    while (nextNoteTime < now + 0.4) {
      if (melodyRemaining <= 0.0001) {
        melodyIndex = (melodyIndex + 1) % MELODY.length;
        melodyRemaining = MELODY[melodyIndex][1];
      }
      const [mNote] = MELODY[melodyIndex];
      const mFreq = NOTE_FREQ[mNote];
      const mDur = Math.min(melodyRemaining, BEAT) * BEAT;
      scheduleNote(mFreq, nextNoteTime, mDur, "square", 0.08);
      melodyRemaining -= mDur / BEAT;

      if (bassRemaining <= 0.0001) {
        bassIndex = (bassIndex + 1) % BASS.length;
        bassRemaining = BASS[bassIndex][1];
      }
      const [bNote] = BASS[bassIndex];
      const bFreq = NOTE_FREQ[bNote] / 2;
      const bDur = Math.min(bassRemaining, BEAT) * BEAT;
      scheduleNote(bFreq, nextNoteTime, bDur, "triangle", 0.12);
      bassRemaining -= bDur / BEAT;

      nextNoteTime += BEAT;
    }

    setTimeout(tick, 100);
  };

  tick();

  obbyMusicNodes = {
    stop: () => {
      cancelled = true;
      obbyMusicEnabled = false;
      oscs.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      gains.forEach((g) => {
        try { g.disconnect(); } catch {}
      });
      try { masterGain.disconnect(); } catch {}
    },
  };
}

export function stopObbyMusic() {
  if (obbyMusicNodes) {
    obbyMusicNodes.stop();
    obbyMusicNodes = null;
  }
  obbyMusicEnabled = false;
}

// ============================================================
// CHAOS COLISEUM — tense battle music (dark, driving)
// ============================================================

let coliseumMusicNodes: { stop: () => void } | null = null;
let coliseumMusicEnabled = false;

export function startColiseumMusic() {
  if (coliseumMusicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  coliseumMusicEnabled = true;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.05;
  masterGain.connect(ctx.destination);

  const NOTE_FREQ: Record<string, number> = {
    A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  };

  const BASS_LINE: Array<[string, number]> = [
    ["A2", 0.5], ["A2", 0.5], ["A2", 0.5], ["A2", 0.5],
    ["A2", 0.5], ["A2", 0.5], ["E3", 0.5], ["E3", 0.5],
    ["F3", 0.5], ["F3", 0.5], ["F3", 0.5], ["F3", 0.5],
    ["C4", 0.5], ["C4", 0.5], ["G3", 0.5], ["G3", 0.5],
  ];

  const MELODY: Array<[string, number]> = [
    ["A4", 1.0], ["C5", 0.5], ["E5", 0.5], ["D5", 1.0], ["C5", 1.0],
    ["A4", 1.0], ["C5", 0.5], ["E5", 0.5], ["G5", 1.0], ["E5", 1.0],
    ["F5", 1.0], ["E5", 0.5], ["D5", 0.5], ["C5", 1.0], ["A4", 1.0],
    ["C5", 1.0], ["D5", 0.5], ["E5", 0.5], ["A4", 2.0],
  ];

  const BPM = 120;
  const BEAT = 60 / BPM;

  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  const scheduleNote = (
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
    gain.gain.setValueAtTime(gainValue, startTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain).connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    oscs.push(osc);
    gains.push(gain);
  };

  let cancelled = false;
  let melodyIndex = 0;
  let bassIndex = 0;
  let nextNoteTime = ctx.currentTime + 0.1;
  let melodyRemaining = MELODY[0][1];
  let bassRemaining = BASS_LINE[0][1];

  const tick = () => {
    if (cancelled || !coliseumMusicEnabled) return;
    const now = ctx.currentTime;

    while (nextNoteTime < now + 0.4) {
      if (melodyRemaining <= 0.0001) {
        melodyIndex = (melodyIndex + 1) % MELODY.length;
        melodyRemaining = MELODY[melodyIndex][1];
      }
      const [mNote] = MELODY[melodyIndex];
      const mFreq = NOTE_FREQ[mNote];
      const mDur = Math.min(melodyRemaining, BEAT) * BEAT;
      scheduleNote(mFreq, nextNoteTime, mDur, "square", 0.06);
      melodyRemaining -= mDur / BEAT;

      if (bassRemaining <= 0.0001) {
        bassIndex = (bassIndex + 1) % BASS_LINE.length;
        bassRemaining = BASS_LINE[bassIndex][1];
      }
      const [bNote] = BASS_LINE[bassIndex];
      const bFreq = NOTE_FREQ[bNote];
      const bDur = Math.min(bassRemaining, BEAT) * BEAT;
      scheduleNote(bFreq, nextNoteTime, bDur, "triangle", 0.14);
      bassRemaining -= bDur / BEAT;

      nextNoteTime += BEAT;
    }

    setTimeout(tick, 100);
  };

  tick();

  coliseumMusicNodes = {
    stop: () => {
      cancelled = true;
      coliseumMusicEnabled = false;
      oscs.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      gains.forEach((g) => {
        try { g.disconnect(); } catch {}
      });
      try { masterGain.disconnect(); } catch {}
    },
  };
}

export function stopColiseumMusic() {
  if (coliseumMusicNodes) {
    coliseumMusicNodes.stop();
    coliseumMusicNodes = null;
  }
  coliseumMusicEnabled = false;
}

// ============================================================
// PIZZA EMPIRE TYCOON — sounds
// ============================================================

// Cash register — cha-ching! Two-tone bell + coin clink
export function playCashRegister() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const bell1 = ctx.createOscillator();
  bell1.type = "sine";
  bell1.frequency.setValueAtTime(1200, now);
  bell1.frequency.exponentialRampToValueAtTime(900, now + 0.15);

  const bell1Gain = ctx.createGain();
  bell1Gain.gain.setValueAtTime(0, now);
  bell1Gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
  bell1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  bell1.connect(bell1Gain).connect(ctx.destination);
  bell1.start(now);
  bell1.stop(now + 0.4);

  const bell2 = ctx.createOscillator();
  bell2.type = "sine";
  bell2.frequency.setValueAtTime(1600, now + 0.08);
  bell2.frequency.exponentialRampToValueAtTime(1200, now + 0.23);

  const bell2Gain = ctx.createGain();
  bell2Gain.gain.setValueAtTime(0, now + 0.08);
  bell2Gain.gain.linearRampToValueAtTime(0.22, now + 0.09);
  bell2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  bell2.connect(bell2Gain).connect(ctx.destination);
  bell2.start(now + 0.08);
  bell2.stop(now + 0.5);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 5);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 4000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.06);
}

// Oven ding — soft "ding" when an oven completes a batch
export function playOvenDing() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}

// Purchase — satisfying "chunk" + ascending two-note ding
export function playPurchase() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const thump = ctx.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(180, now);
  thump.frequency.exponentialRampToValueAtTime(90, now + 0.12);

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.25, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.2);

  [660, 990].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + 0.1 + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

// Upgrade — bigger fanfare than a plain purchase
export function playUpgradeFanfare() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });

  const ping = ctx.createOscillator();
  ping.type = "sine";
  ping.frequency.value = 2093;

  const pingGain = ctx.createGain();
  const pingStart = now + 0.38;
  pingGain.gain.setValueAtTime(0, pingStart);
  pingGain.gain.linearRampToValueAtTime(0.08, pingStart + 0.01);
  pingGain.gain.exponentialRampToValueAtTime(0.001, pingStart + 0.6);

  ping.connect(pingGain).connect(ctx.destination);
  ping.start(pingStart);
  ping.stop(pingStart + 0.65);
}

// ============================================================
// PIZZA EMPIRE — background music (bouncy Italian pizzeria loop)
// ============================================================
let pizzeriaMusicNodes: { stop: () => void } | null = null;
let pizzeriaMusicEnabled = false;

export function startPizzeriaMusic() {
  if (pizzeriaMusicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  pizzeriaMusicEnabled = true;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.05;
  masterGain.connect(ctx.destination);

  const NOTE_FREQ: Record<string, number> = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  };

  const MELODY: Array<[string, number]> = [
    ["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["D5", 0.5],
    ["E5", 0.5], ["E5", 0.5], ["E5", 1.0],
    ["D5", 0.5], ["D5", 0.5], ["D5", 1.0],
    ["E5", 0.5], ["G5", 0.5], ["G5", 1.0],
    ["E5", 0.5], ["D5", 0.5], ["C5", 0.5], ["D5", 0.5],
    ["E5", 0.5], ["E5", 0.5], ["E5", 0.5], ["E5", 0.5],
    ["D5", 0.5], ["D5", 0.5], ["E5", 0.5], ["D5", 0.5],
    ["C5", 1.0], ["C5", 1.0],
  ];

  const BASS: Array<[string, number]> = [
    ["C4", 1.0], ["G4", 1.0], ["C4", 1.0], ["G4", 1.0],
    ["A4", 1.0], ["E4", 1.0], ["A4", 1.0], ["E4", 1.0],
    ["F4", 1.0], ["C4", 1.0], ["F4", 1.0], ["C4", 1.0],
    ["G4", 1.0], ["D4", 1.0], ["G4", 1.0], ["D4", 1.0],
  ];

  const BPM = 130;
  const BEAT = 60 / BPM;

  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  const scheduleNote = (
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
    gain.gain.setValueAtTime(gainValue, startTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain).connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    oscs.push(osc);
    gains.push(gain);
  };

  let cancelled = false;
  let melodyIndex = 0;
  let bassIndex = 0;
  let nextNoteTime = ctx.currentTime + 0.1;
  let melodyRemaining = MELODY[0][1];
  let bassRemaining = BASS[0][1];

  const tick = () => {
    if (cancelled || !pizzeriaMusicEnabled) return;
    const now = ctx.currentTime;

    while (nextNoteTime < now + 0.4) {
      if (melodyRemaining <= 0.0001) {
        melodyIndex = (melodyIndex + 1) % MELODY.length;
        melodyRemaining = MELODY[melodyIndex][1];
      }
      const [mNote] = MELODY[melodyIndex];
      const mFreq = NOTE_FREQ[mNote];
      const mDur = Math.min(melodyRemaining, 0.5) * BEAT;
      scheduleNote(mFreq, nextNoteTime, mDur, "triangle", 0.1);
      melodyRemaining -= mDur / BEAT;

      if (bassRemaining <= 0.0001) {
        bassIndex = (bassIndex + 1) % BASS.length;
        bassRemaining = BASS[bassIndex][1];
      }
      const [bNote] = BASS[bassIndex];
      const bFreq = NOTE_FREQ[bNote] / 2;
      const bDur = Math.min(bassRemaining, BEAT) * BEAT;
      scheduleNote(bFreq, nextNoteTime, bDur, "sine", 0.14);
      bassRemaining -= bDur / BEAT;

      nextNoteTime += BEAT;
    }

    setTimeout(tick, 100);
  };

  tick();

  pizzeriaMusicNodes = {
    stop: () => {
      cancelled = true;
      pizzeriaMusicEnabled = false;
      oscs.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      gains.forEach((g) => {
        try { g.disconnect(); } catch {}
      });
      try { masterGain.disconnect(); } catch {}
    },
  };
}

export function stopPizzeriaMusic() {
  if (pizzeriaMusicNodes) {
    pizzeriaMusicNodes.stop();
    pizzeriaMusicNodes = null;
  }
  pizzeriaMusicEnabled = false;
}