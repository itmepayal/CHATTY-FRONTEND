import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, MapPin, Radio, Square } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

const dotIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,.35)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const timeAgo = (d) => {
  if (!d) return "";
  const sec = Math.max(
    0,
    Math.round((Date.now() - new Date(d).getTime()) / 1000),
  );
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  return `${Math.round(min / 60)} h ago`;
};

const LocationMessage = ({ message, isMine }) => {
  const { lat, lng, isLive, shareId } = message.location;

  const live = useChatStore((s) =>
    shareId ? s.liveShares[String(shareId)] : null,
  );
  const liveLoaded = useChatStore((s) => s.liveLoaded);
  const stopLiveShare = useChatStore((s) => s.stopLiveShare);

  const active = Boolean(isLive && live);
  const ended = Boolean(isLive && liveLoaded && !live);

  const pos =
    active && Number.isFinite(live.lat) ? [live.lat, live.lng] : [lat, lng];

  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !boxRef.current || mapRef.current) return;

    const map = L.map(boxRef.current, {
      zoomControl: false,
      dragging: false, // chat scroll na ruke (mobile)
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    }).setView(pos, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    markerRef.current = L.marker(pos, {
      icon: dotIcon,
      interactive: false,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* live update: marker aur map move karo */
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng(pos);
    mapRef.current.panTo(pos, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1]]);

  /* "Updated 2 min ago" refresh */
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [active]);

  const mapsHref = `https://www.google.com/maps?q=${pos[0]},${pos[1]}`;

  let label = "Location";
  if (isLive)
    label = active
      ? "Live location"
      : ended
        ? "Live location ended"
        : "Live location";

  return (
    <div className="w-64 max-w-full overflow-hidden rounded-xl">
      {/* isolation: Leaflet ke z-index modals/popovers ke upar na aaye */}
      <div className="relative" style={{ isolation: "isolate" }}>
        <div
          ref={boxRef}
          className={`h-40 w-full bg-base-300 ${ended ? "opacity-60 grayscale" : ""}`}
        />
      </div>

      <div
        className={`flex items-center gap-2 px-2.5 py-2 ${
          isMine ? "bg-primary-content/10" : "bg-base-200"
        }`}
      >
        {active ? (
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-error" />
          </span>
        ) : isLive ? (
          <Radio className="size-4 shrink-0 opacity-60" />
        ) : (
          <MapPin className="size-4 shrink-0" />
        )}

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{label}</p>
          {active && live?.updatedAt && (
            <p className="truncate text-xs opacity-70">
              Updated {timeAgo(live.updatedAt)}
            </p>
          )}
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-xs btn-circle shrink-0"
          title="Open in Maps"
          aria-label="Open in Maps"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {isMine && active && (
        <button
          type="button"
          onClick={() => stopLiveShare(shareId)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-primary-content/20 py-1.5 text-xs font-medium hover:bg-primary-content/10"
        >
          <Square className="size-3" />
          Stop sharing
        </button>
      )}
    </div>
  );
};

export default LocationMessage;
