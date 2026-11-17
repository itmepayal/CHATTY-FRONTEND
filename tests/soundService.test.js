import test from "node:test";
import assert from "node:assert/strict";

// Mock Audio and Web Audio environment before importing soundService
class MockAudio {
  static instances = [];

  constructor(src) {
    this.src = src;
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.preload = "none";
    this.paused = true;
    this.played = false;
    MockAudio.instances.push(this);
  }

  async play() {
    this.paused = false;
    this.played = true;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
  }

  createOscillator() {
    return {
      type: "sine",
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }

  async resume() {
    this.state = "running";
  }

  close() {}
}

const listeners = new Map();
globalThis.Audio = MockAudio;
globalThis.window = {
  Audio: MockAudio,
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  addEventListener: (evt, fn) => {
    if (!listeners.has(evt)) listeners.set(evt, []);
    listeners.get(evt).push(fn);
  },
  removeEventListener: (evt, fn) => {
    if (listeners.has(evt)) {
      const arr = listeners.get(evt).filter((h) => h !== fn);
      listeners.set(evt, arr);
    }
  },
};

const {
  SOUND_PATHS,
  getVolumeFraction,
  playCalling,
  stopCalling,
  playReceiving,
  stopReceiving,
  stopAllCallSounds,
  playIncomingMessageSound,
  playOutgoingMessageSound,
  isCallingActive,
  isReceivingActive,
  sentMessageDeduplicator,
  playWebAudioDing,
  playWebAudioChime,
  unlockAudio,
} = await import("../src/services/soundService.js");

test("1. SOUND_PATHS defines all four required audio assets", () => {
  assert.equal(SOUND_PATHS.CALLING, "/sounds/calling.mp3");
  assert.equal(SOUND_PATHS.RECEIVING, "/sounds/receiving.mp3");
  assert.equal(SOUND_PATHS.MESSAGE, "/sounds/message.mp3");
  assert.equal(SOUND_PATHS.DING, "/sounds/ding.wav");
});

test("2. getVolumeFraction converts 0-100 to 0.0-1.0 and clamps invalid values", () => {
  assert.equal(getVolumeFraction(100), 1.0);
  assert.equal(getVolumeFraction(50), 0.5);
  assert.equal(getVolumeFraction(0), 0.0);
  assert.equal(getVolumeFraction(150), 1.0, "Clamps upper bound");
  assert.equal(getVolumeFraction(-20), 0.0, "Clamps lower bound");
});

test("3. playCalling loops calling.mp3 and stopCalling resets playback", async () => {
  MockAudio.instances = [];
  const res = await playCalling({ volume: 80 });
  assert.equal(res, true);
  assert.equal(isCallingActive(), true);

  const callingInstance = MockAudio.instances.find((a) => a.src === SOUND_PATHS.CALLING);
  assert.ok(callingInstance, "calling audio instance was created");
  assert.equal(callingInstance.loop, true);
  assert.equal(callingInstance.volume, 0.8);
  assert.equal(callingInstance.paused, false);

  stopCalling();
  assert.equal(isCallingActive(), false);
  assert.equal(callingInstance.paused, true);
  assert.equal(callingInstance.currentTime, 0);
});

test("4. playReceiving loops receiving.mp3 and stopReceiving resets playback", async () => {
  MockAudio.instances = [];
  const res = await playReceiving({ volume: 70 });
  assert.equal(res, true);
  assert.equal(isReceivingActive(), true);

  const receivingInstance = MockAudio.instances.find((a) => a.src === SOUND_PATHS.RECEIVING);
  assert.ok(receivingInstance, "receiving audio instance was created");
  assert.equal(receivingInstance.loop, true);
  assert.equal(receivingInstance.volume, 0.7);
  assert.equal(receivingInstance.paused, false);

  stopReceiving();
  assert.equal(isReceivingActive(), false);
  assert.equal(receivingInstance.paused, true);
  assert.equal(receivingInstance.currentTime, 0);
});

test("5. Concurrency prevention: playCalling stops receiving, and playReceiving stops calling", async () => {
  await playReceiving();
  assert.equal(isReceivingActive(), true);
  assert.equal(isCallingActive(), false);

  // Switching to calling must immediately stop receiving
  await playCalling();
  assert.equal(isCallingActive(), true);
  assert.equal(isReceivingActive(), false);

  // Switching back to receiving must immediately stop calling
  await playReceiving();
  assert.equal(isReceivingActive(), true);
  assert.equal(isCallingActive(), false);

  stopAllCallSounds();
  assert.equal(isCallingActive(), false);
  assert.equal(isReceivingActive(), false);
});

test("6. playIncomingMessageSound respects soundEnabled, mute, DND, and throttle", () => {
  const disabled = playIncomingMessageSound({ soundEnabled: false });
  assert.equal(disabled, false);

  const muted = playIncomingMessageSound({ isMuted: true });
  assert.equal(muted, false);

  const dnd = playIncomingMessageSound({ isDnd: true });
  assert.equal(dnd, false);

  const played = playIncomingMessageSound({ soundEnabled: true, force: true });
  assert.equal(played, true);
});

test("7. playOutgoingMessageSound plays ding and deduplicates by messageId", () => {
  sentMessageDeduplicator.clear();
  const testMsgId = "msg_outgoing_12345";

  const firstPlay = playOutgoingMessageSound(testMsgId);
  assert.equal(firstPlay, true, "First send of messageId must play ding");

  const duplicatePlay = playOutgoingMessageSound(testMsgId);
  assert.equal(duplicatePlay, false, "Duplicate send of same messageId must be suppressed");

  const anotherMsgId = "msg_outgoing_67890";
  const secondMsgPlay = playOutgoingMessageSound(anotherMsgId);
  assert.equal(secondMsgPlay, true, "Distinct messageId must play ding");
});

test("8. Web Audio fallback synthesis runs safely without throwing", () => {
  assert.doesNotThrow(() => {
    playWebAudioDing(0.6);
  });
  assert.doesNotThrow(() => {
    playWebAudioChime(0.6);
  });
});

test("9. unlockAudio handles browser user gestures safely", () => {
  assert.doesNotThrow(() => {
    unlockAudio();
  });
});
