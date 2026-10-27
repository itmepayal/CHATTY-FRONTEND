// src/context/CallContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* ---------- ICE servers ----------
   Production mein TURN zaroori hai (mobile data / strict NAT ke liye).
   .env (Vite):
     VITE_TURN_URL=turn:your.turn.server:3478
     VITE_TURN_USER=username
     VITE_TURN_PASS=password
*/
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USER,
    credential: import.meta.env.VITE_TURN_PASS,
  });
}

const CallContext = createContext(null);
export const useCall = () => useContext(CallContext);

const initialState = {
  status: "idle", // idle | calling | ringing | connecting | connected
  callId: null,
  peer: null, // { id, name }
  type: "audio",
  direction: null, // outgoing | incoming
  error: "",
};

export function CallProvider({ socket, children }) {
  const [state, setState] = useState(initialState);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [peerMedia, setPeerMedia] = useState({ audio: true, video: true });
  const [seconds, setSeconds] = useState(0);

  // refs: socket handlers mein stale state se bachne ke liye
  const stateRef = useRef(state);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const pendingIce = useRef([]);
  const remoteSet = useRef(false);

  const setCall = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  /* ---------- cleanup ---------- */
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

  /* ---------- media ---------- */
  const getMedia = useCallback(async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: type === "video" ? { facingMode: "user" } : false,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  /* ---------- peer connection ---------- */
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
          candidate: e.candidate,
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
      } catch {
        /* ignore */
      }
    }
    pendingIce.current = [];
  }, []);

  /* ---------- public actions ---------- */
  const startCall = useCallback(
    async (peer, type = "audio") => {
      if (stateRef.current.status !== "idle") return;
      // peer = { id, fullName }
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
    createPeer(); // pehle peer ready, phir accept
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

  /* ---------- socket events ---------- */
  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ callId, from, fromName, type }) => {
      // already busy? server pehle hi rok deta hai, yeh extra safety hai
      if (stateRef.current.status !== "idle") return;
      setCall({
        ...initialState,
        status: "ringing",
        callId,
        peer: { id: from, name: fromName },
        type,
        direction: "incoming",
      });
    };

    // caller side: receiver ne accept kiya -> offer banao
    const onAccepted = async ({ callId }) => {
      if (callId !== stateRef.current.callId) return;
      setCall({ status: "connecting" });
      const pc = createPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:offer", { callId, offer });
    };

    // receiver side
    const onOffer = async ({ callId, offer }) => {
      if (callId !== stateRef.current.callId || !pcRef.current) return;
      const pc = pcRef.current;
      await pc.setRemoteDescription(offer);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { callId, answer });
    };

    // caller side
    const onAnswer = async ({ callId, answer }) => {
      if (callId !== stateRef.current.callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      await flushIce();
    };

    const onIce = async ({ callId, candidate }) => {
      if (callId !== stateRef.current.callId) return;
      if (!pcRef.current || !remoteSet.current) {
        pendingIce.current.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
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

  /* ---------- call timer ---------- */
  useEffect(() => {
    if (state.status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.status]);

  /* ---------- error auto-clear ---------- */
  useEffect(() => {
    if (!state.error) return;
    const t = setTimeout(() => setCall({ error: "" }), 3500);
    return () => clearTimeout(t);
  }, [state.error, setCall]);

  /* ---------- tab close => end call ---------- */
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
