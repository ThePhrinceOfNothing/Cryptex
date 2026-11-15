// Pure Web Audio procedural ambient background noise synthesizer - 100% offline

export type AmbienceTrack = 'none' | 'rain' | 'campfire' | 'clock' | 'whitenoise';

let audioCtx: AudioContext | null = null;
let currentTrack: AmbienceTrack = 'none';
let currentNodes: { stop: () => void } | null = null;
let masterGain: GainNode | null = null;
let volume = 0.35;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setAmbienceVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
  }
}

export function getCurrentAmbience(): AmbienceTrack {
  return currentTrack;
}

export function stopAmbience() {
  if (currentNodes) {
    currentNodes.stop();
    currentNodes = null;
  }
  currentTrack = 'none';
}

export function playAmbience(track: AmbienceTrack) {
  stopAmbience();
  if (track === 'none') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  if (track === 'rain') {
    currentNodes = createRain(ctx, masterGain);
  } else if (track === 'campfire') {
    currentNodes = createCampfire(ctx, masterGain);
  } else if (track === 'clock') {
    currentNodes = createClock(ctx, masterGain);
  } else if (track === 'whitenoise') {
    currentNodes = createWhiteNoise(ctx, masterGain);
  }

  currentTrack = track;
}

// ----------------------------------------------------------------------
// Buffer Utility Helpers
// ----------------------------------------------------------------------
function createWhiteNoiseBuffer(ctx: AudioContext, seconds: number = 3): AudioBuffer {
  const bufferSize = seconds * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx: AudioContext, seconds: number = 3): AudioBuffer {
  const bufferSize = seconds * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createBrownNoiseBuffer(ctx: AudioContext, seconds: number = 3): AudioBuffer {
  const bufferSize = seconds * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 2.4;
  }
  return buffer;
}

// ----------------------------------------------------------------------
// 1. Procedural Heavy Rain (Multi-Layer Downpour + Water Impacts)
// ----------------------------------------------------------------------
function createRain(ctx: AudioContext, dest: GainNode) {
  let isRunning = true;
  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(1.0, ctx.currentTime);
  rainGain.connect(dest);

  // Layer A: Low rumble of a heavy downpour
  const pinkBuffer = createPinkNoiseBuffer(ctx, 3);
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = pinkBuffer;
  rumbleSource.loop = true;

  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.setValueAtTime(280, ctx.currentTime);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.42, ctx.currentTime);

  rumbleSource.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(rainGain);
  rumbleSource.start();

  // Layer B: Pattering rain wash (sheeting against glass and foliage)
  const washSource = ctx.createBufferSource();
  washSource.buffer = pinkBuffer;
  washSource.loop = true;

  const washFilter = ctx.createBiquadFilter();
  washFilter.type = 'bandpass';
  washFilter.frequency.setValueAtTime(1600, ctx.currentTime);
  washFilter.Q.setValueAtTime(0.85, ctx.currentTime);

  const washGain = ctx.createGain();
  washGain.gain.setValueAtTime(0.26, ctx.currentTime);

  washSource.connect(washFilter);
  washFilter.connect(washGain);
  washGain.connect(rainGain);
  washSource.start();

  // Layer C: High air spray / mist
  const spraySource = ctx.createBufferSource();
  spraySource.buffer = createWhiteNoiseBuffer(ctx, 3);
  spraySource.loop = true;

  const sprayFilter = ctx.createBiquadFilter();
  sprayFilter.type = 'highpass';
  sprayFilter.frequency.setValueAtTime(4200, ctx.currentTime);

  const sprayGain = ctx.createGain();
  sprayGain.gain.setValueAtTime(0.045, ctx.currentTime);

  spraySource.connect(sprayFilter);
  sprayFilter.connect(sprayGain);
  sprayGain.connect(rainGain);
  spraySource.start();

  // Layer D: Random individual raindrop impacts
  const triggerDroplet = () => {
    if (!isRunning) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      const startFreq = 1600 + Math.random() * 800;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.45, now + 0.035);

      const dropVol = 0.02 + Math.random() * 0.035;
      dropGain.gain.setValueAtTime(dropVol, now);
      dropGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.035);

      osc.connect(dropGain);
      dropGain.connect(rainGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}

    const nextDrop = 70 + Math.random() * 220;
    setTimeout(triggerDroplet, nextDrop);
  };
  triggerDroplet();

  return {
    stop: () => {
      isRunning = false;
      try { rumbleSource.stop(); } catch {}
      try { washSource.stop(); } catch {}
      try { spraySource.stop(); } catch {}
      try { rainGain.disconnect(); } catch {}
    }
  };
}

