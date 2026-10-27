import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";
import {
  ICE_SERVERS,
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
} from "../lib/webrtc.js";

const pcs = new Map();
const pendingIce = new Map();
const remoteStreams = new Map();
let localStream = null;

const REASONS = {
  invalid: "Couldn't start the call.",
  "not-member": "You're not a member of this group.",
  busy: "You're already in another call.",
  active: "A call is already running in this group.",
  "no-call": "This call has already ended.",
  "already-joined": "You're already in this call on another device.",
  full: "This call is full (max 6 people).",
  unavailable: "This call is no longer available.",
  offline: "You're offline. Check your connection.",
  timeout: "The server didn't respond. Try again.",
  error: "Something went wrong. Try again.",
};

const getSocket = () => useAuthStore.getState().socket;

const emitAck = (event, payload) =>
  new Promise((resolve) => {
    const socket = getSocket();
    if (!socket?.connected) return resolve({ ok: false, reason: "offline" });
    socket.timeout(8000).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, reason: "timeout" } : res || { ok: false });
    });
  });

const sendSignal = (callId, to, data) =>
  getSocket()?.emit("gcall:signal", { callId, to, data });

const emitMediaState = () => {
  const { callId, micOn, camOn } = useGroupCallStore.getState();
  if (callId)
    getSocket()?.emit("gcall:media", {
      callId,
      audio: micOn,
      video: camOn,
    });
};

const hasVideoTrack = (stream) => Boolean(stream?.getVideoTracks().length);

const acquireMedia = async (type) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast.error("Calls need a secure (https) connection.");
    return null;
  }

  const attempt = (video) =>
    navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: video ? VIDEO_CONSTRAINTS : false,
    });

  try {
    return await attempt(type === "video");
  } catch (err) {
    if (type === "video") {
      try {
        const stream = await attempt(false);
        toast("Camera unavailable — joining with audio only.");
        return stream;
      } catch (err2) {
        err = err2;
      }
    }
    if (err?.name === "NotAllowedError")
      toast.error("Allow microphone access in your browser to join calls.");
    else if (err?.name === "NotFoundError")
      toast.error("No microphone found on this device.");
    else if (err?.name === "NotReadableError")
      toast.error("Your microphone is being used by another app.");
    else toast.error("Couldn't access your microphone.");
    return null;
  }
};

/* ---- peers ---- */
const patchPeer = (userId, patch) =>
  useGroupCallStore.setState((s) => {
    if (s.status === "idle") return s;
    const base = s.peers[userId] || {
      userId,
      fullName: "User",
      avatar: "",
      audio: true,
      video: true,
      conn: "new",
      stream: null,
    };
    return { peers: { ...s.peers, [userId]: { ...base, ...patch } } };
  });

const closePeer = (userId) => {
  const pc = pcs.get(userId);
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
    pcs.delete(userId);
  }
  pendingIce.delete(userId);
  remoteStreams.delete(userId);
};

const createPeer = (userId, callId) => {
  closePeer(userId);

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pcs.set(userId, pc);

  // add tracks BEFORE offer/answer so they're negotiated in the same round
  localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (!e.candidate || pcs.get(userId) !== pc) return;
    sendSignal(callId, userId, { candidate: e.candidate.toJSON() });
  };

  pc.ontrack = (e) => {
    if (pcs.get(userId) !== pc) return;
    let stream = e.streams[0];
    if (!stream) {
      stream = remoteStreams.get(userId) || new MediaStream();
      stream.addTrack(e.track);
    }
    remoteStreams.set(userId, stream);
    patchPeer(userId, { stream });
  };

  pc.onconnectionstatechange = () => {
    if (pcs.get(userId) !== pc) return;
    const conn = pc.connectionState;
    patchPeer(userId, { conn });

    if (conn === "connected") {
      useGroupCallStore.setState((s) =>
        s.status === "idle"
          ? s
          : { status: "connected", connectedAt: s.connectedAt || Date.now() },
      );
    }
    if (conn === "failed") {
      const name =
        useGroupCallStore.getState().peers[userId]?.fullName || "a participant";
      toast.error(`Lost connection with ${name}. A TURN server may be needed.`);
    }
  };

  return pc;
};

