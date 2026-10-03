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
// AMBIENT MUSIC LOOP
// ============================================================
let musicNodes: { stop: () => void } | null = null;
let musicEnabled = false;

export function startAmbientMusic() {
  if (musicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  musicEnabled = true;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(ctx.destination);

  const chords: number[][] = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [261.63, 329.63, 392],
    [196, 246.94, 293.66],
  ];

  let chordIndex = 0;
  const chordDuration = 6;

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 220;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    osc.connect(gain).connect(masterGain);
    osc.start();
    oscillators.push(osc);
    gains.push(gain);
  }

  const advanceChord = () => {
    if (!musicEnabled) return;
    const chord = chords[chordIndex];
    const now = ctx.currentTime;

    oscillators.forEach((osc, i) => {
      const target = chord[i % chord.length];
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(target, now + 1.5);
    });

    chordIndex = (chordIndex + 1) % chords.length;
  };

  advanceChord();
  const interval = setInterval(advanceChord, chordDuration * 1000);

  musicNodes = {
    stop: () => {
      musicEnabled = false;
      clearInterval(interval);
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      try {
        masterGain.disconnect();
      } catch {}
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