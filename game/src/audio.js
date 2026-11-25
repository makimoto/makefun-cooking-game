// Tiny synthesized sound effects with WebAudio — no audio files ship with the
// game. Every sound is a few oscillators or a burst of filtered noise.

let audioContext = null;

function ensureAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playTone(freqFrom, freqTo, seconds, type = 'sine', gainPeak = 0.12) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), ctx.currentTime + seconds);
  gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + seconds);
}

function playNoiseBurst(seconds, filterFreq, gainPeak = 0.08) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource(); source.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export const sfx = {
  click() { playTone(660, 520, 0.06, 'triangle', 0.07); },
  ladle() { playNoiseBurst(0.25, 500, 0.1); },
  dropNoodles() { playNoiseBurst(0.35, 900, 0.12); playTone(300, 140, 0.2, 'sine', 0.06); },
  pullNoodles() { playTone(420, 840, 0.14, 'triangle', 0.09); },
  plate() { playTone(880, 990, 0.07, 'triangle', 0.08); },
  serveBell() { playTone(1318, 1318, 0.35, 'sine', 0.14); setTimeout(() => playTone(1760, 1760, 0.3, 'sine', 0.1), 70); },
  perfect() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, f, 0.16, 'triangle', 0.11), i * 80)); },
  walkout() { playTone(392, 196, 0.35, 'sawtooth', 0.06); },
  trash() { playNoiseBurst(0.2, 300, 0.1); },
};
