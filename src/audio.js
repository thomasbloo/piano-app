import { frequency } from './notes.js';

/** @type {AudioContext | null} */
let ctx = null;
/** @type {Map<number, { osc: OscillatorNode, gain: GainNode }>} */
const voices = new Map();

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/**
 * Simple piano-like tone: a triangle wave with a fast attack and a slow decay.
 * @param {number} midi
 * @param {number} [velocity]
 */
export function startNote(midi, velocity = 100) {
  stopNote(midi);
  const ac = audio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency(midi);
  const peak = 0.25 * (velocity / 127);
  const t = ac.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(peak * 0.3, t + 1.2);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  voices.set(midi, { osc, gain });
}

/** @param {number} midi */
export function stopNote(midi) {
  const voice = voices.get(midi);
  if (!voice || !ctx) return;
  const t = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(t);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
  voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  voice.osc.stop(t + 0.35);
  voices.delete(midi);
}
