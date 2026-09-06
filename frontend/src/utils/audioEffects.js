/**
 * Professional Web Audio API sound synthesizer for DGPL Auction.
 * Produces elegant, minimalist acoustic cues (soft sine pips, smooth chimes).
 * Zero external audio files required, zero latency, offline capable.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Auto-unlock audio context on first user interaction
if (typeof window !== "undefined") {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

// Sound Mute State
let isMuted = false;
try {
  isMuted = localStorage.getItem("dgpl_auction_muted") === "true";
} catch {}

const listeners = new Set();

export function getIsMuted() {
  return isMuted;
}

export function setMuted(val) {
  isMuted = Boolean(val);
  try {
    localStorage.setItem("dgpl_auction_muted", String(isMuted));
  } catch {}
  listeners.forEach((fn) => fn(isMuted));
  return isMuted;
}

export function toggleMute() {
  return setMuted(!isMuted);
}

export function subscribeMute(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Play a subtle, clean countdown micro-pip for the final seconds
 * @param {boolean} isUrgent - True for the final 3 seconds
 */
export function playTick(isUrgent = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Pure sine wave micro-blip (smooth, non-intrusive)
  osc.type = "sine";
  const freq = isUrgent ? 1046.5 : 880; // C6 or A5
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(isUrgent ? 0.14 : 0.08, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (isUrgent ? 0.06 : 0.04));

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.07);
}

/**
 * Play an elegant, resonant 2-tone chime when timer expires or call is made
 */
export function playChime() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playNote = (freq, time, duration, volume) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  };

  // Luxury 2-tone notification chime (Eb5 -> Ab5)
  playNote(622.25, now, 0.45, 0.15);
  playNote(830.61, now + 0.12, 0.65, 0.18);
}

/**
 * Play subtle micro-click when a bid is placed
 */
export function playBidSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.035);

  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Play celebratory upward 3-tone chime on player sold
 */
export function playSoldCelebration() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playNote = (freq, time, duration, volume) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  };

  // Upward major triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
  playNote(523.25, now, 0.35, 0.12);
  playNote(659.25, now + 0.09, 0.35, 0.13);
  playNote(783.99, now + 0.18, 0.45, 0.15);
  playNote(1046.5, now + 0.28, 0.75, 0.2);
}

// Backward compatibility alias for any existing callers
export const playBuzzer = playChime;
export const playGavel = playBidSound;
export const playCallChime = (stage) => playChime();
