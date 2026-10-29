import { useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";

const STOP_ERRORS = ["share_inactive", "blocked", "invalid_share"];

const LiveLocationSender = () => {
  const socket = useAuthStore((s) => s.socket);
  const myId = useAuthStore((s) => s.authUser?.id);

  const liveShares = useChatStore((s) => s.liveShares);
  const getActiveShares = useChatStore((s) => s.getActiveShares);
  const subscribeToLocation = useChatStore((s) => s.subscribeToLocation);
  const unsubscribeFromLocation = useChatStore(
    (s) => s.unsubscribeFromLocation,
  );
  const removeLiveShare = useChatStore((s) => s.removeLiveShare);

  const myKey = useMemo(
    () =>
      Object.values(liveShares)
        .filter((x) => String(x.sharerId) === String(myId))
        .map((x) => x.shareId)
        .sort()
        .join(","),
    [liveShares, myId],
  );

  useEffect(() => {
    if (!socket || !myId) return;
    getActiveShares();
    subscribeToLocation();
    return () => unsubscribeFromLocation();
  }, [
    socket,
    myId,
    getActiveShares,
    subscribeToLocation,
    unsubscribeFromLocation,
  ]);

  useEffect(() => {
    if (!socket || !myKey || !navigator.geolocation) return;

    const ids = myKey.split(",");
    const last = { lat: 0, lng: 0, t: 0 };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!socket.connected) return;

        const {
          latitude: lat,
          longitude: lng,
          accuracy,
          heading,
          speed,
        } = pos.coords;
        const now = Date.now();
        const moved =
          Math.abs(lat - last.lat) + Math.abs(lng - last.lng) > 0.0001; // ~10m
        if (now - last.t < 5000 && !moved) return;
        last.lat = lat;
        last.lng = lng;
        last.t = now;

        ids.forEach((shareId) => {
          socket.emit(
            "location:update",
            { shareId, lat, lng, accuracy, heading, speed },
            (res) => {
              if (res && res.ok === false && STOP_ERRORS.includes(res.error)) {
                removeLiveShare(shareId);
              }
            },
          );
        });
      },
      (err) => {
        if (err.code === 1) {
          toast.error("Location permission denied. Live sharing can't update.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket, myKey, removeLiveShare]);

  return null;
};

export default LiveLocationSender;
