import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupCallStore } from "../store/useGroupCallStore";

const useGroupCallListeners = () => {
  const socket = useAuthStore((s) => s.socket);

  useEffect(() => {
    if (!socket) {
      useGroupCallStore.getState().reset();
      return;
    }

    const st = () => useGroupCallStore.getState();

    const handlers = {
      "gcall:incoming": (p) => st().onIncoming(p),
      "gcall:peer-joined": (p) => st().onPeerJoined(p),
      "gcall:peer-left": (p) => st().onPeerLeft(p),
      "gcall:signal": (p) => st().onSignal(p),
      "gcall:media": (p) => st().onMedia(p),
      "gcall:ended": (p) => st().onEnded(p),
      "gcall:joined-elsewhere": (p) => st().onJoinedElsewhere(p),
      disconnect: (reason) => st().onSocketDisconnect(reason),
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));

    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [socket]);

  useEffect(() => {
    const onUnload = () => {
      const { callId } = useGroupCallStore.getState();
      if (callId)
        useAuthStore.getState().socket?.emit("gcall:leave", { callId });
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);
};

export default useGroupCallListeners;