// ----------------------------------------------------------------------
// 2. Procedural Campfire (Warm Combustion Hearth + Organic Wood Pops)
// ----------------------------------------------------------------------
function createCampfire(ctx: AudioContext, dest: GainNode) {
  let isRunning = true;
  const fireGain = ctx.createGain();
  fireGain.gain.setValueAtTime(1.0, ctx.currentTime);
  fireGain.connect(dest);

  // Layer A: Warm, deep flame combustion draft (100-140Hz lowpass)
  const brownBuffer = createBrownNoiseBuffer(ctx, 3);
  const roarSource = ctx.createBufferSource();
  roarSource.buffer = brownBuffer;
  roarSource.loop = true;

  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = 'lowpass';
  roarFilter.frequency.setValueAtTime(130, ctx.currentTime);

  const roarGain = ctx.createGain();
  roarGain.gain.setValueAtTime(0.24, ctx.currentTime);

  // Subtle LFO to mimic breathing, flickering flame draft
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(1.3, ctx.currentTime); // 1.3 Hz gentle flicker

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0.07, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(roarGain.gain);
  lfo.start();

  roarSource.connect(roarFilter);
  roarFilter.connect(roarGain);
  roarGain.connect(fireGain);
  roarSource.start();

  // Layer B: Warm ember sizzle (very soft continuous under-layer)
  const sizzleSource = ctx.createBufferSource();
  sizzleSource.buffer = brownBuffer;
  sizzleSource.loop = true;

  const sizzleFilter = ctx.createBiquadFilter();
  sizzleFilter.type = 'bandpass';
  sizzleFilter.frequency.setValueAtTime(2800, ctx.currentTime);
  sizzleFilter.Q.setValueAtTime(2.5, ctx.currentTime);

  const sizzleGain = ctx.createGain();
  sizzleGain.gain.setValueAtTime(0.016, ctx.currentTime);

  sizzleSource.connect(sizzleFilter);
  sizzleFilter.connect(sizzleGain);
  sizzleGain.connect(fireGain);
  sizzleSource.start();

  // Layer C: Organic Wood Pops & Resonant Crackles
  const popNoiseBuffer = createWhiteNoiseBuffer(ctx, 0.1);

  const triggerPop = (isLoud: boolean = false) => {
    if (!isRunning) return;
    try {
      const now = ctx.currentTime;
      const popSource = ctx.createBufferSource();
      popSource.buffer = popNoiseBuffer;

      const popFilter = ctx.createBiquadFilter();
      popFilter.type = 'bandpass';

      const popGain = ctx.createGain();

      if (isLoud) {
        // Heavy resonant wood snap / sap pocket explosion
        const centerFreq = 1100 + Math.random() * 700;
        popFilter.frequency.setValueAtTime(centerFreq, now);
        popFilter.Q.setValueAtTime(3.8, now);

        const popVol = 0.35 + Math.random() * 0.28;
        popGain.gain.setValueAtTime(popVol, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        popSource.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(fireGain);
        popSource.start(now);
        popSource.stop(now + 0.05);
      } else {
        // High crisp micro-crackle
        const centerFreq = 2400 + Math.random() * 2200;
        popFilter.frequency.setValueAtTime(centerFreq, now);
        popFilter.Q.setValueAtTime(2.2, now);

        const crackleVol = 0.09 + Math.random() * 0.14;
        popGain.gain.setValueAtTime(crackleVol, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
        popSource.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(fireGain);
        popSource.start(now);
        popSource.stop(now + 0.025);
      }
    } catch {}
  };

  const scheduleNextCrackleCluster = () => {
    if (!isRunning) return;

    // Trigger primary crackle or loud wood snap
    const isLoud = Math.random() < 0.28;
    triggerPop(isLoud);

    // Natural bursting: 40% chance of 1-2 rapid follow-up micro crackles in quick succession
    if (Math.random() < 0.45) {
      setTimeout(() => triggerPop(false), 35 + Math.random() * 55);
      if (Math.random() < 0.3) {
        setTimeout(() => triggerPop(false), 90 + Math.random() * 65);
      }
    }

    const nextClusterDelay = isLoud
      ? 280 + Math.random() * 700
      : 80 + Math.random() * 320;

    setTimeout(scheduleNextCrackleCluster, nextClusterDelay);
  };

  scheduleNextCrackleCluster();

  return {
    stop: () => {
      isRunning = false;
      try { roarSource.stop(); } catch {}
      try { lfo.stop(); } catch {}
      try { sizzleSource.stop(); } catch {}
      try { fireGain.disconnect(); } catch {}
    }
  };
}

// ----------------------------------------------------------------------
// 3. Gentle Mechanical Clock Tick (60 BPM)
// ----------------------------------------------------------------------
function createClock(ctx: AudioContext, dest: GainNode) {
  let isRunning = true;
  let isTick = true;

  const tickInterval = setInterval(() => {
    if (!isRunning) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isTick ? 1200 : 900, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.05);

      isTick = !isTick;
    } catch {}
  }, 1000);

  return {
    stop: () => {
      isRunning = false;
      clearInterval(tickInterval);
    }
  };
}

// ----------------------------------------------------------------------
// 4. Smooth Soothing Pink Noise
// ----------------------------------------------------------------------
function createWhiteNoise(ctx: AudioContext, dest: GainNode) {
  const noiseBuffer = createPinkNoiseBuffer(ctx, 3);
  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.38, ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  whiteNoise.start();

  return {
    stop: () => {
      try { whiteNoise.stop(); } catch {}
    }
  };
}
