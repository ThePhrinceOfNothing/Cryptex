// Pure Web Audio API procedural sound engine - Zero external audio files

let audioCtx: AudioContext | null = null;
let isEnabled = true;
let masterVolume = 0.4;

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

export const configureSound = (enabled: boolean, volume = 0.4) => {
  isEnabled = enabled;
  masterVolume = Math.max(0, Math.min(1, volume));
};

// 1. Mechanical Typewriter / Keyboard Key Click
export const playKeyClick = () => {
  if (!isEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Subtle pitch jitter for realistic physical feel
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

  gain.gain.setValueAtTime(0.25 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
};

// 2. Heavy Bank Vault Deadbolt "Clack"
export const playVaultLock = () => {
  if (!isEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low mechanical thump
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(140, now);
  subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
  subGain.gain.setValueAtTime(0.6 * masterVolume, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.25);

  // Metallic latch click (delayed slightly)
  setTimeout(() => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latchOsc.type = 'square';
    latchOsc.frequency.setValueAtTime(950, t);
    latchOsc.frequency.exponentialRampToValueAtTime(200, t + 0.08);

    latchGain.gain.setValueAtTime(0.3 * masterVolume, t);
    latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    latchOsc.connect(latchGain);
    latchGain.connect(ctx.destination);
    latchOsc.start(t);
    latchOsc.stop(t + 0.09);
  }, 40);
};

// 3. Subtle Coin Clink for Ledger Transactions
export const playCoinClink = () => {
  if (!isEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const f1 = 2400 + Math.random() * 80;
  const f2 = 3200 + Math.random() * 100;

  [f1, f2].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  });
};

// 4. Cryptographic Paper Shredder Wipe Sound
export const playShredderSound = () => {
  if (!isEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate crackly noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, ctx.currentTime);
  filter.Q.setValueAtTime(3, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
};

// 5. Level Up / Achievement Fanfare
export const playLevelUp = () => {
  if (!isEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25 * masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.32);
    }, idx * 75);
  });
};
