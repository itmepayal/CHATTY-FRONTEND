/**
 * Centralized Sound Management Service for Chatty
 * 
 * Manages all audio assets, ringtones, and notification sounds:
 * - calling.mp3: Outgoing audio/video call ringtone (looping)
 * - receiving.mp3: Incoming audio/video call ringtone (looping)
 * - message.mp3: Incoming chat message chime (1:1 and group chats)
 * - ding.wav: Outgoing message confirmation sound (1:1 and group chats)
 * 
 * Features:
 * - HTML5 Audio with Web Audio API fallbacks
 * - Autoplay restriction handling & user gesture unlock
 * - Deduplication for outgoing sent messages and incoming message chimes
 * - Independent call ringtone vs. message sound management
 * - Dynamic volume scaling based on user settings
 * - Safe concurrency and overlap prevention
 */

import { useNotificationSettingsStore } from "../store/useNotificationSettingsStore.js";

// Sound asset file paths
export const SOUND_PATHS = {
  CALLING: "/sounds/calling.mp3",
  RECEIVING: "/sounds/receiving.mp3",
  MESSAGE: "/sounds/message.mp3",
  DING: "/sounds/ding.wav",
};

// Internal state tracking
let callingAudio = null;
let receivingAudio = null;
let messageAudio = null;
let dingAudio = null;

let isCallingPlaying = false;
let isReceivingPlaying = false;
let audioUnlocked = false;

// Throttle & deduplication state
let lastIncomingSoundTime = 0;
const INCOMING_SOUND_THROTTLE_MS = 1000;

// Bounded LRU-style set for deduplicating sent message ding
class SentMessageDeduplicator {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    this.ids = new Set();
    this.queue = [];
  }

  has(id) {
    if (!id) return false;
    return this.ids.has(String(id));
  }

  add(id) {
    if (!id) return;
    const str = String(id);
    if (this.ids.has(str)) return;
    this.ids.add(str);
    this.queue.push(str);
    if (this.queue.length > this.maxSize) {
      const oldest = this.queue.shift();
      this.ids.delete(oldest);
    }
  }

  clear() {
    this.ids.clear();
    this.queue = [];
  }
}

export const sentMessageDeduplicator = new SentMessageDeduplicator(200);

/**
 * Returns current volume fraction (0.0 to 1.0) from notification settings store.
 */
export const getVolumeFraction = (overrideVolume = null) => {
  try {
    if (typeof overrideVolume === "number" && !Number.isNaN(overrideVolume)) {
      return Math.max(0, Math.min(100, overrideVolume)) / 100;
    }
    const settings = useNotificationSettingsStore?.getState?.()?.settings;
    const vol = typeof settings?.soundVolume === "number" ? settings.soundVolume : 60;
    return Math.max(0, Math.min(100, vol)) / 100;
  } catch {
    return 0.6;
  }
};

/**
 * Creates or retrieves cached HTMLAudioElement safely.
 */
const getAudioElement = (key, src, loop = false) => {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  try {
    let el = null;
    if (key === "calling") {
      if (!callingAudio) {
        callingAudio = new Audio(src);
        callingAudio.loop = loop;
        callingAudio.preload = "auto";
      }
      el = callingAudio;
    } else if (key === "receiving") {
      if (!receivingAudio) {
        receivingAudio = new Audio(src);
        receivingAudio.loop = loop;
        receivingAudio.preload = "auto";
      }
      el = receivingAudio;
    } else if (key === "message") {
      if (!messageAudio) {
        messageAudio = new Audio(src);
        messageAudio.loop = loop;
        messageAudio.preload = "auto";
      }
      el = messageAudio;
    } else if (key === "ding") {
      if (!dingAudio) {
        dingAudio = new Audio(src);
        dingAudio.loop = loop;
        dingAudio.preload = "auto";
      }
      el = dingAudio;
    }
    return el;
  } catch (err) {
    console.warn(`[soundService] Failed to create audio element for ${key}:`, err?.message);
    return null;
  }
};

/**
 * Safe play helper that handles browser autoplay restrictions and errors.
 */
const safePlay = async (audio, volume = 0.6) => {
  if (!audio) return false;

  try {
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
    return true;
  } catch (err) {
    // Autoplay prevented or aborted
    return false;
  }
};

/**
 * Safe stop helper that pauses audio and resets playhead.
 */
const safeStop = (audio) => {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (err) {
    // Ignore pause errors
  }
};

/**
 * Synthesizes a subtle high-pitched message sent DING via Web Audio API.
 * Used as reliable fallback if ding.wav fails to load.
 */
export const playWebAudioDing = (volumeFraction = 0.5) => {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    const gainVal = Math.max(0, Math.min(1, volumeFraction)) * 0.3;
    masterGain.gain.setValueAtTime(gainVal, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    masterGain.connect(ctx.destination);

    // Fundamental tone: C6 (1046 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // Slight upward pitch bend
    osc1.connect(masterGain);

    // Subtle overtone: E6/G6 (1568 Hz)
    const osc2 = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(gainVal * 0.25, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1568, now);
    osc2.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.18);
    osc2.start(now);
    osc2.stop(now + 0.12);

    osc1.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch (err) {
    console.warn("[soundService] Web Audio Ding fallback failed:", err?.message);
  }
};

/**
 * Synthesizes a two-tone incoming message chime via Web Audio API.
 */
