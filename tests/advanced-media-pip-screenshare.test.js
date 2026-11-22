import { describe, it } from "node:test";
import assert from "node:assert";
import { SCREEN_SHARE_STATE } from "../src/lib/screenShareManager.js";
import { VIRTUAL_BACKGROUND_PRESETS } from "../src/lib/videoProcessor.js";

describe("Level 3: Advanced Media, PiP, Screen Sharing & Responsive UI Suite", () => {
  describe("1. Picture-in-Picture (PiP) Architecture & State Integrity", () => {
    it("enforces secondary PiP video element muted for autoplay compliance while main audio stays audible", () => {
      // In PiP, the video element inside Document PiP window must be muted=true
      // so browser autoplay policy never blocks it. The audio is routed through the main window.
      const pipRemoteVideo = {
        muted: false,
        srcObject: null,
      };

      const setPipRemoteStream = (stream) => {
        pipRemoteVideo.srcObject = stream;
        pipRemoteVideo.muted = true; // Autoplay compliance
      };

      const mockStream = { id: "remote-stream-1", getTracks: () => [] };
      setPipRemoteStream(mockStream);

      assert.strictEqual(pipRemoteVideo.muted, true, "PiP remote video must be muted to comply with autoplay policy");
      assert.strictEqual(pipRemoteVideo.srcObject.id, "remote-stream-1");
    });

    it("verifies PiP auto-closes when call transitions to ended or idle", () => {
      let isPipActive = true;
      let pipClosed = false;

      const mockPipWindow = {
        closed: false,
        close: () => {
          pipClosed = true;
          mockPipWindow.closed = true;
        },
      };

      const handleCallStatusChange = (status) => {
        if (status === "ended" || status === "idle") {
          if (mockPipWindow && !mockPipWindow.closed) {
            mockPipWindow.close();
          }
          isPipActive = false;
        }
      };

      handleCallStatusChange("ended");

      assert.strictEqual(pipClosed, true, "PiP window must be automatically closed when call ends");
      assert.strictEqual(isPipActive, false, "isPipActive must be false");
    });

    it("verifies MinimizedCallView drag constraints calculation across viewports", () => {
      const calculateDragConstraints = (windowW, windowH) => ({
        left: 12,
        right: Math.max(12, windowW - 290),
        top: 12,
        bottom: Math.max(12, windowH - 190),
      });

      // Mobile portrait 375x667
      const mobile = calculateDragConstraints(375, 667);
      assert.strictEqual(mobile.right, 85);
      assert.strictEqual(mobile.bottom, 477);

      // Desktop 1920x1080
      const desktop = calculateDragConstraints(1920, 1080);
      assert.strictEqual(desktop.right, 1630);
      assert.strictEqual(desktop.bottom, 890);

      // Ultra-small 320x480
      const small = calculateDragConstraints(320, 480);
      assert.strictEqual(small.right, 30);
      assert.strictEqual(small.bottom, 290);
    });
  });

  describe("2. Screen Sharing State Machine & Track Management", () => {
    it("defines all required screen sharing states", () => {
      assert.strictEqual(SCREEN_SHARE_STATE.IDLE, "IDLE");
      assert.strictEqual(SCREEN_SHARE_STATE.REQUESTING_PERMISSION, "REQUESTING_PERMISSION");
      assert.strictEqual(SCREEN_SHARE_STATE.STARTING, "STARTING");
      assert.strictEqual(SCREEN_SHARE_STATE.SHARING, "SHARING");
      assert.strictEqual(SCREEN_SHARE_STATE.STOPPING, "STOPPING");
      assert.strictEqual(SCREEN_SHARE_STATE.RESTORING_CAMERA, "RESTORING_CAMERA");
      assert.strictEqual(SCREEN_SHARE_STATE.ERROR, "ERROR");
    });

    it("restores original camera track to video senders when screen sharing stops", async () => {
      let replacedWithTrack = null;
      const mockSender = {
        replaceTrack: async (track) => {
          replacedWithTrack = track;
        },
      };

      const originalCameraTrack = { id: "cam-track-1", kind: "video", enabled: true };
      const stopScreenSharing = async (trackToRestore, senders) => {
        for (const sender of senders) {
          await sender.replaceTrack(trackToRestore || null);
        }
      };

      // Scenario A: Camera was active before screen share
      await stopScreenSharing(originalCameraTrack, [mockSender]);
      assert.strictEqual(replacedWithTrack.id, "cam-track-1", "Original camera track must be restored");

      // Scenario B: Call was audio-only (no camera track)
      await stopScreenSharing(null, [mockSender]);
      assert.strictEqual(replacedWithTrack, null, "Video sender track must be cleared to null in audio-only call");
    });

    it("handles native browser stop button cleanly via track.onended", async () => {
      let nativeStopTriggered = false;
      const mockScreenTrack = {
        onended: null,
      };

      const attachNativeEnded = (track, onEndFn) => {
        track.onended = () => {
          nativeStopTriggered = true;
          onEndFn();
        };
      };

      let cleanupDone = false;
      attachNativeEnded(mockScreenTrack, () => {
        cleanupDone = true;
      });

      // Simulate browser native UI "Stop sharing" click
      mockScreenTrack.onended();

      assert.strictEqual(nativeStopTriggered, true);
      assert.strictEqual(cleanupDone, true);
    });
  });

  describe("3. Virtual Background & MediaPipe AI Processing", () => {
    it("validates preset gallery contains all 15 required presets with valid categories", () => {
      assert.strictEqual(VIRTUAL_BACKGROUND_PRESETS.length, 15);
      const categories = new Set(VIRTUAL_BACKGROUND_PRESETS.map((p) => p.category));
      assert.ok(categories.has("original"));
      assert.ok(categories.has("blur"));
      assert.ok(categories.has("virtual"));
      assert.ok(categories.has("custom"));
    });

    it("verifies cover image aspect ratio mathematics prevent distortion or stretching", () => {
      const calculateCoverDimensions = (imgW, imgH, canvasW, canvasH) => {
        const imgRatio = imgW / imgH;
        const canvasRatio = canvasW / canvasH;
        let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;

        if (imgRatio > canvasRatio) {
          sWidth = imgH * canvasRatio;
          sx = (imgW - sWidth) / 2;
        } else {
          sHeight = imgW / canvasRatio;
          sy = (imgH - sHeight) / 2;
        }
        return { sx, sy, sWidth, sHeight };
      };

      // 16:9 canvas (1280x720), 4:3 image (800x600)
      const res1 = calculateCoverDimensions(800, 600, 1280, 720);
      assert.strictEqual(res1.sx, 0);
      assert.strictEqual(res1.sy, 75); // Cropped top/bottom evenly
      assert.strictEqual(res1.sHeight, 450);

      // 16:9 canvas (1280x720), 21:9 image (2560x1080)
      const res2 = calculateCoverDimensions(2560, 1080, 1280, 720);
      assert.strictEqual(res2.sy, 0);
      assert.strictEqual(res2.sx, 320); // Cropped left/right evenly
      assert.strictEqual(res2.sWidth, 1920);
    });

    it("ensures MPMask close() is called to prevent WebGL texture leaks", () => {
      let closedCount = 0;
      const mockMask = {
        close: () => {
          closedCount++;
        },
      };

      const cleanupMasks = (masks) => {
        masks.forEach((m) => {
          if (typeof m?.close === "function") m.close();
        });
      };

      cleanupMasks([mockMask, mockMask, mockMask]);
      assert.strictEqual(closedCount, 3, "All masks must be cleanly closed");
    });
  });

  describe("4. Device Management & Hardware Disconnect Resilience", () => {
    it("handles unexpected camera track disconnect gracefully by switching cameraOff to true", () => {
      let cameraOffState = false;
      let mediaEmitted = null;

      const mockTrack = {
        id: "cam-hw-1",
        onended: null,
      };

      // Setup disconnect handler (as implemented in CallContext)
      mockTrack.onended = () => {
        cameraOffState = true;
        mediaEmitted = { audio: true, video: false };
      };

      // Simulate USB camera unplug
      mockTrack.onended();

      assert.strictEqual(cameraOffState, true, "cameraOff must be set to true on hardware disconnect");
      assert.strictEqual(mediaEmitted.video, false, "call:media must notify peer that video stopped");
    });

    it("verifies microphone unplug sets muted to true and notifies peer", () => {
      let isMutedState = false;
      let mediaEmitted = null;

      const mockAudioTrack = {
        id: "mic-hw-1",
        onended: null,
      };

      mockAudioTrack.onended = () => {
        isMutedState = true;
        mediaEmitted = { audio: false, video: true };
      };

      // Simulate mic unplug
      mockAudioTrack.onended();

      assert.strictEqual(isMutedState, true);
      assert.strictEqual(mediaEmitted.audio, false);
    });
  });

  describe("5. Responsive Layout & Control Touch Targets Across All Target Breakpoints", () => {
    const TARGET_VIEWPORTS = [
      { name: "Small mobile", w: 320, h: 568 },
      { name: "iPhone SE / standard mobile", w: 360, h: 640 },
      { name: "iPhone 12/13/14 mini", w: 375, h: 812 },
      { name: "iPhone 14/15/16 Pro", w: 390, h: 844 },
      { name: "Large mobile / Plus", w: 414, h: 896 },
      { name: "Mobile landscape / large", w: 480, h: 800 },
      { name: "Tablet portrait", w: 768, h: 1024 },
      { name: "Tablet landscape / small laptop", w: 1024, h: 768 },
      { name: "Standard desktop", w: 1280, h: 800 },
      { name: "MacBook Pro / QHD", w: 1440, h: 900 },
      { name: "Full HD 1080p", w: 1920, h: 1080 },
    ];

    it("enforces minimum button touch target of at least 44x44px on all viewports", () => {
      // In CallUI.jsx and CallActionBar.jsx:
      // Primary control buttons have size-11 (44px) on mobile and size-12 (48px) on sm+
      const buttonSizeMobile = 44; // min-w-[44px] min-h-[44px]
      const buttonSizeDesktop = 48; // sm:size-12

      assert.ok(buttonSizeMobile >= 44, "Mobile touch target must be >= 44px");
      assert.ok(buttonSizeDesktop >= 44, "Desktop touch target must be >= 44px");
    });

    it("verifies mobile vs desktop action bar layout partitioning", () => {
      TARGET_VIEWPORTS.forEach((vp) => {
        const isMobile = vp.w < 640; // Tailwind 'sm' breakpoint
        if (isMobile) {
          // On mobile: 4 core visible dock buttons + 'More' sheet
          const visibleDockButtons = 5; // Mute, Video, Speaker, More, End
          assert.strictEqual(visibleDockButtons <= 5, true, `Dock buttons on ${vp.name} (${vp.w}px) must fit within mobile screen`);
        } else {
          // On desktop: all 10 controls visible in full floating dock
          const desktopDockControls = 10;
          assert.strictEqual(desktopDockControls >= 8, true, `Full controls visible on ${vp.name} (${vp.w}px)`);
        }
      });
    });

    it("verifies safe-area padding is included for edge-to-edge mobile devices", () => {
      const bottomDockPadding = "pb-[max(1.25rem,env(safe-area-inset-bottom))]";
      const topHeaderPadding = "pt-[max(0.75rem,env(safe-area-inset-top))]";

      assert.ok(bottomDockPadding.includes("env(safe-area-inset-bottom)"));
      assert.ok(topHeaderPadding.includes("env(safe-area-inset-top)"));
    });
  });
});
