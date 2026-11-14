import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Pause, Play } from "lucide-react";

const SPEEDS = [1, 1.5, 2];

let activeAudio = null;

export const formatDuration = (sec = 0) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const resolveSrc = (audio) => {
  if (!audio) return "";
  const url = typeof audio === "string" ? audio : audio.url;
  if (!url || typeof url !== "string") return "";
  return url;
};

const VoiceMessage = ({ audio, isMine, uploading = false }) => {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [nativeDuration, setNativeDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);

  const total = audio?.duration || nativeDuration || 0;
  const src = useMemo(() => resolveSrc(audio), [audio?.url]);

  useEffect(
    () => () => {
      const a = ref.current;
      if (a) {
        a.pause();
        if (activeAudio === a) activeAudio = null;
      }
    },
    [],
  );

  const toggle = async () => {
    const a = ref.current;
    if (!a || uploading || !src) return;
    if (playing) {
      a.pause();
      return;
    }
    if (activeAudio && activeAudio !== a) activeAudio.pause();
    activeAudio = a;
    try {
      if (error) {
        setError(false);
        a.load();
      }
      a.playbackRate = rate;
      await a.play();
      setError(false);
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      console.error("[VoiceMessage] Playback failed:", {
        error: err,
        src: a.src,
        currentSrc: a.currentSrc,
        networkState: a.networkState,
        readyState: a.readyState,
        mediaError: a.error
          ? {
              code: a.error.code,
              message: a.error.message,
            }
          : null,
      });
      setError(true);
    }
  };

  const seek = (e) => {
    const a = ref.current;
    const v = Number(e.target.value);
    if (a) a.currentTime = v;
    setCurrent(v);
  };

  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  const shown = playing || current > 0 ? current : total;

  return (
    <div
      className={`flex w-60 max-w-full items-center gap-2.5 rounded-xl p-1.5 ${
        isMine ? "bg-primary-content/10" : "bg-base-200"
      }`}
    >
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setError(false);
          const d = e.currentTarget.duration;
          if (d && Number.isFinite(d) && d > 0) {
            setNativeDuration(Math.round(d));
          }
        }}
        onCanPlay={() => setError(false)}
        onPlay={() => {
          setError(false);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          if (activeAudio === ref.current) activeAudio = null;
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onError={(e) => {
          const mediaErr = e.currentTarget.error;
          console.error("[VoiceMessage] Media element error:", {
            code: mediaErr?.code,
            message: mediaErr?.message,
            src: e.currentTarget.src,
            currentSrc: e.currentTarget.currentSrc,
            networkState: e.currentTarget.networkState,
            readyState: e.currentTarget.readyState,
          });
          setError(true);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        disabled={uploading}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`grid size-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90 ${
          isMine
            ? "bg-primary-content text-primary"
            : "bg-primary text-primary-content"
        }`}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : error ? (
          <AlertCircle className="size-4" />
        ) : playing ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 translate-x-px" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(current, total || 1)}
          onChange={seek}
          disabled={uploading || error}
          aria-label="Seek"
          className="range range-xs w-full"
        />
        <div className="mt-0.5 flex items-center justify-between text-[11px] tabular-nums opacity-70">
          <span>{error ? "Can't play" : formatDuration(shown)}</span>
          {!uploading && !error && (
            <button
              type="button"
              onClick={cycleRate}
              className="rounded-full px-1.5 font-medium hover:bg-base-content/10"
              aria-label={`Playback speed ${rate}x`}
            >
              {rate}x
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
