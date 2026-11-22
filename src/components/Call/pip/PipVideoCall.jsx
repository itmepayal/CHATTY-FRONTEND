import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  ScreenShare,
  Pause,
  Wifi,
  X,
  Volume2,
} from "lucide-react";
import CallAvatar from "../common/CallAvatar";
import { formatCallTimer } from "../common/callTokens";

/**
 * Picture-in-Picture Floating Video Calling Interface
 * Designed to Google Meet, Zoom, and WhatsApp commercial standards.
 * Rendered into Document Picture-in-Picture window via React Portal
 * and used as the in-app floating overlay.
 */
export default function PipVideoCall({
  title = "User",
  avatar = "",
  isVideo = true,
  remoteStream = null,
  localStream = null,
  peerMedia = { audio: true, video: true },
  peerScreenSharing = false,
  isScreenSharing = false,
  screenStream = null,
  cameraOff = false,
  muted = false,
  seconds = 0,
  networkQuality = "good",
  isHeld = false,
  holdNotice = "",
  onToggleMute,
  onToggleCamera,
  onReturnToFullCall,
  onEndCall,
  onClosePip,
  isNativePip = true,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [, setTrackVersion] = useState(0);

  // Reliable callback ref for remote video: attaches immediately upon DOM mount
  const setRemoteVideoRef = useCallback(
    (el) => {
      remoteVideoRef.current = el;
      if (el && remoteStream) {
        if (el.srcObject !== remoteStream) {
          el.srcObject = remoteStream;
        }
        // Always mute the PiP video element to guarantee browser autoplay compliance in secondary window
        el.muted = true;
        el.play?.().catch((err) => {
          console.warn("[PipVideoCall] remote play error:", err);
        });
      }
    },
    [remoteStream],
  );

  // Reliable callback ref for local thumbnail video: attaches immediately upon DOM mount
  const setLocalVideoRef = useCallback(
    (el) => {
      localVideoRef.current = el;
      const activeLocal = isScreenSharing
        ? screenStream || localStream
        : localStream;
      if (el && activeLocal) {
        if (el.srcObject !== activeLocal) {
          el.srcObject = activeLocal;
        }
        el.muted = true;
        el.play?.().catch((err) => {
          console.warn("[PipVideoCall] local play error:", err);
        });
      }
    },
    [localStream, isScreenSharing, screenStream],
  );

  // Listen to track state events on remoteStream to trigger instantaneous React updates
  useEffect(() => {
    if (!remoteStream) return;
    const forceUpdate = () => setTrackVersion((v) => v + 1);

    remoteStream.addEventListener("addtrack", forceUpdate);
    remoteStream.addEventListener("removetrack", forceUpdate);

    const tracks = remoteStream.getVideoTracks();
    tracks.forEach((t) => {
      t.addEventListener("ended", forceUpdate);
      t.addEventListener("mute", forceUpdate);
      t.addEventListener("unmute", forceUpdate);
    });

    return () => {
      remoteStream.removeEventListener("addtrack", forceUpdate);
      remoteStream.removeEventListener("removetrack", forceUpdate);
      tracks.forEach((t) => {
        t.removeEventListener("ended", forceUpdate);
        t.removeEventListener("mute", forceUpdate);
        t.removeEventListener("unmute", forceUpdate);
      });
    };
  }, [remoteStream]);

  // Keep remote video srcObject synchronized when remoteStream changes
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el || !remoteStream) return;
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }
    el.muted = true;
    el.play?.().catch((err) => {
      console.warn("[PipVideoCall] remote play error in effect:", err);
    });

    const handleLoadedMetadata = () => {
      el.muted = true;
      el.play?.().catch(() => {});
    };

    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [remoteStream]);

  // Keep local video srcObject synchronized when localStream changes
  useEffect(() => {
    const el = localVideoRef.current;
    const activeLocal = isScreenSharing
      ? screenStream || localStream
      : localStream;
    if (el && activeLocal && el.srcObject !== activeLocal) {
      el.srcObject = activeLocal;
      el.play?.().catch(() => {});
    }
  }, [localStream, isScreenSharing, screenStream]);

  const hasRemoteVideoTrack = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream.getVideoTracks().some((t) => t.readyState === "live"),
  );

  const showRemoteVideo =
    isVideo &&
    (peerMedia?.video !== false || peerScreenSharing) &&
    hasRemoteVideoTrack;

  // Structured Development Debug Logging (Section 8)
  useEffect(() => {
    if (import.meta.env?.DEV) {
      const el = remoteVideoRef.current;
      const vTracks = remoteStream?.getVideoTracks() || [];
      const aTracks = remoteStream?.getAudioTracks() || [];
      console.log("[PipVideoCall:RemoteVideo]", {
        title,
        streamId: remoteStream?.id || "none",
        hasEl: Boolean(el),
        srcObject: el?.srcObject?.id || null,
        videoWidth: el?.videoWidth || 0,
        videoHeight: el?.videoHeight || 0,
        readyState: el?.readyState,
        paused: el?.paused,
        muted: el?.muted,
        showRemoteVideo,
        hasRemoteVideoTrack,
        videoTrackCount: vTracks.length,
        audioTrackCount: aTracks.length,
        videoTracks: vTracks.map((t) => ({
          id: t.id,
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted,
        })),
        audioTracks: aTracks.map((t) => ({
          id: t.id,
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted,
        })),
      });
    }
  }, [remoteStream, title, showRemoteVideo, hasRemoteVideoTrack]);

  const qualityDotColor =
    networkQuality === "poor"
      ? "#ef4444"
      : networkQuality === "weak"
        ? "#f59e0b"
        : "#10b981";

  const isLocalCameraActive =
    !cameraOff && Boolean(localStream) && !isScreenSharing;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#0a0c10",
        color: "#ffffff",
        userSelect: "none",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 1. Main Remote Video Area (Always mounted to prevent decoder reset) */}
      <video
        ref={setRemoteVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: peerScreenSharing ? "contain" : "cover",
          backgroundColor: "#0a0c10",
          opacity: showRemoteVideo ? 1 : 0,
          pointerEvents: showRemoteVideo ? "auto" : "none",
          transition: "opacity 0.2s ease-in-out",
          zIndex: 1,
        }}
      />

      {/* 2. Remote Camera Disabled / Audio-Only Fallback Stage */}
      {!showRemoteVideo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            textAlign: "center",
            background:
              "radial-gradient(circle at center, #181d27 0%, #0d1017 60%, #07080b 100%)",
            zIndex: 2,
          }}
        >
          <div style={{ transform: "scale(0.9)" }}>
            <CallAvatar src={avatar} name={title} size="lg" pulse={!isHeld} />
          </div>
          <p
            style={{
              marginTop: "12px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
              maxWidth: "80%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.08)",
              fontSize: "11px",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {isHeld ? (
              <>
                <Pause style={{ width: 12, height: 12, color: "#f59e0b" }} />
                <span>Call on hold</span>
              </>
            ) : isVideo && !peerMedia?.video ? (
              <>
                <VideoOff style={{ width: 12, height: 12, color: "#f59e0b" }} />
                <span>Camera is off</span>
              </>
            ) : (
              <>
                <Volume2 style={{ width: 12, height: 12, color: "#10b981" }} />
                <span>Audio connected</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Floating Local Participant Thumbnail (Top-Right: 100px × 76px) */}
      {isVideo && (localStream || screenStream) && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "100px",
            height: "76px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
            zIndex: 10,
          }}
        >
          <video
            ref={setLocalVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: isScreenSharing ? "contain" : "cover",
              transform: isScreenSharing ? "none" : "scaleX(-1)",
              display: isLocalCameraActive || isScreenSharing ? "block" : "none",
            }}
          />

          {/* Local Camera Disabled Thumbnail State */}
          {!isLocalCameraActive && !isScreenSharing && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#181d27",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <VideoOff style={{ width: 16, height: 16, color: "#f59e0b" }} />
              <span style={{ fontSize: "9px", marginTop: "2px", fontWeight: 600 }}>
                You
              </span>
            </div>
          )}

          {isScreenSharing && (
            <div
              style={{
                position: "absolute",
                bottom: "3px",
                left: "3px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.75)",
                padding: "1px 4px",
                fontSize: "9px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              Screen
            </div>
          )}
        </div>
      )}

      {/* 4. Minimal Professional Header Overlay (Top-Left) */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            borderRadius: "9999px",
            background: "rgba(10, 12, 16, 0.75)",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#ffffff",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: qualityDotColor,
              boxShadow: `0 0 8px ${qualityDotColor}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              maxWidth: "110px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
          <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
            {formatCallTimer(seconds)}
          </span>
        </div>

        {/* Screen Share or Hold Status Pill */}
        {peerScreenSharing && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "9999px",
              background: "rgba(14, 165, 233, 0.9)",
              padding: "2px 8px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#ffffff",
              backdropFilter: "blur(8px)",
              alignSelf: "flex-start",
            }}
          >
            <ScreenShare style={{ width: 11, height: 11 }} />
            <span>Sharing Screen</span>
          </div>
        )}

        {isHeld && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "9999px",
              background: "rgba(245, 158, 11, 0.95)",
              padding: "2px 8px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#000000",
              backdropFilter: "blur(8px)",
              alignSelf: "flex-start",
            }}
          >
            <Pause style={{ width: 11, height: 11 }} />
            <span>{holdNotice || "On Hold"}</span>
          </div>
        )}
      </div>

      {/* Close button for in-app fallback mode */}
      {!isNativePip && onClosePip && (
        <button
          type="button"
          onClick={onClosePip}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            color: "rgba(255,255,255,0.8)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 15,
          }}
          title="Close mini overlay"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      )}

      {/* 5. Professional Bottom Floating Control Bar */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          paddingBottom: "12px",
          paddingTop: "24px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          zIndex: 10,
        }}
      >
        {/* 1. Microphone Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`pip-control-btn ${muted ? "danger" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            border: muted
              ? "1px solid #ef4444"
              : "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: muted ? "#dc2626" : "rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          title={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? (
            <MicOff style={{ width: 16, height: 16 }} />
          ) : (
            <Mic style={{ width: 16, height: 16 }} />
          )}
        </button>

        {/* 2. Camera Toggle (only for video calls) */}
        {isVideo && (
          <button
            type="button"
            onClick={onToggleCamera}
            className={`pip-control-btn ${cameraOff ? "warning" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "9999px",
              border: cameraOff
                ? "1px solid #f59e0b"
                : "1px solid rgba(255, 255, 255, 0.2)",
              backgroundColor: cameraOff
                ? "#d97706"
                : "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            title={cameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {cameraOff ? (
              <VideoOff style={{ width: 16, height: 16 }} />
            ) : (
              <Video style={{ width: 16, height: 16 }} />
            )}
          </button>
        )}

        {/* 3. Return to Full Call / Expand */}
        <button
          type="button"
          onClick={onReturnToFullCall}
          className="pip-control-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          title="Return to full call"
        >
          <Maximize2 style={{ width: 16, height: 16 }} />
        </button>

        {/* 4. End Call Button */}
        <button
          type="button"
          onClick={onEndCall}
          className="pip-control-btn danger"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            border: "1px solid #ef4444",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
          }}
          title="End call"
        >
          <PhoneOff style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
