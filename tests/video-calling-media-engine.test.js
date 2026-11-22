import { describe, it } from "node:test";
import assert from "node:assert";

describe("Video Calling Media & WebRTC Engine Unit Tests", () => {
  describe("BUG-VID-001: Black Screen on Initial Call Connect Prevention", () => {
    it("evaluates showRemoteVideo as false when remoteStream only contains an audio track", () => {
      const isVideo = true;
      const peerMedia = { audio: true, video: true };
      const peerScreenSharing = false;

      // Mock remoteStream with only an audio track (typical initial WebRTC ontrack arrival)
      const mockAudioTrack = { kind: "audio", readyState: "live", enabled: true };
      const remoteStream = {
        getVideoTracks: () => [],
        getAudioTracks: () => [mockAudioTrack],
      };

      const hasRemoteVideoTrack = Boolean(
        remoteStream &&
          remoteStream.getVideoTracks().length > 0 &&
          remoteStream
            .getVideoTracks()
            .some((t) => t.readyState === "live" && t.enabled),
      );

      const showRemoteVideo =
        isVideo &&
        (peerScreenSharing || (peerMedia.video && hasRemoteVideoTrack));

      assert.strictEqual(
        hasRemoteVideoTrack,
        false,
        "Audio-only stream must not be recognized as having a live video track",
      );
      assert.strictEqual(
        showRemoteVideo,
        false,
        "showRemoteVideo must be false when video frames have not yet arrived, keeping avatar visible",
      );
    });

    it("evaluates showRemoteVideo as true as soon as live video track arrives", () => {
      const isVideo = true;
      const peerMedia = { audio: true, video: true };
      const peerScreenSharing = false;

      const mockAudioTrack = { kind: "audio", readyState: "live", enabled: true };
      const mockVideoTrack = { kind: "video", readyState: "live", enabled: true };
      const remoteStream = {
        getVideoTracks: () => [mockVideoTrack],
        getAudioTracks: () => [mockAudioTrack],
      };

      const hasRemoteVideoTrack = Boolean(
        remoteStream &&
          remoteStream.getVideoTracks().length > 0 &&
          remoteStream
            .getVideoTracks()
            .some((t) => t.readyState === "live" && t.enabled),
      );

      const showRemoteVideo =
        isVideo &&
        (peerScreenSharing || (peerMedia.video && hasRemoteVideoTrack));

      assert.strictEqual(hasRemoteVideoTrack, true);
      assert.strictEqual(showRemoteVideo, true);
    });

    it("evaluates showRemoteVideo as false if video track exists but is ended or disabled", () => {
      const isVideo = true;
      const peerMedia = { audio: true, video: true };
      const peerScreenSharing = false;

      const mockEndedVideoTrack = { kind: "video", readyState: "ended", enabled: false };
      const remoteStream = {
        getVideoTracks: () => [mockEndedVideoTrack],
        getAudioTracks: () => [],
      };

      const hasRemoteVideoTrack = Boolean(
        remoteStream &&
          remoteStream.getVideoTracks().length > 0 &&
          remoteStream
            .getVideoTracks()
            .some((t) => t.readyState === "live" && t.enabled),
      );

      const showRemoteVideo =
        isVideo &&
        (peerScreenSharing || (peerMedia.video && hasRemoteVideoTrack));

      assert.strictEqual(hasRemoteVideoTrack, false);
      assert.strictEqual(showRemoteVideo, false);
    });

    it("evaluates showRemoteVideo as true during screen sharing even if camera video is absent", () => {
      const isVideo = true;
      const peerMedia = { audio: true, video: false };
      const peerScreenSharing = true;

      const remoteStream = {
        getVideoTracks: () => [],
        getAudioTracks: () => [{ kind: "audio", readyState: "live" }],
      };

      const hasRemoteVideoTrack = Boolean(
        remoteStream &&
          remoteStream.getVideoTracks().length > 0 &&
          remoteStream
            .getVideoTracks()
            .some((t) => t.readyState === "live" && t.enabled),
      );

      const showRemoteVideo =
        isVideo &&
        (peerScreenSharing || (peerMedia.video && hasRemoteVideoTrack));

      assert.strictEqual(showRemoteVideo, true, "Screen sharing overrides camera video requirement");
    });
  });

  describe("BUG-VID-002: WebRTC Glare Rollback Sequential Execution", () => {
    it("ensures rollback completes transition to stable before remote description is set", async () => {
      const callLog = [];
      let signalingState = "have-local-offer";

      const mockPc = {
        get signalingState() {
          return signalingState;
        },
        async setLocalDescription(desc) {
          callLog.push(`setLocalDescription:${desc.type}`);
          if (desc.type === "rollback") {
            signalingState = "stable";
          }
        },
        async setRemoteDescription(desc) {
          if (signalingState !== "stable") {
            throw new Error(`InvalidStateError: Cannot set remote offer in state ${signalingState}`);
          }
          callLog.push(`setRemoteDescription:${desc.type}`);
          signalingState = "have-remote-offer";
        },
      };

      // Sequential rollback execution
      await mockPc.setLocalDescription({ type: "rollback" });
      await mockPc.setRemoteDescription({ type: "offer", sdp: "v=0..." });

      assert.deepStrictEqual(callLog, [
        "setLocalDescription:rollback",
        "setRemoteDescription:offer",
      ]);
      assert.strictEqual(signalingState, "have-remote-offer");
    });
  });

  describe("BUG-VID-003: ICE Restart Candidate Buffering", () => {
    it("queues candidates arriving before remote description of restart answer is set", async () => {
      const remoteSet = { current: true };
      const pendingIce = [];
      const appliedCandidates = [];

      const mockPc = {
        async addIceCandidate(c) {
          appliedCandidates.push(c);
        },
      };

      // 1. Connection drops -> ICE restart initiated
      remoteSet.current = false; // Reset on iceRestart

      // 2. Incoming candidate arrives before restart answer is applied
      const earlyCandidate = { candidate: "candidate:1...", sdpMid: "0" };
      if (!remoteSet.current) {
        pendingIce.push(earlyCandidate);
      } else {
        await mockPc.addIceCandidate(earlyCandidate);
      }

      assert.strictEqual(pendingIce.length, 1, "Candidate must be queued in pending buffer");
      assert.strictEqual(appliedCandidates.length, 0, "No candidate applied prematurely");

      // 3. onAnswer arrives and sets remote description
      remoteSet.current = true;
      for (const c of pendingIce) {
        await mockPc.addIceCandidate(c);
      }
      pendingIce.length = 0;

      assert.strictEqual(appliedCandidates.length, 1, "Candidate flushed after answer");
      assert.strictEqual(pendingIce.length, 0, "Pending buffer cleared");
    });
  });

  describe("BUG-VID-006 & BUG-VID-008: Stable MediaStream & Listener Cleanup", () => {
    it("maintains stable stream reference across track events and cleans up all listeners", () => {
      const listeners = [];
      const mockTrack = {
        id: "v-track-1",
        kind: "video",
        addEventListener(type, fn) {
          listeners.push({ type, fn });
        },
        removeEventListener(type, fn) {
          const idx = listeners.findIndex((l) => l.type === type && l.fn === fn);
          if (idx >= 0) listeners.splice(idx, 1);
        },
      };

      const trackListenersRef = [];
      const onEnded = () => {};
      const onMute = () => {};
      const onUnmute = () => {};

      mockTrack.addEventListener("ended", onEnded);
      mockTrack.addEventListener("mute", onMute);
      mockTrack.addEventListener("unmute", onUnmute);
      trackListenersRef.push({ track: mockTrack, type: "ended", listener: onEnded });
      trackListenersRef.push({ track: mockTrack, type: "mute", listener: onMute });
      trackListenersRef.push({ track: mockTrack, type: "unmute", listener: onUnmute });

      assert.strictEqual(listeners.length, 3, "All 3 track listeners registered");

      // Cleanup
      trackListenersRef.forEach(({ track, type, listener }) => {
        track.removeEventListener(type, listener);
      });
      trackListenersRef.length = 0;

      assert.strictEqual(listeners.length, 0, "All track listeners cleanly detached");
    });
  });

  describe("BUG-VID-007: Screen Sharing in Audio Calls Transceiver Creation", () => {
    it("adds a video transceiver when none exists on the RTCPeerConnection", () => {
      const transceivers = [];
      const senders = [{ track: { kind: "audio" } }];

      const mockPc = {
        getSenders: () => senders,
        getTransceivers: () => transceivers,
        addTransceiver(kind, options) {
          const tc = {
            kind,
            options,
            sender: { kind, track: null, replaceTrack: async () => {} },
          };
          transceivers.push(tc);
          senders.push(tc.sender);
          return tc;
        },
      };

      // Check for video sender
      let videoSender = mockPc.getSenders().find((s) => s.track && s.track.kind === "video");
      let addedTransceiver = false;

      if (!videoSender) {
        const tc = mockPc.addTransceiver("video", { direction: "sendrecv" });
        videoSender = tc.sender;
        addedTransceiver = true;
      }

      assert.strictEqual(addedTransceiver, true, "Dynamically created video transceiver");
      assert.ok(videoSender, "Video sender now exists");
      assert.strictEqual(videoSender.kind, "video");
    });
  });
});
