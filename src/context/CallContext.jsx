import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import soundService from "../services/soundService";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  RESOLUTION_PRESETS,
  applyResolutionPreset,
  getAdaptiveResolutionPreset,
} from "../lib/videoManager";
import { VideoStreamProcessor } from "../lib/videoProcessor";
import { ScreenShareManager, SCREEN_SHARE_STATE } from "../lib/screenShareManager";
import {
  LiveCaptionService,
  isSpeechRecognitionSupported,
  CAPTION_LANGUAGES,
} from "../lib/liveCaptions";
import { NetworkQualityMonitor } from "../lib/networkMonitor";
import { customToast as toast } from "../components/toast/customToastService";

const DEFAULT_ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  { urls: ["stun:stun.cloudflare.com:3478"] },
];

if (import.meta?.env?.VITE_TURN_URL) {
  DEFAULT_ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL.split(",").map((u) => u.trim()),
    username: import.meta.env.VITE_TURN_USER || undefined,
    credential: import.meta.env.VITE_TURN_PASS || undefined,
  });
}

const normalizeSdp = (desc) => {
  if (!desc || typeof desc.sdp !== "string") return desc;

  const sdp =
    desc.sdp
      .replace(/\\r\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\r\n") + "\r\n";

  return { type: desc.type, sdp };
};

const plainDesc = (desc) => ({ type: desc.type, sdp: desc.sdp });

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

const initialState = {
  status: "idle", // idle | calling | ringing | connecting | connected | reconnecting
  callId: null,
  peer: null,
  type: "audio", // audio | video
  direction: null, // incoming | outgoing
  error: "",
  silenced: false,
};

export function CallProvider({ socket, children }) {
  const [state, setState] = useState(initialState);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [peerMedia, setPeerMedia] = useState({ audio: true, video: true });
  const [seconds, setSeconds] = useState(0);

  const authUser = useAuthStore((s) => s.authUser);
  const authUserId = authUser?._id || authUser?.id;

  // Advanced calling states
  const [isHeld, setIsHeld] = useState(false);
  const [heldBy, setHeldBy] = useState(null); // 'me' | 'peer' | null
  const [holdOwnerId, setHoldOwnerId] = useState(null);
  const [holdNotice, setHoldNotice] = useState(""); // 'Call on hold' | 'Other participant put the call on hold' | 'Call resumed'
  const [isHoldTransitioning, setIsHoldTransitioning] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [waitingCall, setWaitingCall] = useState(null); // { callId, peer, type, avatar }
  const [networkQuality, setNetworkQuality] = useState("good"); // excellent | good | weak | poor | reconnecting
  const [stats, setStats] = useState({ rtt: 0, packetLoss: 0, jitter: 0, bitrate: 0 });

  // Audio Device Routing
  const [audioInputs, setAudioInputs] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");
  const [supportsSetSinkId, setSupportsSetSinkId] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  // Video Device & Controls
  const [videoInputs, setVideoInputs] = useState([]);
  const [selectedVideoInput, setSelectedVideoInput] = useState("");
  const [facingMode, setFacingMode] = useState("user");
  const [mirrorLocal, setMirrorLocal] = useState(true);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Video Resolution & Bandwidth
  const [resolutionPreset, setResolutionPreset] = useState("720p");
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  // Video Effects (Backgrounds, Filters, AR)
  const [backgroundEffect, setBackgroundEffect] = useState("none");
  const [videoFilter, setVideoFilter] = useState("none");
  const [arEffect, setArEffect] = useState("none");
  const [customBackgroundImage, setCustomBackgroundImage] = useState(null);

  // Screen Sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [screenShareState, setScreenShareState] = useState(SCREEN_SHARE_STATE.IDLE);
  const [screenStream, setScreenStream] = useState(null);
  const [hasScreenAudio, setHasScreenAudio] = useState(false);

  // Live Emoji Reactions
  const [incomingReactions, setIncomingReactions] = useState([]);

  // Live Captions & Translation
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionSourceLang, setCaptionSourceLang] = useState("en-US");
  const [captionTargetLang, setCaptionTargetLang] = useState("en");
  const [activeCaption, setActiveCaption] = useState(null);
  const [captionHistory, setCaptionHistory] = useState([]);

  // Background Segmentation & Processor Status
  const [processorStatus, setProcessorStatus] = useState("idle");
  const [processorMessage, setProcessorMessage] = useState("");

  // Dynamic ICE servers
  const [dynamicIceServers, setDynamicIceServers] = useState(DEFAULT_ICE_SERVERS);

  const stateRef = useRef(state);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const rawCameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenShareManagerRef = useRef(null);
  if (!screenShareManagerRef.current) {
    screenShareManagerRef.current = new ScreenShareManager({
      onStateChange: (st) => setScreenShareState(st),
      onAudioMixed: (has) => setHasScreenAudio(has),
    });
  }
  const videoProcessorRef = useRef(new VideoStreamProcessor());

  useEffect(() => {
    videoProcessorRef.current.onStatusChange = (status, msg) => {
      setProcessorStatus(status);
      setProcessorMessage(msg);
    };
  }, []);
  const liveCaptionServiceRef = useRef(null);
  const networkMonitorRef = useRef(null);
  const lowBandwidthModeRef = useRef(lowBandwidthMode);
  lowBandwidthModeRef.current = lowBandwidthMode;

  const pendingIce = useRef([]);
  const remoteSet = useRef(false);
  const lastStateVersion = useRef(0);
  const mutedRef = useRef(false);
  const holdNoticeTimeoutRef = useRef(null);
  const remoteTrackListenersRef = useRef([]);
  const isAcquiringVideoRef = useRef(false);
  const [remoteTracksVersion, setRemoteTracksVersion] = useState(0);

  // Picture-in-Picture refs & state
  const pipWindowRef = useRef(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const isDocPipSupported =
    typeof window !== "undefined" &&
    Boolean(window.documentPictureInPicture?.requestWindow);

  // Fetch dynamic ICE servers from backend on mount
  useEffect(() => {
    let isMounted = true;
    axiosInstance
      .get("/calls/ice-servers")
      .then((res) => {
        const iceList = Array.isArray(res.data?.data?.iceServers)
          ? res.data.data.iceServers
          : Array.isArray(res.data?.data)
          ? res.data.data
          : null;
        if (isMounted && iceList && iceList.length > 0) {
          setDynamicIceServers(iceList);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Check browser capability for setSinkId
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSupportsSetSinkId(
        typeof HTMLMediaElement !== "undefined" &&
          typeof HTMLMediaElement.prototype.setSinkId === "function",
      );
    }
  }, []);

  // Enumerate audio input and output devices
  const refreshAudioDevices = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }));
      const outputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
        }));

      setAudioInputs(inputs);
      setAudioOutputs(outputs);
      if (inputs.length && !selectedAudioInput) {
        setSelectedAudioInput(inputs[0].deviceId);
      }
      if (outputs.length && !selectedAudioOutput) {
        setSelectedAudioOutput(outputs[0].deviceId);
      }
    } catch (e) {
      console.warn("[call] enumerateDevices failed:", e);
    }
  }, [selectedAudioInput, selectedAudioOutput]);

  // Enumerate video devices
  const refreshVideoDevices = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setVideoInputs(vInputs);
      if (vInputs.length && !selectedVideoInput) {
        setSelectedVideoInput(vInputs[0].deviceId);
      }
    } catch (e) {
      console.warn("[call] enumerate video devices failed:", e);
    }
  }, [selectedVideoInput]);

  // Listen for audio / video hardware changes (headset plug/unplug, bluetooth)
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.addEventListener
    ) {
      return;
    }
    const handleDeviceChange = () => {
      refreshAudioDevices();
      refreshVideoDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [refreshAudioDevices, refreshVideoDevices]);

  const checkCameraCapabilities = useCallback((videoTrack) => {
    if (!videoTrack || typeof videoTrack.getCapabilities !== "function") return;
    try {
      const caps = videoTrack.getCapabilities();
      setSupportsZoom(Boolean(caps.zoom));
      setSupportsTorch(Boolean(caps.torch));
    } catch { /* ignore */ }
  }, []);

  const setCall = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  const cleanup = useCallback((error = "") => {
    // 1. Dispose screen share manager and stop screen tracks before closing peer connection
    screenShareManagerRef.current?.dispose();
    screenStreamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch { /* ignore */ }
    });
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setPeerScreenSharing(false);
    setScreenStream(null);
    setHasScreenAudio(false);

    // 2. Stop video processor and raw camera stream
    videoProcessorRef.current?.stop();
    rawCameraStreamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch { /* ignore */ }
    });
    rawCameraStreamRef.current = null;

    // 3. Close peer connection and stop local tracks
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;

    // 4. Other services
    liveCaptionServiceRef.current?.stop();
    networkMonitorRef.current?.stop();

    // Detach and clean up all remote track listeners
    remoteTrackListenersRef.current.forEach(({ track, type, listener }) => {
      try {
        track.removeEventListener(type, listener);
      } catch { /* ignore */ }
    });
    remoteTrackListenersRef.current = [];

    // 5. Close Picture-in-Picture window if active
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.close();
      } catch { /* ignore */ }
    }
    pipWindowRef.current = null;
    setIsPipActive(false);

    pendingIce.current = [];
    remoteSet.current = false;

    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    mutedRef.current = false;
    setCameraOff(false);
    setPeerMedia({ audio: true, video: true });
    setSeconds(0);
    setIsHeld(false);
    setHeldBy(null);
    setHoldOwnerId(null);
    setHoldNotice("");
    setIsHoldTransitioning(false);
    setHoldSeconds(0);
    lastStateVersion.current = 0;
    if (holdNoticeTimeoutRef.current) {
      clearTimeout(holdNoticeTimeoutRef.current);
      holdNoticeTimeoutRef.current = null;
    }
    setNetworkQuality("good");
    setStats({ rtt: 0, packetLoss: 0, jitter: 0, bitrate: 0 });

    setIsScreenSharing(false);
    setPeerScreenSharing(false);
    setActiveCaption(null);
    setIncomingReactions([]);
    setTorchOn(false);

    stateRef.current = { ...initialState, error };
    setState(stateRef.current);
  }, []);

  const getMedia = useCallback(
    async (type, audioDeviceId = null, videoDeviceId = null, customPreset = null) => {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (audioDeviceId) {
        audioConstraints.deviceId = { exact: audioDeviceId };
      }

      const preset =
        RESOLUTION_PRESETS[customPreset || resolutionPreset] ||
        RESOLUTION_PRESETS["720p"];
      const videoConstraints =
        type === "video"
          ? {
              width: { ideal: preset.width },
              height: { ideal: preset.height },
              frameRate: { ideal: preset.frameRate, max: preset.frameRate },
              facingMode: videoDeviceId ? undefined : facingMode,
              ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}),
            }
          : false;

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });
      } catch (err) {
        if (type === "video") {
          console.warn(
            "[call] Video acquire failed, falling back to audio only:",
            err?.message || err,
          );
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
          setCameraOff(true);
        } else {
          throw err;
        }
      }

      // Attach device disconnect listeners for graceful hardware unplug handling
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.onended = () => {
          console.warn("[call] Local camera track ended (device unplugged/disconnected)");
          setCameraOff(true);
          socket?.emit("call:media", {
            callId: stateRef.current.callId,
            audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
            video: false,
          });
        };
      }

      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.onended = () => {
          console.warn("[call] Local microphone track ended (device unplugged/disconnected)");
          setMuted(true);
          mutedRef.current = true;
          socket?.emit("call:media", {
            callId: stateRef.current.callId,
            audio: false,
            video: localRef.current?.getVideoTracks()[0]?.enabled ?? false,
          });
        };
      }

      rawCameraStreamRef.current = stream;
      localRef.current = stream;
      setLocalStream(stream);
      refreshAudioDevices();
      refreshVideoDevices();
      checkCameraCapabilities(vTrack);
      return stream;
    },
    [
      resolutionPreset,
      facingMode,
      refreshAudioDevices,
      refreshVideoDevices,
      checkCameraCapabilities,
    ],
  );

  const createPeer = useCallback(() => {
    // Clean up existing peer connection if one is lingering
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch { /* ignore */ }
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers: dynamicIceServers });
    pcRef.current = pc;

    localRef.current
      ?.getTracks()
      .forEach((t) => pc.addTrack(t, localRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate && stateRef.current.callId) {
        socket?.emit("call:ice", {
          callId: stateRef.current.callId,
          candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const receivedTrack = e.track;
      const streamFromEvent = e.streams && e.streams[0] ? e.streams[0] : null;

      if (!remoteStreamRef.current) {
        // Case A: event.streams has a stream
        // Case B: event.streams is empty -> initialize a persistent MediaStream
        remoteStreamRef.current = streamFromEvent || new MediaStream();
      }

      // Add track to persistent stream if not already present (prevent duplicate track additions)
      const currentTracks = remoteStreamRef.current.getTracks();
      const alreadyHasTrack = currentTracks.some((t) => t.id === receivedTrack.id);
      if (!alreadyHasTrack) {
        try {
          remoteStreamRef.current.addTrack(receivedTrack);
        } catch (err) {
          console.warn("[call:webrtc] Error adding track to remote stream:", err);
        }
      }

      // If streamFromEvent has additional tracks not yet in remoteStreamRef, merge them
      if (streamFromEvent && streamFromEvent !== remoteStreamRef.current) {
        streamFromEvent.getTracks().forEach((t) => {
          if (!remoteStreamRef.current.getTracks().some((existing) => existing.id === t.id)) {
            try {
              remoteStreamRef.current.addTrack(t);
            } catch { /* ignore */ }
          }
        });
      }

      // Synchronize track events to trigger React re-renders without thrashing MediaStream instances
      const syncTrackState = () => {
        setRemoteTracksVersion((v) => v + 1);
      };

      receivedTrack.addEventListener("ended", syncTrackState);
      receivedTrack.addEventListener("mute", syncTrackState);
      receivedTrack.addEventListener("unmute", syncTrackState);
      remoteTrackListenersRef.current.push({ track: receivedTrack, type: "ended", listener: syncTrackState });
      remoteTrackListenersRef.current.push({ track: receivedTrack, type: "mute", listener: syncTrackState });
      remoteTrackListenersRef.current.push({ track: receivedTrack, type: "unmute", listener: syncTrackState });

      // Publish the stable MediaStream reference to React consumers
      setRemoteStream(remoteStreamRef.current);
      setRemoteTracksVersion((v) => v + 1);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCall({ status: "connected" });
        setNetworkQuality("good");

        // Start Network Quality Monitor with Hysteresis
        networkMonitorRef.current?.stop();
        networkMonitorRef.current = new NetworkQualityMonitor({
          pc,
          onQualityChange: (quality) => {
            setNetworkQuality(quality);
            if (stateRef.current.type === "video") {
              const adaptivePreset = getAdaptiveResolutionPreset(
                quality,
                lowBandwidthModeRef.current,
              );
              setResolutionPreset(adaptivePreset);
              const vTrack = localRef.current?.getVideoTracks()[0];
              const sender = pc
                .getSenders()
                .find((s) => s.track && s.track.kind === "video");
              applyResolutionPreset(vTrack, sender, adaptivePreset);
            }
          },
          onStatsUpdate: (newStats) => {
            setStats(newStats);
          },
        });
        networkMonitorRef.current.start();
      }
      if (pc.connectionState === "failed") {
        const { callId } = stateRef.current;
        if (callId) socket?.emit("call:end", { callId });
        cleanup("Connection failed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "disconnected" || iceState === "failed") {
        setCall({ status: "reconnecting" });
        setNetworkQuality("reconnecting");
        // Trigger ICE restart from caller side
        if (stateRef.current.direction === "outgoing") {
          remoteSet.current = false;
          pc.createOffer({ iceRestart: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              socket?.emit("call:offer", {
                callId: stateRef.current.callId,
                offer: plainDesc(pc.localDescription),
              });
            })
            .catch((e) => {
              remoteSet.current = true;
              console.warn("[call] iceRestart failed:", e);
            });
        }
      } else if (iceState === "connected" || iceState === "completed") {
        setCall({ status: "connected" });
      }
    };

    return pc;
  }, [socket, setCall, cleanup, dynamicIceServers]);

  const flushIce = useCallback(async () => {
    remoteSet.current = true;
    for (const c of pendingIce.current) {
      try {
        await pcRef.current?.addIceCandidate(c);
      } catch { /* ignore */ }
    }
    pendingIce.current = [];
  }, []);

  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (stateRef.current.status !== "idle") return;
      const targetId = typeof peer === "string" ? peer : peer?.id || peer?._id;
      if (!targetId) {
        console.warn("[call] startCall invoked without valid target ID");
        return;
      }
      const targetName =
        typeof peer === "object"
          ? peer?.fullName || peer?.name || "User"
          : "User";
      const targetAvatar = typeof peer === "object" ? peer?.avatar || "" : "";

      setCall({
        ...initialState,
        status: "calling",
        peer: { id: targetId, name: targetName, avatar: targetAvatar },
        type,
        direction: "outgoing",
      });

      try {
        await getMedia(type, selectedAudioInput || null);
      } catch {
        cleanup("Microphone/camera permission denied");
        return;
      }

      socket?.emit("call:invite", { to: targetId, type }, (res) => {
        if (!res?.ok) {
          const msg =
            {
              offline: "User is offline",
              busy: "User is busy on another call",
              "not-allowed": "You can't call this user",
            }[res?.reason] || "Call failed";
          cleanup(msg);
          return;
        }
        setCall({ callId: res.callId });
      });
    },
    [socket, getMedia, selectedAudioInput, setCall, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const { callId, type } = stateRef.current;
    if (!callId) return;
    try {
      await getMedia(type, selectedAudioInput || null);
    } catch {
      socket?.emit("call:reject", { callId });
      cleanup("Microphone/camera permission denied");
      return;
    }
    setCall({ status: "connecting" });
    createPeer();
    socket?.emit("call:accept", { callId });
  }, [socket, getMedia, selectedAudioInput, createPeer, setCall, cleanup]);

  const rejectCall = useCallback(
    async (reason = "rejected", declineMessage = "") => {
      const { callId, peer } = stateRef.current;
      if (callId) {
        socket?.emit("call:reject", { callId, reason });
      }

      if (declineMessage && peer?.id) {
        try {
          await axiosInstance.post(`/messages/send/${peer.id}`, {
            text: declineMessage,
          });
        } catch (err) {
          console.warn("[call] decline message failed:", err);
        }
      }

      cleanup();
    },
    [socket, cleanup],
  );

  const endCall = useCallback(() => {
    const { callId } = stateRef.current;
    if (callId) socket?.emit("call:end", { callId });
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    mutedRef.current = nextMuted;

    const applyTrackMute = (stream) => {
      stream?.getAudioTracks().forEach((t) => {
        if (!isHeld) {
          t.enabled = !nextMuted;
        }
      });
    };
    applyTrackMute(localRef.current);
    applyTrackMute(rawCameraStreamRef.current);

    socket?.emit("call:media", {
      callId: stateRef.current.callId,
      audio: !nextMuted,
      video: localRef.current?.getVideoTracks()[0]?.enabled ?? false,
    });
  }, [socket, muted, isHeld]);

  const toggleCamera = useCallback(async () => {
    if (isAcquiringVideoRef.current) return;
    const track =
      rawCameraStreamRef.current?.getVideoTracks()[0] ||
      localRef.current?.getVideoTracks()[0];

    if (!track) {
      // Camera was not acquired during fallback or permissions were initially denied.
      // Re-acquire camera stream now.
      isAcquiringVideoRef.current = true;
      try {
        const preset =
          RESOLUTION_PRESETS[resolutionPreset] ||
          RESOLUTION_PRESETS["720p"];
        const videoConstraints = {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.frameRate, max: preset.frameRate },
          facingMode,
        };

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) {
          toast.error("Could not activate camera.");
          return;
        }

        if (rawCameraStreamRef.current) {
          rawCameraStreamRef.current.addTrack(newVideoTrack);
        } else {
          rawCameraStreamRef.current = newStream;
        }

        if (localRef.current) {
          localRef.current.addTrack(newVideoTrack);
        } else {
          localRef.current = newStream;
        }

        if (pcRef.current) {
          const videoSender = pcRef.current
            .getSenders()
            .find(
              (s) =>
                (s.track && s.track.kind === "video") ||
                (!s.track && s.kind === "video"),
            );

          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          } else {
            pcRef.current.addTrack(newVideoTrack, localRef.current);
            try {
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);
              socket?.emit("call:offer", {
                callId: stateRef.current.callId,
                offer: plainDesc(offer),
              });
            } catch (negErr) {
              console.warn(
                "[call] renegotiation after camera enable failed:",
                negErr,
              );
            }
          }
        }

        if (screenShareManagerRef.current && isScreenSharing) {
          screenShareManagerRef.current.originalCameraTrack = newVideoTrack;
        }
        setLocalStream(new MediaStream(localRef.current.getTracks()));
        setCameraOff(false);
        checkCameraCapabilities(newVideoTrack);
        refreshVideoDevices();

        if (!isScreenSharing) {
          socket?.emit("call:media", {
            callId: stateRef.current.callId,
            audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
            video: true,
          });
        }
      } catch (err) {
        console.warn("[call] Failed to activate camera:", err);
        toast.error("Camera access was denied or device is busy.");
      } finally {
        isAcquiringVideoRef.current = false;
      }
      return;
    }

    track.enabled = !track.enabled;
    const isNowOff = !track.enabled;
    setCameraOff(isNowOff);
    if (screenShareManagerRef.current) {
      screenShareManagerRef.current.wasCameraEnabled = !isNowOff;
    }
    const processedTrack = videoProcessorRef.current?.processedStream?.getVideoTracks()[0];
    if (processedTrack) {
      processedTrack.enabled = track.enabled;
    }
    if (!isScreenSharing) {
      socket?.emit("call:media", {
        callId: stateRef.current.callId,
        audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
        video: track.enabled,
      });
    }
  }, [
    socket,
    isScreenSharing,
    resolutionPreset,
    facingMode,
    checkCameraCapabilities,
    refreshVideoDevices,
  ]);

  // Video Resolution & Bandwidth Controls
  const setResolution = useCallback(
    async (presetKey) => {
      setResolutionPreset(presetKey);
      if (!localRef.current || !pcRef.current) return;
      const vTrack = localRef.current.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      await applyResolutionPreset(vTrack, sender, presetKey);
    },
    [],
  );

  const toggleLowBandwidthMode = useCallback(async () => {
    const nextMode = !lowBandwidthMode;
    setLowBandwidthMode(nextMode);
    const targetPreset = nextMode ? "360p" : "720p";
    await setResolution(targetPreset);
  }, [lowBandwidthMode, setResolution]);

  // Video Device Switching & Controls
  const switchVideoInput = useCallback(
    async (deviceId) => {
      setSelectedVideoInput(deviceId);
      if (!pcRef.current || stateRef.current.type !== "video") return;
      try {
        const preset = RESOLUTION_PRESETS[resolutionPreset] || RESOLUTION_PRESETS["720p"];
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: preset.width },
            height: { ideal: preset.height },
            frameRate: { ideal: preset.frameRate },
          },
          audio: false,
        });

        const newTrack = newStream.getVideoTracks()[0];
        if (newTrack) {
          newTrack.enabled = !cameraOff;
          newTrack.onended = () => {
            console.warn("[call] Local switched camera track ended (device unplugged/disconnected)");
            setCameraOff(true);
            socket?.emit("call:media", {
              callId: stateRef.current.callId,
              audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
              video: false,
            });
          };
        }
        const oldTrack = rawCameraStreamRef.current?.getVideoTracks()[0];
        if (oldTrack) {
          rawCameraStreamRef.current?.removeTrack(oldTrack);
          oldTrack.stop();
        }
        if (newTrack) {
          rawCameraStreamRef.current?.addTrack(newTrack);
          checkCameraCapabilities(newTrack);
        }

        // If processor running, update processor; otherwise replace track directly
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (screenShareManagerRef.current && isScreenSharing) {
          screenShareManagerRef.current.originalCameraTrack = newTrack;
        }

        if (videoProcessorRef.current.isRunning) {
          videoProcessorRef.current.switchSource(rawCameraStreamRef.current);
        } else if (sender && !isScreenSharing && newTrack) {
          await sender.replaceTrack(newTrack);
          const updatedStream = new MediaStream([
            ...(localRef.current?.getAudioTracks() || []),
            newTrack,
          ]);
          localRef.current = updatedStream;
          setLocalStream(updatedStream);
        }
      } catch (err) {
        console.error("[call] failed to switch camera:", err);
      }
    },
    [resolutionPreset, checkCameraCapabilities, isScreenSharing, cameraOff],
  );

  const toggleFacingMode = useCallback(async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (!pcRef.current || stateRef.current.type !== "video") return;
    try {
      const preset = RESOLUTION_PRESETS[resolutionPreset] || RESOLUTION_PRESETS["720p"];
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextMode },
          width: { ideal: preset.width },
          height: { ideal: preset.height },
        },
        audio: false,
      });

      const newTrack = newStream.getVideoTracks()[0];
      if (newTrack) {
        newTrack.enabled = !cameraOff;
        newTrack.onended = () => {
          console.warn("[call] Local facing-mode camera track ended (device unplugged/disconnected)");
          setCameraOff(true);
          socket?.emit("call:media", {
            callId: stateRef.current.callId,
            audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
            video: false,
          });
        };
      }
      const oldTrack = rawCameraStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();

      rawCameraStreamRef.current = new MediaStream([
        ...(rawCameraStreamRef.current?.getAudioTracks() || []),
        ...(newTrack ? [newTrack] : []),
      ]);

      if (screenShareManagerRef.current && isScreenSharing) {
        screenShareManagerRef.current.originalCameraTrack = newTrack;
      }

      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (videoProcessorRef.current.isRunning) {
        videoProcessorRef.current.switchSource(rawCameraStreamRef.current);
      } else if (!isScreenSharing && newTrack) {
        if (sender) await sender.replaceTrack(newTrack);
        localRef.current = rawCameraStreamRef.current;
        setLocalStream(rawCameraStreamRef.current);
      }
    } catch (err) {
      console.warn("[call] flip camera failed:", err);
    }
  }, [facingMode, resolutionPreset, isScreenSharing, cameraOff]);

  const toggleMirrorLocal = useCallback(() => {
    setMirrorLocal((m) => !m);
  }, []);

  const setZoom = useCallback(async (level) => {
    setZoomLevel(level);
    const track = rawCameraStreamRef.current?.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === "function") {
      try {
        await track.applyConstraints({ advanced: [{ zoom: level }] });
      } catch { /* ignore */ }
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const nextTorch = !torchOn;
    setTorchOn(nextTorch);
    const track = rawCameraStreamRef.current?.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === "function") {
      try {
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
      } catch { /* ignore */ }
    }
  }, [torchOn]);

  // Video Effects (Background blur/virtual, Color filters, AR stickers)
  const setVideoEffects = useCallback(
    async ({ background, filter, ar, customImage } = {}) => {
      if (background !== undefined) setBackgroundEffect(background);
      if (filter !== undefined) setVideoFilter(filter);
      if (ar !== undefined) setArEffect(ar);
      if (customImage !== undefined) setCustomBackgroundImage(customImage);

      const targetBg = background !== undefined ? background : backgroundEffect;
      const targetFilter = filter !== undefined ? filter : videoFilter;
      const targetAr = ar !== undefined ? ar : arEffect;

      const hasAnyEffect =
        targetBg !== "none" || targetFilter !== "none" || targetAr !== "none";

      const processor = videoProcessorRef.current;
      if (customImage !== undefined) {
        processor.setCustomBackground(customImage);
      }
      processor.setEffects({
        background: targetBg,
        filter: targetFilter,
        ar: targetAr,
      });

      if (!rawCameraStreamRef.current) return;

      const sender = pcRef.current
        ? pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video")
        : null;
      const rawTrack = rawCameraStreamRef.current.getVideoTracks()[0];

      if (hasAnyEffect) {
        let processedTrack = processor.processedStream?.getVideoTracks()[0];
        if (!processedTrack || !processor.isRunning) {
          processedTrack = processor.start(rawCameraStreamRef.current);
        }
        if (processedTrack) {
          processedTrack.enabled = !cameraOff;
          if (screenShareManagerRef.current && isScreenSharing) {
            screenShareManagerRef.current.originalCameraTrack = processedTrack;
          } else {
            if (sender) await sender.replaceTrack(processedTrack);
            const newStream = new MediaStream([
              ...(rawCameraStreamRef.current.getAudioTracks() || []),
              processedTrack,
            ]);
            localRef.current = newStream;
            setLocalStream(newStream);
          }
        }
      } else {
        processor.stop();
        if (rawTrack) {
          if (screenShareManagerRef.current && isScreenSharing) {
            screenShareManagerRef.current.originalCameraTrack = rawTrack;
          } else {
            if (sender) await sender.replaceTrack(rawTrack);
            localRef.current = rawCameraStreamRef.current;
            setLocalStream(rawCameraStreamRef.current);
          }
        }
      }
    },
    [backgroundEffect, videoFilter, arEffect, isScreenSharing, cameraOff],
  );

  // Screen Sharing
  const stopScreenShare = useCallback(async () => {
    const activeCameraTrack = videoProcessorRef.current.isRunning
      ? videoProcessorRef.current.processedStream?.getVideoTracks()[0]
      : rawCameraStreamRef.current?.getVideoTracks()[0];

    await screenShareManagerRef.current?.stop(activeCameraTrack);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch { /* ignore */ }
      });
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);
    setHasScreenAudio(false);

    socket?.emit("call:screenshare", {
      callId: stateRef.current.callId,
      isSharing: false,
    });

    if (rawCameraStreamRef.current) {
      const restoredVideoTrack =
        activeCameraTrack || rawCameraStreamRef.current.getVideoTracks()[0];
      if (restoredVideoTrack) {
        restoredVideoTrack.enabled = !cameraOff;
      }
      const restoredTracks = [
        ...(rawCameraStreamRef.current.getAudioTracks() || []),
        ...(restoredVideoTrack ? [restoredVideoTrack] : []),
      ];
      const restoredStream = new MediaStream(restoredTracks);
      localRef.current = restoredStream;
      setLocalStream(restoredStream);
    }
  }, [socket, cameraOff]);

  const startScreenShare = useCallback(async () => {
    if (!ScreenShareManager.isSupported()) {
      toast.error("Screen sharing is not supported in this browser or requires HTTPS.");
      return false;
    }
    if (!pcRef.current || stateRef.current.status !== "connected") {
      toast.error("You must be connected to an active call to share your screen.");
      return false;
    }

    try {
      const senders = pcRef.current.getSenders();
      let videoSender =
        senders.find((s) => s.track && s.track.kind === "video") ||
        pcRef.current
          .getTransceivers?.()
          ?.find(
            (t) =>
              t.sender &&
              (t.sender.track?.kind === "video" ||
                t.receiver?.track?.kind === "video"),
          )?.sender ||
        senders.find((s) => !s.track || s.track.kind === "video");

      let addedTransceiver = false;
      if (!videoSender && typeof pcRef.current.addTransceiver === "function") {
        try {
          const tc = pcRef.current.addTransceiver("video", {
            direction: "sendrecv",
          });
          videoSender = tc.sender;
          addedTransceiver = true;
        } catch { /* ignore */ }
      }

      const audioSender =
        senders.find((s) => s.track && s.track.kind === "audio") ||
        pcRef.current
          .getTransceivers?.()
          ?.find(
            (t) =>
              t.sender &&
              (t.sender.track?.kind === "audio" ||
                t.receiver?.track?.kind === "audio"),
          )?.sender;

      if (!videoSender) {
        toast.error("Unable to find video sender for screen sharing.");
        return false;
      }

      if (addedTransceiver) {
        try {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket?.emit("call:offer", {
            callId: stateRef.current.callId,
            offer: plainDesc(offer),
          });
        } catch (negErr) {
          console.warn("[call] screen share renegotiation failed:", negErr);
        }
      }

      const activeCameraTrack = videoProcessorRef.current.isRunning
        ? videoProcessorRef.current.processedStream?.getVideoTracks()[0]
        : rawCameraStreamRef.current?.getVideoTracks()[0];
      const activeMicTrack =
        rawCameraStreamRef.current?.getAudioTracks()[0] ||
        localRef.current?.getAudioTracks()[0];

      const res = await screenShareManagerRef.current.start({
        videoSenders: [videoSender],
        audioSenders: audioSender ? [audioSender] : [],
        currentCameraTrack: activeCameraTrack,
        currentMicTrack: activeMicTrack,
        isCameraEnabled: !cameraOff,
        onEnded: () => {
          stopScreenShare();
        },
      });

      if (!res.ok) {
        if (!res.cancelled) {
          toast.error(res.error || "Failed to start screen sharing.");
        }
        return false;
      }

      screenStreamRef.current = res.stream;
      setScreenStream(res.stream);
      setIsScreenSharing(true);
      setHasScreenAudio(Boolean(res.hasAudio));

      // Local preview updates to screen share + mic
      const localTracks = [
        res.stream.getVideoTracks()[0],
        ...(rawCameraStreamRef.current?.getAudioTracks() ||
          localRef.current?.getAudioTracks() ||
          []),
      ];
      setLocalStream(new MediaStream(localTracks));

      socket?.emit("call:screenshare", {
        callId: stateRef.current.callId,
        isSharing: true,
      });

      return true;
    } catch (err) {
      console.warn("[call] screen sharing error:", err);
      toast.error("Failed to start screen sharing.");
      return false;
    }
  }, [socket, cameraOff, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // Live Emoji Reactions
  const sendReaction = useCallback(
    (reaction) => {
      if (!stateRef.current.callId || !socket) return;
      socket.emit("call:reaction", {
        callId: stateRef.current.callId,
        reaction,
      });
      const id = Date.now() + Math.random();
      setIncomingReactions((prev) => [
        ...prev,
        { id, reaction, senderName: "You", x: 40 + Math.random() * 20 },
      ]);
      setTimeout(() => {
        setIncomingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2800);
    },
    [socket],
  );

  // Live Captions & Translation
  const toggleCaptions = useCallback(() => {
    if (captionsEnabled) {
      liveCaptionServiceRef.current?.stop();
      setCaptionsEnabled(false);
      setActiveCaption(null);
    } else {
      if (!isSpeechRecognitionSupported()) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
      }
      if (!liveCaptionServiceRef.current) {
        liveCaptionServiceRef.current = new LiveCaptionService({
          onTranscript: ({ speaker, text, isFinal }) => {
            setActiveCaption({
              speaker,
              text,
              isFinal,
              timestamp: Date.now(),
            });
            socket?.emit("call:caption", {
              callId: stateRef.current.callId,
              text,
              isFinal,
              sourceLang: captionSourceLang,
            });
            if (isFinal) {
              setCaptionHistory((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  speaker,
                  text,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }
          },
          onStatusChange: (listening) => {
            setCaptionsEnabled(listening);
          },
        });
      }
      liveCaptionServiceRef.current.setLanguages(
        captionSourceLang,
        captionTargetLang,
      );
      const ok = liveCaptionServiceRef.current.start();
      if (ok) setCaptionsEnabled(true);
    }
  }, [captionsEnabled, socket, captionSourceLang, captionTargetLang]);

  const setCaptionLanguages = useCallback((sourceBcp47, targetCode) => {
    setCaptionSourceLang(sourceBcp47);
    setCaptionTargetLang(targetCode);
    if (liveCaptionServiceRef.current) {
      liveCaptionServiceRef.current.setLanguages(sourceBcp47, targetCode);
    }
  }, []);

  const exportTranscript = useCallback(() => {
    if (!captionHistory.length) {
      toast("No captions to export yet.");
      return;
    }
    const content = captionHistory
      .map((entry) => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Chatty-Transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [captionHistory]);

  const clearTranscript = useCallback(() => {
    setCaptionHistory([]);
    setActiveCaption(null);
    liveCaptionServiceRef.current?.clearHistory();
    toast("Transcript cleared.");
  }, []);

  // Picture-in-Picture
  const closePip = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.close();
      } catch { /* ignore */ }
    }
    pipWindowRef.current = null;
    setIsPipActive(false);
  }, []);

  const requestNativePip = useCallback(async (options = {}) => {
    if (
      typeof window !== "undefined" &&
      window.documentPictureInPicture?.requestWindow
    ) {
      try {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.focus();
          return pipWindowRef.current;
        }

        const width = options.width || 440;
        const height = options.height || 320;
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width,
          height,
        });
        pipWindowRef.current = pipWindow;
        setIsPipActive(true);

        pipWindow.addEventListener("pagehide", () => {
          setIsPipActive(false);
          pipWindowRef.current = null;
        });

        return pipWindow;
      } catch (err) {
        console.warn("[call] documentPictureInPicture failed:", err);
      }
    }
    return null;
  }, []);

  // Audio Device Selection
  const switchAudioInput = useCallback(
    async (deviceId) => {
      setSelectedAudioInput(deviceId);
      if (!localRef.current || !pcRef.current) return;
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        const newTrack = newStream.getAudioTracks()[0];
        // Ensure newTrack preserves current mute state and hold state
        if (newTrack) {
          newTrack.enabled = !isHeld && !mutedRef.current;
        }

        const oldTrack = localRef.current.getAudioTracks()[0];
        if (oldTrack) {
          localRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        if (newTrack) {
          localRef.current.addTrack(newTrack);
        }

        if (rawCameraStreamRef.current) {
          const rawOldAudio = rawCameraStreamRef.current.getAudioTracks()[0];
          if (rawOldAudio) {
            rawCameraStreamRef.current.removeTrack(rawOldAudio);
          }
          if (newTrack) {
            rawCameraStreamRef.current.addTrack(newTrack);
          }
        }
        if (screenShareManagerRef.current && isScreenSharing) {
          screenShareManagerRef.current.originalMicTrack = newTrack;
        }
        setLocalStream(new MediaStream(localRef.current.getTracks()));

        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "audio");
        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
        }
      } catch (err) {
        console.error("[call] failed to switch microphone:", err);
      }
    },
    [isHeld],
  );

  const switchAudioOutput = useCallback(async (deviceId, mediaElement = null) => {
    setSelectedAudioOutput(deviceId);
    if (mediaElement && typeof mediaElement.setSinkId === "function") {
      try {
        await mediaElement.setSinkId(deviceId);
      } catch (err) {
        console.warn("[call] setSinkId failed:", err);
      }
    }
  }, []);

  const toggleSpeaker = useCallback(
    (mediaElement = null) => {
      const nextSpeakerState = !speakerOn;
      setSpeakerOn(nextSpeakerState);
      if (audioOutputs.length > 1) {
        const targetDevice = nextSpeakerState
          ? audioOutputs[1]?.deviceId || audioOutputs[0]?.deviceId
          : audioOutputs[0]?.deviceId;
        switchAudioOutput(targetDevice, mediaElement);
      }
    },
    [speakerOn, audioOutputs, switchAudioOutput],
  );

  // Hold / Resume
  const holdCall = useCallback(() => {
    const { callId } = stateRef.current;
    if (!callId || isHoldTransitioning) return;
    setIsHoldTransitioning(true);
    socket?.emit("call:hold", { callId }, (res) => {
      setIsHoldTransitioning(false);
      if (!res?.ok && res?.reason !== "already-held") {
        console.warn("[call] hold failed:", res?.reason);
      }
    });
  }, [socket, isHoldTransitioning]);

  const resumeCall = useCallback(() => {
    const { callId } = stateRef.current;
    if (!callId || isHoldTransitioning) return;

    // Check hold ownership on client before emitting
    const currentOwner = holdOwnerId;
    const isOwner =
      heldBy === "me" ||
      (currentOwner && String(currentOwner) === String(authUserId));
    if (isHeld && !isOwner) {
      console.warn("[call] Unauthorized resume attempt: not hold owner");
      setHoldNotice("Only the participant who placed this call on hold can resume it.");
      return;
    }

    setIsHoldTransitioning(true);
    socket?.emit("call:resume", { callId }, (res) => {
      setIsHoldTransitioning(false);
      if (!res?.ok) {
        if (res?.reason === "HOLD_OWNER_ONLY") {
          setHoldNotice(
            res?.message ||
              "Only the participant who placed this call on hold can resume it.",
          );
        } else if (res?.reason !== "already-active") {
          console.warn("[call] resume failed:", res?.reason);
        }
      }
    });
  }, [socket, isHoldTransitioning, isHeld, heldBy, holdOwnerId, authUserId]);

  // Call Waiting Actions
  const acceptWaitingCall = useCallback(async () => {
    if (!waitingCall) return;
    const newCall = { ...waitingCall };
    setWaitingCall(null);

    // Clean up current active call
    cleanup();

    // Transition to accepting the waiting call
    setCall({
      ...initialState,
      status: "connecting",
      callId: newCall.callId,
      peer: newCall.peer,
      type: newCall.type || "audio",
      direction: "incoming",
    });

    try {
      await getMedia(newCall.type || "audio", selectedAudioInput || null);
    } catch {
      socket?.emit("call:reject", { callId: newCall.callId });
      cleanup("Microphone permission denied");
      return;
    }

    createPeer();
    socket?.emit("call:accept", { callId: newCall.callId });
  }, [waitingCall, cleanup, setCall, getMedia, selectedAudioInput, createPeer, socket]);

  const rejectWaitingCall = useCallback(
    (reason = "busy") => {
      if (!waitingCall) return;
      socket?.emit("call:reject", { callId: waitingCall.callId, reason });
      setWaitingCall(null);
    },
    [waitingCall, socket],
  );

  useEffect(() => {
    if (!socket) return;

    const failCall = (err, msg) => {
      console.error(msg, err);
      const { callId } = stateRef.current;
      if (callId) socket.emit("call:end", { callId });
      cleanup(msg);
    };

    const onIncoming = ({ callId, from, fromName, type, silenced, avatar }) => {
      if (stateRef.current.status !== "idle") return;
      setCall({
        ...initialState,
        status: "ringing",
        callId,
        peer: { id: from, name: fromName, avatar },
        type,
        direction: "incoming",
        silenced: Boolean(silenced),
      });

      // Browser vibration if supported, not silenced, and user activation exists
      if (
        !silenced &&
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        if (!navigator.userActivation || navigator.userActivation.hasBeenActive) {
          try {
            navigator.vibrate([200, 100, 200, 100, 400]);
          } catch { /* ignore */ }
        }
      }
    };

    const onWaiting = ({ callId, from, fromName, type, avatar }) => {
      setWaitingCall({
        callId,
        peer: { id: from, name: fromName, avatar },
        type,
        avatar,
      });
      // Gentle vibration for waiting call
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        if (!navigator.userActivation || navigator.userActivation.hasBeenActive) {
          try {
            navigator.vibrate([100, 150, 100]);
          } catch { /* ignore */ }
        }
      }
    };

    const onAccepted = async ({ callId }) => {
      if (callId !== stateRef.current.callId) return;
      try {
        setCall({ status: "connecting" });
        const pc = createPeer();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", { callId, offer: plainDesc(offer) });
      } catch (err) {
        failCall(err, "Could not start call");
      }
    };

    const onOffer = async ({ callId, offer }) => {
      if (callId !== stateRef.current.callId || !pcRef.current) return;
      try {
        const pc = pcRef.current;
        const isPolite = stateRef.current.direction === "incoming";
        const offerCollision = pc.signalingState !== "stable";
        if (offerCollision) {
          if (!isPolite) {
            console.warn("[call] Glare detected on impolite peer: ignoring incoming offer");
            return;
          }
          await pc.setLocalDescription({ type: "rollback" });
          await pc.setRemoteDescription(normalizeSdp(offer));
        } else {
          await pc.setRemoteDescription(normalizeSdp(offer));
        }
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { callId, answer: plainDesc(answer) });
      } catch (err) {
        failCall(err, "Call setup failed");
      }
    };

    const onAnswer = async ({ callId, answer }) => {
      if (callId !== stateRef.current.callId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(normalizeSdp(answer));
        await flushIce();
      } catch (err) {
        failCall(err, "Call setup failed");
      }
    };

    const onIce = async ({ callId, candidate }) => {
      if (callId !== stateRef.current.callId) return;
      if (!pcRef.current || !remoteSet.current) {
        pendingIce.current.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch { /* ignore */ }
    };

    const onHeld = ({
      callId,
      heldBy: actorId,
      holdOwnerId: ownerId,
      stateVersion,
    }) => {
      if (callId !== stateRef.current.callId) return;
      if (stateVersion && stateVersion < lastStateVersion.current) return;
      if (stateVersion) lastStateVersion.current = stateVersion;

      const resolvedOwnerId = ownerId || actorId;
      const isMe = String(resolvedOwnerId) === String(authUserId);
      setIsHeld(true);
      setHoldOwnerId(resolvedOwnerId);
      setHeldBy(isMe ? "me" : "peer");
      setHoldNotice(
        isMe
          ? "Call on hold"
          : "Call placed on hold by the other participant",
      );
      if (holdNoticeTimeoutRef.current) {
        clearTimeout(holdNoticeTimeoutRef.current);
        holdNoticeTimeoutRef.current = null;
      }

      // Mute local microphone tracks
      const muteAll = (stream) => {
        stream?.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      };
      muteAll(localRef.current);
      muteAll(rawCameraStreamRef.current);
    };

    const onResumed = ({ callId, resumedBy: _actorId, stateVersion }) => {
      if (callId !== stateRef.current.callId) return;
      if (stateVersion && stateVersion < lastStateVersion.current) return;
      if (stateVersion) lastStateVersion.current = stateVersion;

      setIsHeld(false);
      setHeldBy(null);
      setHoldOwnerId(null);
      setHoldNotice("Call resumed");
      if (holdNoticeTimeoutRef.current) {
        clearTimeout(holdNoticeTimeoutRef.current);
      }
      holdNoticeTimeoutRef.current = setTimeout(() => {
        setHoldNotice("");
        holdNoticeTimeoutRef.current = null;
      }, 2500);

      // Restore local microphone tracks respecting prior mute choice
      const restoreAll = (stream) => {
        stream?.getAudioTracks().forEach((t) => {
          t.enabled = !mutedRef.current;
        });
      };
      restoreAll(localRef.current);
      restoreAll(rawCameraStreamRef.current);
    };

    const onState = ({
      callId,
      state: lifecycleState,
      isHeld: stateHeld,
      heldBy: stateHeldBy,
      holdOwnerId: stateHoldOwnerId,
      stateVersion,
      activeDurationSec,
    }) => {
      if (callId !== stateRef.current.callId) return;
      if (stateVersion && stateVersion < lastStateVersion.current) return;
      if (stateVersion) lastStateVersion.current = stateVersion;

      if (stateHeld) {
        const resolvedOwnerId = stateHoldOwnerId || stateHeldBy;
        const isMe = String(resolvedOwnerId) === String(authUserId);
        setIsHeld(true);
        setHoldOwnerId(resolvedOwnerId);
        setHeldBy(isMe ? "me" : "peer");
        setHoldNotice(
          isMe
            ? "Call on hold"
            : "Call placed on hold by the other participant",
        );
        const muteAll = (stream) => {
          stream?.getAudioTracks().forEach((t) => {
            t.enabled = false;
          });
        };
        muteAll(localRef.current);
        muteAll(rawCameraStreamRef.current);
      } else if (lifecycleState === "active" || lifecycleState === "accepted") {
        setIsHeld((prev) => {
          if (prev) {
            setHeldBy(null);
            setHoldOwnerId(null);
            setHoldNotice("Call resumed");
            if (holdNoticeTimeoutRef.current) clearTimeout(holdNoticeTimeoutRef.current);
            holdNoticeTimeoutRef.current = setTimeout(() => {
              setHoldNotice("");
              holdNoticeTimeoutRef.current = null;
            }, 2500);
            const restoreAll = (stream) => {
              stream?.getAudioTracks().forEach((t) => {
                t.enabled = !mutedRef.current;
              });
            };
            restoreAll(localRef.current);
            restoreAll(rawCameraStreamRef.current);
          }
          return false;
        });
      }

      if (typeof activeDurationSec === "number" && activeDurationSec >= 0) {
        setSeconds((s) => Math.max(s, activeDurationSec));
      }
    };

    const onSocketConnect = () => {
      const currentCallId = stateRef.current.callId;
      if (
        currentCallId &&
        (stateRef.current.status === "connected" ||
          stateRef.current.status === "reconnecting")
      ) {
        socket.emit("call:get-state", { callId: currentCallId }, (res) => {
          if (res?.ok && res?.callState) {
            onState(res.callState);
          }
        });
      }
    };

    const onReconnect = async ({ callId }) => {
      if (callId !== stateRef.current.callId || !pcRef.current) return;
      setCall({ status: "reconnecting" });
      setNetworkQuality("reconnecting");
    };

    const onEnded = ({ callId, status, reason }) => {
      if (callId === waitingCall?.callId) {
        setWaitingCall(null);
        return;
      }
      if (callId !== stateRef.current.callId) return;
      const msg =
        status === "rejected"
          ? reason === "busy"
            ? "User is busy"
            : reason === "declined-with-message"
              ? "Call declined with message"
              : "Call declined"
          : status === "missed"
            ? "No answer"
            : reason === "disconnected"
              ? "Call disconnected"
              : "";
      cleanup(msg);
    };

    const onAnsweredElsewhere = ({ callId }) => {
      if (callId === waitingCall?.callId) {
        setWaitingCall(null);
        return;
      }
      if (callId !== stateRef.current.callId) return;
      if (stateRef.current.direction === "incoming" && !pcRef.current) {
        cleanup();
      }
    };

    const onMedia = ({ callId, audio, video }) => {
      if (callId !== stateRef.current.callId) return;
      setPeerMedia({ audio, video });
    };

    const onReaction = ({ callId, senderId, reaction }) => {
      if (callId !== stateRef.current.callId) return;
      const senderName =
        String(senderId) === String(stateRef.current.peer?.id)
          ? stateRef.current.peer?.name || "Peer"
          : "Someone";
      const id = Date.now() + Math.random();
      setIncomingReactions((prev) => [
        ...prev,
        { id, reaction, senderName, x: 25 + Math.random() * 50 },
      ]);
      setTimeout(() => {
        setIncomingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2800);
    };

    const onCaption = ({ callId, text, isFinal }) => {
      if (callId !== stateRef.current.callId) return;
      const senderName = stateRef.current.peer?.name || "Peer";
      setActiveCaption({ speaker: senderName, text, isFinal, timestamp: Date.now() });
      if (isFinal) {
        setCaptionHistory((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            speaker: senderName,
            text,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    const onScreenshare = ({ callId, isSharing }) => {
      if (callId !== stateRef.current.callId) return;
      setPeerScreenSharing(Boolean(isSharing));
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:waiting", onWaiting);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:held", onHeld);
    socket.on("call:resumed", onResumed);
    socket.on("call:state", onState);
    socket.on("call:reconnect", onReconnect);
    socket.on("call:ended", onEnded);
    socket.on("call:answered-elsewhere", onAnsweredElsewhere);
    socket.on("call:media", onMedia);
    socket.on("call:reaction", onReaction);
    socket.on("call:caption", onCaption);
    socket.on("call:screenshare", onScreenshare);
    socket.on("connect", onSocketConnect);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:waiting", onWaiting);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:held", onHeld);
      socket.off("call:resumed", onResumed);
      socket.off("call:state", onState);
      socket.off("call:reconnect", onReconnect);
      socket.off("call:ended", onEnded);
      socket.off("call:answered-elsewhere", onAnsweredElsewhere);
      socket.off("call:media", onMedia);
      socket.off("call:reaction", onReaction);
      socket.off("call:caption", onCaption);
      socket.off("call:screenshare", onScreenshare);
      socket.off("connect", onSocketConnect);
    };
  }, [socket, createPeer, flushIce, setCall, cleanup, waitingCall, authUserId]);

  // Duration Timer (Ticks only when connected and NOT held)
  useEffect(() => {
    if (state.status !== "connected" || isHeld) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.status, isHeld]);

  // Hold Duration Timer (Ticks when connected and IS held)
  useEffect(() => {
    if (state.status !== "connected" || !isHeld) {
      setHoldSeconds(0);
      return;
    }
    const t = setInterval(() => setHoldSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.status, isHeld]);

  // WebRTC Stats Monitoring (RTT, Jitter, Packet Loss, Bitrate)
  useEffect(() => {
    if (state.status !== "connected" || !pcRef.current) return;
    const pc = pcRef.current;

    let prevPacketsLost = 0;
    let prevPacketsReceived = 0;

    const interval = setInterval(async () => {
      if (!pc || pc.signalingState === "closed") return;
      try {
        const reportMap = await pc.getStats();
        let rtt = 0;
        let jitter = 0;
        let currentPacketsLost = 0;
        let currentPacketsReceived = 0;
        let bitrate = 0;

        reportMap.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            rtt = (report.currentRoundTripTime || 0) * 1000;
            if (report.availableOutgoingBitrate) {
              bitrate = Math.round(report.availableOutgoingBitrate / 1000);
            }
          }
          if (report.type === "inbound-rtp" && report.kind === "audio") {
            currentPacketsLost = report.packetsLost || 0;
            currentPacketsReceived = report.packetsReceived || 0;
            jitter = (report.jitter || 0) * 1000;
          }
        });

        const deltaLost = Math.max(0, currentPacketsLost - prevPacketsLost);
        const deltaReceived = Math.max(0, currentPacketsReceived - prevPacketsReceived);
        const totalDelta = deltaLost + deltaReceived;
        const lossPercent = totalDelta > 0 ? (deltaLost / totalDelta) * 100 : 0;

        prevPacketsLost = currentPacketsLost;
        prevPacketsReceived = currentPacketsReceived;

        setStats({
          rtt: Math.round(rtt),
          packetLoss: Math.round(lossPercent),
          jitter: Math.round(jitter),
          bitrate,
        });

        let quality = "good";
        if (rtt < 100 && lossPercent < 1.5) quality = "excellent";
        else if (rtt < 250 && lossPercent < 4) quality = "good";
        else if (rtt < 450 && lossPercent < 9) quality = "weak";
        else quality = "poor";

        setNetworkQuality(quality);
      } catch { /* ignore */ }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.status]);

  // Synchronize ringtone audio lifecycle
  useEffect(() => {
    const { status, direction, silenced } = state;

    if (status === "calling" && direction === "outgoing") {
      soundService.playCalling();
    } else if (status === "ringing" && direction === "incoming" && !silenced) {
      soundService.playReceiving();
    } else {
      soundService.stopAllCallSounds();
    }

    return () => {
      soundService.stopAllCallSounds();
    };
  }, [state]);

  // Toast / error clearing
  useEffect(() => {
    if (!state.error) return;
    const t = setTimeout(() => setCall({ error: "" }), 3500);
    return () => clearTimeout(t);
  }, [state.error, setCall]);

  // Clean unmount / tab close
  useEffect(() => {
    const onUnload = () => {
      const { callId } = stateRef.current;
      if (callId) socket?.emit("call:end", { callId });
      localRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch { /* ignore */ }
      });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      localRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch { /* ignore */ }
      });
    };
  }, [socket]);

  const isHoldOwner = Boolean(
    isHeld &&
      (heldBy === "me" ||
        (holdOwnerId && String(holdOwnerId) === String(authUserId))),
  );
  const canResume = !isHeld || isHoldOwner;

  const value = useMemo(
    () => ({
      ...state,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      peerMedia,
      seconds,
      isHeld,
      heldBy,
      holdOwnerId,
      isHoldOwner,
      canResume,
      holdNotice,
      isHoldTransitioning,
      holdSeconds,
      waitingCall,
      networkQuality,
      stats,
      audioInputs,
      audioOutputs,
      selectedAudioInput,
      selectedAudioOutput,
      supportsSetSinkId,
      speakerOn,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchAudioInput,
      switchAudioOutput,
      toggleSpeaker,
      holdCall,
      resumeCall,
      acceptWaitingCall,
      rejectWaitingCall,

      // Video Resolution & Bandwidth
      resolutionPreset,
      setResolution,
      lowBandwidthMode,
      toggleLowBandwidthMode,

      // Video Effects
      backgroundEffect,
      videoFilter,
      arEffect,
      customBackgroundImage,
      setVideoEffects,
      processorStatus,
      processorMessage,

      // Screen Sharing
      isScreenSharing,
      peerScreenSharing,
      screenShareState,
      screenStream,
      hasScreenAudio,
      startScreenShare,
      stopScreenShare,
      toggleScreenShare,

      // Live Emoji Reactions
      incomingReactions,
      sendReaction,

      // Live Captions & Translation
      captionsEnabled,
      captionSourceLang,
      captionTargetLang,
      activeCaption,
      captionHistory,
      toggleCaptions,
      setCaptionLanguages,
      exportTranscript,
      clearTranscript,

      // Camera Controls
      videoInputs,
      selectedVideoInput,
      facingMode,
      mirrorLocal,
      supportsZoom,
      zoomLevel,
      supportsTorch,
      torchOn,
      switchVideoInput,
      toggleFacingMode,
      toggleMirrorLocal,
      setZoom,
      toggleTorch,

      // Picture-in-Picture
      requestNativePip,
      closePip,
      isPipActive,
      setIsPipActive,
      isDocPipSupported,
      pipWindowRef,
      remoteTracksVersion,
    }),
    [
      state,
      localStream,
      remoteStream,
      remoteTracksVersion,
      muted,
      cameraOff,
      peerMedia,
      seconds,
      isHeld,
      heldBy,
      holdOwnerId,
      isHoldOwner,
      canResume,
      holdNotice,
      isHoldTransitioning,
      holdSeconds,
      waitingCall,
      networkQuality,
      stats,
      audioInputs,
      audioOutputs,
      selectedAudioInput,
      selectedAudioOutput,
      supportsSetSinkId,
      speakerOn,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchAudioInput,
      switchAudioOutput,
      toggleSpeaker,
      holdCall,
      resumeCall,
      acceptWaitingCall,
      rejectWaitingCall,
      resolutionPreset,
      setResolution,
      lowBandwidthMode,
      toggleLowBandwidthMode,
      backgroundEffect,
      videoFilter,
      arEffect,
      customBackgroundImage,
      setVideoEffects,
      processorStatus,
      processorMessage,
      isScreenSharing,
      peerScreenSharing,
      screenShareState,
      screenStream,
      hasScreenAudio,
      startScreenShare,
      stopScreenShare,
      toggleScreenShare,
      incomingReactions,
      sendReaction,
      captionsEnabled,
      captionSourceLang,
      captionTargetLang,
      activeCaption,
      captionHistory,
      toggleCaptions,
      setCaptionLanguages,
      exportTranscript,
      clearTranscript,
      videoInputs,
      selectedVideoInput,
      facingMode,
      mirrorLocal,
      supportsZoom,
      zoomLevel,
      supportsTorch,
      torchOn,
      switchVideoInput,
      toggleFacingMode,
      toggleMirrorLocal,
      setZoom,
      toggleTorch,
      requestNativePip,
      closePip,
      isPipActive,
      isDocPipSupported,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
