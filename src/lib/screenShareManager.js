/**
 * Screen Share Manager
 * Production-grade WebRTC Screen Sharing controller.
 * Handles state machine, display capture, audio mixing (system/tab audio + mic),
 * track replacement on RTCRtpSender, browser-native cancellation, and camera restoration.
 */

export const SCREEN_SHARE_STATE = Object.freeze({
  IDLE: "IDLE",
  REQUESTING_PERMISSION: "REQUESTING_PERMISSION",
  STARTING: "STARTING",
  SHARING: "SHARING",
  STOPPING: "STOPPING",
  RESTORING_CAMERA: "RESTORING_CAMERA",
  ERROR: "ERROR",
});

export class ScreenShareManager {
  constructor({ onStateChange, onAudioMixed } = {}) {
    this.state = SCREEN_SHARE_STATE.IDLE;
    this.onStateChange = onStateChange || (() => {});
    this.onAudioMixed = onAudioMixed || (() => {});

    // Media stream and track references
    this.screenStream = null;
    this.screenVideoTrack = null;
    this.screenAudioTrack = null;
    this.originalCameraTrack = null;
    this.originalMicTrack = null;
    this.mixedAudioTrack = null;

    // Web Audio mixing infrastructure
    this.audioCtx = null;
    this.micSourceNode = null;
    this.screenSourceNode = null;
    this.micGainNode = null;
    this.screenGainNode = null;
    this.audioDestination = null;

    // Senders references (single or multiple for mesh)
    this.videoSenders = [];
    this.audioSenders = [];

    // State tracking
    this.wasCameraEnabled = true;
    this.onEndedCallback = null;
    this._isDisposed = false;
  }

