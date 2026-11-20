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

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
if (import.meta?.env?.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta?.env?.VITE_TURN_URL,
    username: import.meta?.env?.VITE_TURN_USER,
    credential: import.meta?.env?.VITE_TURN_PASS,
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
  status: "idle",
  callId: null,
  peer: null,
  type: "audio",
  direction: null,
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

  const stateRef = useRef(state);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const pendingIce = useRef([]);
  const remoteSet = useRef(false);

  const setCall = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  const cleanup = useCallback((error = "") => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    remoteSet.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setPeerMedia({ audio: true, video: true });
    setSeconds(0);

    stateRef.current = { ...initialState, error };
    setState(stateRef.current);
  }, []);

  const getMedia = useCallback(async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: type === "video" ? { facingMode: "user" } : false,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    localRef.current
      ?.getTracks()
      .forEach((t) => pc.addTrack(t, localRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate && stateRef.current.callId) {
        socket.emit("call:ice", {
          callId: stateRef.current.callId,
          candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate,
        });
      }
    };

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCall({ status: "connected" });
      if (pc.connectionState === "failed") {
        const { callId } = stateRef.current;
        if (callId) socket.emit("call:end", { callId });
        cleanup("Connection failed");
      }
    };

    return pc;
  }, [socket, setCall, cleanup]);

  const flushIce = useCallback(async () => {
    remoteSet.current = true;
    for (const c of pendingIce.current) {
      try {
        await pcRef.current?.addIceCandidate(c);
      } catch {}
    }
    pendingIce.current = [];
  }, []);

  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (stateRef.current.status !== "idle") return;
      setCall({
        ...initialState,
        status: "calling",
        peer: { id: peer.id, name: peer.fullName },
        type,
        direction: "outgoing",
      });

      try {
        await getMedia(type);
      } catch {
        cleanup("Microphone/camera permission denied");
        return;
      }

      socket.emit("call:invite", { to: peer.id, type }, (res) => {
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
    [socket, getMedia, setCall, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const { callId, type } = stateRef.current;
    if (!callId) return;
    try {
      await getMedia(type);
    } catch {
      socket.emit("call:reject", { callId });
      cleanup("Microphone/camera permission denied");
      return;
    }
    setCall({ status: "connecting" });
    createPeer();
    socket.emit("call:accept", { callId });
  }, [socket, getMedia, createPeer, setCall, cleanup]);

  const rejectCall = useCallback(() => {
    const { callId } = stateRef.current;
    if (callId) socket.emit("call:reject", { callId });
    cleanup();
  }, [socket, cleanup]);

  const endCall = useCallback(() => {
    const { callId } = stateRef.current;
    if (callId) socket.emit("call:end", { callId });
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
    socket.emit("call:media", {
      callId: stateRef.current.callId,
      audio: track.enabled,
      video: localRef.current?.getVideoTracks()[0]?.enabled ?? false,
    });
  }, [socket]);

  const toggleCamera = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
    socket.emit("call:media", {
      callId: stateRef.current.callId,
      audio: localRef.current?.getAudioTracks()[0]?.enabled ?? true,
      video: track.enabled,
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const failCall = (err, msg) => {
      console.error(msg, err);
      const { callId } = stateRef.current;
      if (callId) socket.emit("call:end", { callId });
      cleanup(msg);
    };

    const onIncoming = ({ callId, from, fromName, type, silenced }) => {
      if (stateRef.current.status !== "idle") return;
      setCall({
        ...initialState,
        status: "ringing",
        callId,
        peer: { id: from, name: fromName },
        type,
        direction: "incoming",
        silenced: Boolean(silenced),
      });
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
        await pc.setRemoteDescription(normalizeSdp(offer));
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
      } catch {}
    };

    const onEnded = ({ callId, status, reason }) => {
      if (callId !== stateRef.current.callId) return;
      const msg =
        status === "rejected"
          ? "Call declined"
          : status === "missed"
            ? "No answer"
            : reason === "disconnected"
              ? "Call disconnected"
              : "";
      cleanup(msg);
    };

    const onAnsweredElsewhere = ({ callId }) => {
      if (callId !== stateRef.current.callId) return;
      if (stateRef.current.direction === "incoming" && !pcRef.current) {
        cleanup();
      }
    };

    const onMedia = ({ callId, audio, video }) => {
      if (callId !== stateRef.current.callId) return;
      setPeerMedia({ audio, video });
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:ended", onEnded);
    socket.on("call:answered-elsewhere", onAnsweredElsewhere);
    socket.on("call:media", onMedia);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:ended", onEnded);
      socket.off("call:answered-elsewhere", onAnsweredElsewhere);
      socket.off("call:media", onMedia);
    };
  }, [socket, createPeer, flushIce, setCall, cleanup]);

  useEffect(() => {
    if (state.status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.status]);

  // Synchronize ringtone audio lifecycle (outgoing calling vs incoming receiving)
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
  }, [state.status, state.direction, state.silenced]);

  useEffect(() => {
    if (!state.error) return;
    const t = setTimeout(() => setCall({ error: "" }), 3500);
    return () => clearTimeout(t);
  }, [state.error, setCall]);

  useEffect(() => {
    const onUnload = () => {
      const { callId } = stateRef.current;
      if (callId) socket?.emit("call:end", { callId });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [socket]);

  const value = useMemo(
    () => ({
      ...state,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      peerMedia,
      seconds,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
    }),
    [
      state,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      peerMedia,
      seconds,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