export const playWebAudioChime = (volumeFraction = 0.6) => {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const masterGain = Math.max(0, Math.min(1, volumeFraction)) * 0.35;
    gainNode.gain.setValueAtTime(masterGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(740, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(987, now + 0.08);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);

    osc2.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch (err) {
    console.warn("[soundService] Web Audio Chime fallback failed:", err?.message);
  }
};

/**
 * Unlocks audio playback on user gesture to comply with browser autoplay policies.
 */
export const unlockAudio = () => {
  if (
    audioUnlocked ||
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return;
  }

  const handleInteraction = () => {
    audioUnlocked = true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const dummyCtx = new AudioContextClass();
        if (dummyCtx.state === "suspended") {
          dummyCtx.resume().catch(() => {});
        }
        dummyCtx.close().catch(() => {});
      }
    } catch {}

    try {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("click", handleInteraction);
    } catch {}
  };

  try {
    window.addEventListener("pointerdown", handleInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", handleInteraction, { once: true, passive: true });
    window.addEventListener("click", handleInteraction, { once: true, passive: true });
  } catch {}
};

// Auto-register unlock listener in browser
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  unlockAudio();
}

/* =====================================================================
 * 1. CALLING SOUND: Outgoing Audio/Video Call Ringtone (calling.mp3)
 * ===================================================================== */

/**
 * Starts playing the outgoing call ringtone in a loop.
 * Automatically stops receiving sound if it was playing.
 */
export const playCalling = async ({ volume = null } = {}) => {
  stopReceiving();

  const vol = getVolumeFraction(volume);
  const audio = getAudioElement("calling", SOUND_PATHS.CALLING, true);
  if (!audio) return false;

  audio.loop = true;
  isCallingPlaying = true;
  return safePlay(audio, vol);
};

/**
 * Stops the outgoing call ringtone immediately.
 */
export const stopCalling = () => {
  isCallingPlaying = false;
  safeStop(callingAudio);
};

/* =====================================================================
 * 2. RECEIVING SOUND: Incoming Audio/Video Call Ringtone (receiving.mp3)
 * ===================================================================== */

/**
 * Starts playing the incoming call ringtone in a loop.
 * Automatically stops outgoing calling sound if it was playing.
 */
export const playReceiving = async ({ volume = null } = {}) => {
  stopCalling();

  const vol = getVolumeFraction(volume);
  const audio = getAudioElement("receiving", SOUND_PATHS.RECEIVING, true);
  if (!audio) return false;

  audio.loop = true;
  isReceivingPlaying = true;
  return safePlay(audio, vol);
};

/**
 * Stops the incoming call ringtone immediately.
 */
export const stopReceiving = () => {
  isReceivingPlaying = false;
  safeStop(receivingAudio);
};

/**
 * Stops all call-related sounds (both calling and receiving ringtones).
 */
export const stopAllCallSounds = () => {
  stopCalling();
  stopReceiving();
};

/* =====================================================================
 * 3. MESSAGE SOUND: Incoming Message Notification Chime (message.mp3)
 * ===================================================================== */

/**
 * Plays the incoming message sound chime.
 * Respects soundEnabled, volume slider, mute, DND, throttle, and soft chime.
 */
export const playIncomingMessageSound = ({
  volume = null,
  soundEnabled = true,
  messageId = null,
  isMuted = false,
  isDnd = false,
  force = false,
  soft = false,
} = {}) => {
  if (!force) {
    if (!soundEnabled) return false;
    if (isMuted || isDnd) return false;

    const now = Date.now();
    if (now - lastIncomingSoundTime < INCOMING_SOUND_THROTTLE_MS) {
      return false;
    }
    lastIncomingSoundTime = now;
  }

  const baseFraction = getVolumeFraction(volume);
  const volumeFraction = baseFraction * (soft ? 0.35 : 1.0);
  if (volumeFraction <= 0) return false;

  const audio = getAudioElement("message", SOUND_PATHS.MESSAGE, false);
  if (!audio) {
    playWebAudioChime(volumeFraction);
    return true;
  }

  audio.loop = false;
  audio.volume = volumeFraction;
  audio.currentTime = 0;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      playWebAudioChime(volumeFraction);
    });
  }
  return true;
};

/* =====================================================================
 * 4. DING SOUND: Outgoing Sent Message Confirmation Sound (ding.wav)
 * ===================================================================== */

/**
 * Plays a subtle short DING sound for a successfully sent message.
 * - Deduplicated by messageId: will only play once per unique message
 * - Scaled by user volume settings
 * - Never plays on message failure or repeatedly on retries
 */
export const playOutgoingMessageSound = (messageId = null, { volume = null, force = false } = {}) => {
  if (messageId) {
    if (!force && sentMessageDeduplicator.has(messageId)) {
      return false; // Already played for this message
    }
    sentMessageDeduplicator.add(messageId);
  }

  const baseFraction = getVolumeFraction(volume);
  const volumeFraction = Math.max(0.1, baseFraction * 0.7); // Subtle, non-jarring level
  if (volumeFraction <= 0) return false;

  const audio = getAudioElement("ding", SOUND_PATHS.DING, false);
  if (!audio) {
    playWebAudioDing(volumeFraction);
    return true;
  }

  audio.loop = false;
  audio.volume = volumeFraction;
  audio.currentTime = 0;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      playWebAudioDing(volumeFraction);
    });
  }
  return true;
};

/**
 * State queries and mass cleanup
 */
export const isCallingActive = () => isCallingPlaying;
export const isReceivingActive = () => isReceivingPlaying;

export const stopAll = () => {
  stopAllCallSounds();
  safeStop(messageAudio);
  safeStop(dingAudio);
};

const soundService = {
  SOUND_PATHS,
  playCalling,
  stopCalling,
  playReceiving,
  stopReceiving,
  stopAllCallSounds,
  playIncomingMessageSound,
  playOutgoingMessageSound,
  isCallingActive,
  isReceivingActive,
  stopAll,
  unlockAudio,
  getVolumeFraction,
  playWebAudioDing,
  playWebAudioChime,
  sentMessageDeduplicator,
};

export default soundService;