  /**
   * Check whether screen sharing is supported in the current environment
   */
  static isSupported() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
    if (typeof navigator.mediaDevices.getDisplayMedia !== "function") return false;
    // In browsers, getDisplayMedia requires a secure context (HTTPS or localhost)
    if (typeof window !== "undefined" && window.isSecureContext === false) return false;
    return true;
  }

  /**
   * Update internal state and notify listeners
   */
  _setState(nextState, error = null) {
    if (this._isDisposed) return;
    this.state = nextState;
    try {
      this.onStateChange(nextState, error);
    } catch (err) {
      console.warn("[ScreenShareManager] onStateChange error:", err);
    }
  }

  /**
   * Start screen sharing
   * @param {Object} options
   * @param {RTCRtpSender|RTCRtpSender[]} options.videoSenders Video sender(s) to replace track on
   * @param {RTCRtpSender|RTCRtpSender[]} [options.audioSenders] Audio sender(s) for mixing system audio
   * @param {MediaStreamTrack} [options.currentCameraTrack] Active camera track to restore later
   * @param {MediaStreamTrack} [options.currentMicTrack] Active mic track for system audio mixing
   * @param {boolean} [options.isCameraEnabled=true] Whether camera was unmuted before sharing
   * @param {Function} [options.onEnded] Callback when user ends sharing via browser native UI
   * @returns {Promise<{ ok: boolean, stream?: MediaStream, hasAudio?: boolean, error?: string }>}
   */
  async start({
    videoSenders,
    audioSenders = [],
    currentCameraTrack = null,
    currentMicTrack = null,
    isCameraEnabled = true,
    onEnded = null,
  }) {
    if (
      this.state === SCREEN_SHARE_STATE.REQUESTING_PERMISSION ||
      this.state === SCREEN_SHARE_STATE.STARTING ||
      this.state === SCREEN_SHARE_STATE.SHARING
    ) {
      return { ok: false, error: "Screen sharing is already active or starting." };
    }

    if (!ScreenShareManager.isSupported()) {
      const err = "Screen sharing is not supported in this browser or requires HTTPS.";
      this._setState(SCREEN_SHARE_STATE.ERROR, err);
      return { ok: false, error: err };
    }

    this.videoSenders = Array.isArray(videoSenders) ? videoSenders.filter(Boolean) : [videoSenders].filter(Boolean);
    this.audioSenders = Array.isArray(audioSenders) ? audioSenders.filter(Boolean) : [audioSenders].filter(Boolean);
    this.originalCameraTrack = currentCameraTrack;
    this.originalMicTrack = currentMicTrack;
    this.wasCameraEnabled = Boolean(isCameraEnabled);
    this.onEndedCallback = onEnded;

    this._setState(SCREEN_SHARE_STATE.REQUESTING_PERMISSION);

    let stream = null;
    try {
      // Attempt display media capture with audio first
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
          },
          audio: true,
        });
      } catch (audioErr) {
        // Fallback: If audio capture constraint fails on some platforms, retry video-only
        if (audioErr.name === "TypeError" || audioErr.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false,
          });
        } else {
          throw audioErr;
        }
      }
    } catch (err) {
      const errorName = err?.name || "";
      let userFriendlyError = "Failed to start screen sharing.";

      if (errorName === "NotAllowedError") {
        userFriendlyError = "Permission to share screen was cancelled or denied.";
      } else if (errorName === "AbortError") {
        userFriendlyError = "Screen sharing request was aborted.";
      } else if (errorName === "NotFoundError") {
        userFriendlyError = "No eligible screen or window was selected.";
      } else if (errorName === "SecurityError") {
        userFriendlyError = "Screen sharing is blocked by browser security policy.";
      }

      this._setState(SCREEN_SHARE_STATE.IDLE, userFriendlyError);
      return { ok: false, error: userFriendlyError, cancelled: errorName === "NotAllowedError" };
    }

    // Validate the stream
    const videoTracks = stream?.getVideoTracks() || [];
    if (videoTracks.length === 0 || videoTracks[0].readyState === "ended") {
      stream?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch { /* ignore */ }
      });
      const err = "No valid video track found in screen capture stream.";
      this._setState(SCREEN_SHARE_STATE.IDLE, err);
      return { ok: false, error: err };
    }

    this._setState(SCREEN_SHARE_STATE.STARTING);

    this.screenStream = stream;
    this.screenVideoTrack = videoTracks[0];
    const audioTracks = stream.getAudioTracks();
    this.screenAudioTrack = audioTracks.length > 0 ? audioTracks[0] : null;

    // Attach native browser stop handler
    this.screenVideoTrack.onended = () => {
      this._handleNativeEnded();
    };

    // 1. Replace video track on all registered video senders
    const replacePromises = this.videoSenders.map(async (sender) => {
      try {
        if (sender && typeof sender.replaceTrack === "function") {
          await sender.replaceTrack(this.screenVideoTrack);
        }
      } catch (err) {
        console.warn("[ScreenShareManager] replaceTrack failed on video sender:", err);
      }
    });
    await Promise.all(replacePromises);

    // 2. Mix and route screen audio if available
    let hasAudio = false;
    if (this.screenAudioTrack && this.audioSenders.length > 0 && this.originalMicTrack) {
      try {
        hasAudio = await this._setupAudioMixing();
      } catch (err) {
        console.warn("[ScreenShareManager] Audio mixing setup failed:", err);
      }
    }

    this._setState(SCREEN_SHARE_STATE.SHARING);
    return {
      ok: true,
      stream: this.screenStream,
      hasAudio,
    };
  }

  /**
   * Set up Web Audio mixing between user microphone and display audio
   */
  async _setupAudioMixing() {
    if (!this.screenAudioTrack || !this.originalMicTrack) return false;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      this.audioDestination = this.audioCtx.createMediaStreamDestination();

      // Mic stream & gain
      const micStream = new MediaStream([this.originalMicTrack]);
      this.micSourceNode = this.audioCtx.createMediaStreamSource(micStream);
      this.micGainNode = this.audioCtx.createGain();
      this.micGainNode.gain.value = 1.0;
      this.micSourceNode.connect(this.micGainNode);
      this.micGainNode.connect(this.audioDestination);

      // Screen audio stream & gain
      const screenAudioStream = new MediaStream([this.screenAudioTrack]);
      this.screenSourceNode = this.audioCtx.createMediaStreamSource(screenAudioStream);
      this.screenGainNode = this.audioCtx.createGain();
      this.screenGainNode.gain.value = 0.9; // Balanced output
      this.screenSourceNode.connect(this.screenGainNode);
      this.screenGainNode.connect(this.audioDestination);

      const mixedTracks = this.audioDestination.stream.getAudioTracks();
      if (mixedTracks.length > 0) {
        this.mixedAudioTrack = mixedTracks[0];

        // Replace track on all audio senders
        for (const sender of this.audioSenders) {
          if (sender && typeof sender.replaceTrack === "function") {
            await sender.replaceTrack(this.mixedAudioTrack);
          }
        }

        // When display audio ends on its own (e.g. user toggles tab audio mute)
        this.screenAudioTrack.onended = () => {
          this._teardownAudioMixing();
        };

        this.onAudioMixed(true);
        return true;
      }
    } catch (err) {
      console.warn("[ScreenShareManager] Web Audio mixer failed:", err);
      this._teardownAudioMixing();
    }
    return false;
  }

  /**
   * Teardown audio mixer and restore original microphone track
   */
  async _teardownAudioMixing() {
    if (this.originalMicTrack && this.audioSenders.length > 0) {
      for (const sender of this.audioSenders) {
        try {
          if (sender && typeof sender.replaceTrack === "function") {
            await sender.replaceTrack(this.originalMicTrack);
          }
        } catch { /* ignore */ }
      }
    }

    try {
      this.micSourceNode?.disconnect();
      this.screenSourceNode?.disconnect();
      this.micGainNode?.disconnect();
      this.screenGainNode?.disconnect();
    } catch { /* ignore */ }

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        await this.audioCtx.close();
      } catch { /* ignore */ }
    }

    this.audioCtx = null;
    this.micSourceNode = null;
    this.screenSourceNode = null;
    this.micGainNode = null;
    this.screenGainNode = null;
    this.audioDestination = null;
    this.mixedAudioTrack = null;

    this.onAudioMixed(false);
  }

  /**
   * Handles browser-native "Stop sharing" event
   */
  async _handleNativeEnded() {
    if (this.state === SCREEN_SHARE_STATE.STOPPING || this.state === SCREEN_SHARE_STATE.IDLE) {
      return;
    }
    await this.stop();
    if (typeof this.onEndedCallback === "function") {
      try {
        this.onEndedCallback();
      } catch (err) {
        console.warn("[ScreenShareManager] onEndedCallback error:", err);
      }
    }
  }

  /**
   * Stop screen sharing and restore camera
   * @param {MediaStreamTrack} [cameraTrackToRestore] Optional explicit camera track to restore
   */
  async stop(cameraTrackToRestore = null) {
    if (this.state === SCREEN_SHARE_STATE.STOPPING || this.state === SCREEN_SHARE_STATE.IDLE) {
      return;
    }

    this._setState(SCREEN_SHARE_STATE.STOPPING);

    // Stop all screen tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        try {
          track.onended = null;
          track.stop();
        } catch { /* ignore */ }
      });
      this.screenStream = null;
    }
    this.screenVideoTrack = null;
    this.screenAudioTrack = null;

    // Teardown audio mixing and restore mic
    await this._teardownAudioMixing();

    this._setState(SCREEN_SHARE_STATE.RESTORING_CAMERA);

    // Determine camera track to restore
    const trackToRestore = cameraTrackToRestore || this.originalCameraTrack;
    if (trackToRestore) {
      // Ensure enabled status matches previous camera state
      if (!this.wasCameraEnabled) {
        trackToRestore.enabled = false;
      }

      // Replace track on video senders
      for (const sender of this.videoSenders) {
        try {
          if (sender && typeof sender.replaceTrack === "function") {
            if (sender.dtlsTransport && sender.dtlsTransport.state === "closed") {
              continue;
            }
            await sender.replaceTrack(trackToRestore);
          }
        } catch (err) {
          if (err.name === "InvalidStateError" || err.message?.includes("closed")) {
            // Peer connection closed or closing during teardown, ignore cleanly
          } else {
            console.warn("[ScreenShareManager] Could not restore camera track on sender:", err);
          }
        }
      }
    } else {
      // Audio-only call or no camera to restore: clear video track on senders
      for (const sender of this.videoSenders) {
        try {
          if (sender && typeof sender.replaceTrack === "function") {
            if (sender.dtlsTransport && sender.dtlsTransport.state === "closed") {
              continue;
            }
            await sender.replaceTrack(null);
          }
        } catch { /* ignore */ }
      }
    }

    this.videoSenders = [];
    this.audioSenders = [];
    this.originalCameraTrack = null;
    this.originalMicTrack = null;
    this.onEndedCallback = null;

    this._setState(SCREEN_SHARE_STATE.IDLE);
  }

  /**
   * Cleanly dispose of all resources upon call termination
   */
  dispose() {
    this._isDisposed = true;
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        try {
          track.onended = null;
          track.stop();
        } catch { /* ignore */ }
      });
      this.screenStream = null;
    }
    this.screenVideoTrack = null;
    this.screenAudioTrack = null;
    this._teardownAudioMixing().catch(() => {});
    this.videoSenders = [];
    this.audioSenders = [];
    this.originalCameraTrack = null;
    this.originalMicTrack = null;
    this.onEndedCallback = null;
    this._setState(SCREEN_SHARE_STATE.IDLE);
  }
}