// the JOINER calls this for every peer already in the call
const offerTo = async (userId, callId) => {
  const pc = createPeer(userId, callId);

  // joined with audio only but the call is video: still RECEIVE video
  if (
    useGroupCallStore.getState().type === "video" &&
    !hasVideoTrack(localStream)
  ) {
    pc.addTransceiver("video", { direction: "recvonly" });
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendSignal(callId, userId, {
    description: {
      type: pc.localDescription.type,
      sdp: pc.localDescription.sdp,
    },
  });
};

const flushIce = async (userId) => {
  const pc = pcs.get(userId);
  const list = pendingIce.get(userId) || [];
  pendingIce.delete(userId);
  if (!pc) return;
  for (const c of list) {
    try {
      await pc.addIceCandidate(c);
    } catch {
      /* stale candidate */
    }
  }
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */
const idleState = {
  status: "idle", // idle | calling | connecting | connected
  callId: null,
  groupId: null,
  groupName: "",
  type: null, // "audio" | "video"
  localStream: null,
  peers: {}, // userId -> { userId, fullName, avatar, stream, audio, video, conn }
  micOn: true,
  camOn: false,
  connectedAt: null,
};

export const useGroupCallStore = create((set, get) => ({
  ...idleState,

  incoming: null, // { callId, groupId, groupName, type, starter }
  activeByGroup: {}, // groupId -> { callId, type, count, joined }

  /* ---- teardown (keeps incoming / activeByGroup) ---- */
  reset: () => {
    [...pcs.keys()].forEach(closePeer);
    pcs.clear();
    pendingIce.clear();
    remoteStreams.clear();
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    set({ ...idleState });
  },

  /* ---- start a call ---- */
  startCall: async (groupId, type, groupName = "") => {
    if (get().status !== "idle") return;
    const gid = String(groupId);

    set({
      ...idleState,
      status: "calling",
      groupId: gid,
      groupName,
      type,
      incoming: null,
    });

    const media = await acquireMedia(type);
    if (!media) return get().reset();
    if (get().status === "idle") {
      media.getTracks().forEach((t) => t.stop()); // cancelled while waiting
      return;
    }
    localStream = media;
    set({ localStream: media, micOn: true, camOn: hasVideoTrack(media) });

    const res = await emitAck("gcall:start", { groupId: gid, type });

    // user hung up while we were waiting for the server
    if (get().status === "idle" || get().groupId !== gid) {
      if (res?.ok) getSocket()?.emit("gcall:leave", { callId: res.callId });
      return;
    }

    if (!res?.ok) {
      if (res.reason === "active" && res.callId) {
        set((s) => ({
          activeByGroup: {
            ...s.activeByGroup,
            [gid]: {
              callId: res.callId,
              type: res.type,
              count: 1,
              joined: false,
            },
          },
        }));
      }
      toast.error(REASONS[res.reason] || REASONS.error);
      return get().reset();
    }

    set({ callId: res.callId });
  },

  /* ---- join a running call ---- */
  joinCall: async (groupId, groupName = "") => {
    if (get().status !== "idle") return;
    const gid = String(groupId);

    // ask the server first: we need the call type before opening camera/mic
    const st = await emitAck("gcall:status", { groupId: gid });
    if (!st?.active) {
      toast.error(REASONS["no-call"]);
      get().clearActive(gid);
      return;
    }
    if (st.joined) {
      toast.error(REASONS["already-joined"]);
      return;
    }

    set({
      ...idleState,
      status: "connecting",
      groupId: gid,
      groupName: groupName || get().incoming?.groupName || "",
      type: st.type,
      incoming: null,
    });

    const media = await acquireMedia(st.type);
    if (!media) return get().reset();
    if (get().status === "idle") {
      media.getTracks().forEach((t) => t.stop());
      return;
    }
    localStream = media;
    set({ localStream: media, micOn: true, camOn: hasVideoTrack(media) });

    const res = await emitAck("gcall:join", { groupId: gid });

    if (get().status === "idle" || get().groupId !== gid) {
      if (res?.ok) getSocket()?.emit("gcall:leave", { callId: res.callId });
      return;
    }

    if (!res?.ok) {
      toast.error(REASONS[res.reason] || REASONS.error);
      if (res.reason === "no-call") get().clearActive(gid);
      return get().reset();
    }

    const peers = {};
    res.peers.forEach((p) => {
      peers[p.userId] = {
        userId: p.userId,
        fullName: p.fullName,
        avatar: p.avatar,
        stream: null,
        audio: true,
        video: res.type === "video",
        conn: "new",
      };
    });
    set({ callId: res.callId, type: res.type, peers });

    // tell everyone our initial mic/camera state
    emitMediaState();

    // we are the joiner -> we send the offers
    await Promise.all(
      res.peers.map((p) =>
        offerTo(p.userId, res.callId).catch((err) =>
          console.error("[gcall] offer failed:", err),
        ),
      ),
    );
  },

  /* ---- leave / hang up ---- */
  leaveCall: () => {
    const { callId } = get();
    if (callId) getSocket()?.emit("gcall:leave", { callId });
    get().reset();
  },

  toggleMic: () => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    set({ micOn: track.enabled });
    emitMediaState();
  },

  toggleCam: () => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) {
      toast.error("No camera available for this call.");
      return;
    }
    track.enabled = !track.enabled;
    set({ camOn: track.enabled });
    emitMediaState();
  },

  /* ---- incoming-call popup ---- */
  dismissIncoming: () => set({ incoming: null }),

  /* ---- banner data ---- */
  fetchStatus: async (groupId) => {
    const gid = String(groupId);
    const res = await emitAck("gcall:status", { groupId: gid });
    if (res?.reason) return; // offline / timeout -> keep what we have
    if (!res?.active) return get().clearActive(gid);
    set((s) => ({
      activeByGroup: {
        ...s.activeByGroup,
        [gid]: {
          callId: res.callId,
          type: res.type,
          count: res.count,
          joined: res.joined,
        },
      },
    }));
  },

  clearActive: (groupId) =>
    set((s) => {
      const next = { ...s.activeByGroup };
      delete next[String(groupId)];
      return { activeByGroup: next };
    }),

  /* ================= socket event handlers ================= */
  onIncoming: (p) => {
    const gid = String(p.groupId);
    set((s) => ({
      activeByGroup: {
        ...s.activeByGroup,
        [gid]: { callId: p.callId, type: p.type, count: 1, joined: false },
      },
      incoming: s.status === "idle" ? { ...p, groupId: gid } : s.incoming,
    }));
  },

  onPeerJoined: ({ callId, userId, fullName, avatar }) => {
    if (get().callId !== callId) return;
    patchPeer(String(userId), {
      userId: String(userId),
      fullName,
      avatar,
      conn: "new",
      video: get().type === "video",
    });
  },

  onPeerLeft: ({ callId, userId }) => {
    if (get().callId !== callId) return;
    const uid = String(userId);
    closePeer(uid);
    set((s) => {
      const peers = { ...s.peers };
      delete peers[uid];
      return { peers };
    });
  },

  onSignal: async ({ callId, from, data }) => {
    if (get().callId !== callId || !data) return;
    const uid = String(from);

    try {
      if (data.description) {
        const desc = data.description;

        if (desc.type === "offer") {
          // we are the ANSWERER
          const pc = createPeer(uid, callId);
          await pc.setRemoteDescription(desc);
          await flushIce(uid);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(callId, uid, {
            description: {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp,
            },
          });
          emitMediaState();
        } else if (desc.type === "answer") {
          const pc = pcs.get(uid);
          if (!pc || pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(desc);
          await flushIce(uid);
        }
      } else if (data.candidate) {
        const pc = pcs.get(uid);
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(data.candidate).catch(() => {});
        } else {
          const list = pendingIce.get(uid) || [];
          list.push(data.candidate);
          pendingIce.set(uid, list);
        }
      }
    } catch (err) {
      console.error("[gcall] signal failed:", err);
    }
  },

  onMedia: ({ callId, userId, audio, video }) => {
    if (get().callId !== callId) return;
    patchPeer(String(userId), { audio, video });
  },

  onEnded: ({ callId, groupId, status }) => {
    set((s) => {
      const next = { ...s.activeByGroup };
      delete next[String(groupId)];
      return {
        activeByGroup: next,
        incoming: s.incoming?.callId === callId ? null : s.incoming,
      };
    });

    if (get().callId === callId) {
      toast(status === "missed" ? "No one joined the call." : "Call ended.");
      get().reset();
    }
  },

  onJoinedElsewhere: ({ callId }) => {
    set((s) => ({
      incoming: s.incoming?.callId === callId ? null : s.incoming,
    }));
  },

  onSocketDisconnect: (reason) => {
    if (get().status === "idle") return;
    if (reason !== "io client disconnect")
      toast.error("Connection lost — the call was ended.");
    get().reset();
  },
}));
