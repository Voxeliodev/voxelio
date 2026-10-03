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
// NEW: OBBY SOUND EFFECTS
// ============================================================

// Reaching a checkpoint — ascending 3-note chime
export function playCheckpoint() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // C5 → E5 → G5, quick upward sweep
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

  // Add a soft high ping for sparkle
  const ping = ctx.createOscillator();
  ping.type = "sine";
  ping.frequency.value = 1567.98; // G6
  const pingGain = ctx.createGain();
  pingGain.gain.setValueAtTime(0, now + 0.27);
  pingGain.gain.linearRampToValueAtTime(0.12, now + 0.29);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  ping.connect(pingGain).connect(ctx.destination);
  ping.start(now + 0.27);
  ping.stop(now + 1.0);
}

// Falling / respawning — quick descending wobble
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

// Jump — short upward blip
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

// Finishing the obby — victory fanfare (4 ascending notes + high chord)
export function playVictory() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // C5 → E5 → G5 → C6 arpeggio
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

  // Final triumphant chord (C-E-G) sustained
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
// OBBY BACKGROUND MUSIC — bouncy, upbeat, Roblox-inspired
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

  // ---- Simple square-wave melody (C major, cheerful) ----
  // Notes: C5 D5 E5 G5 A5 G5 E5 D5 (a 8-note loop)
  const NOTE_FREQ: Record<string, number> = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  };

  // Melody as [noteName, duration in beats]
  const MELODY: Array<[string, number]> = [
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["E5", 0.5],
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["A5", 0.5],
    ["G5", 0.5], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5],
    ["D5", 0.5], ["E5", 0.5], ["C5", 1.0],
  ];

  // Bass: simple I-V-vi-IV progression (C - G - Am - F)
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

  // ---- Scheduler helper ----
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

  // ---- Main loop ----
  let cancelled = false;
  let melodyIndex = 0;
  let bassIndex = 0;
  let nextNoteTime = ctx.currentTime + 0.1;
  let melodyRemaining = MELODY[0][1];
  let bassRemaining = BASS[0][1];

  const tick = () => {
    if (cancelled || !obbyMusicEnabled) return;
    const now = ctx.currentTime;

    // Schedule notes a bit ahead
    while (nextNoteTime < now + 0.4) {
      // Melody
      if (melodyRemaining <= 0.0001) {
        melodyIndex = (melodyIndex + 1) % MELODY.length;
        melodyRemaining = MELODY[melodyIndex][1];
      }
      const [mNote] = MELODY[melodyIndex];
      const mFreq = NOTE_FREQ[mNote];
      const mDur = Math.min(melodyRemaining, BEAT) * BEAT;
      scheduleNote(mFreq, nextNoteTime, mDur, "square", 0.08);
      melodyRemaining -= mDur / BEAT;

      // Bass
      if (bassRemaining <= 0.0001) {
        bassIndex = (bassIndex + 1) % BASS.length;
        bassRemaining = BASS[bassIndex][1];
      }
      const [bNote] = BASS[bassIndex];
      const bFreq = NOTE_FREQ[bNote] / 2; // an octave down
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