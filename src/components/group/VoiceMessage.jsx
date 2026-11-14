import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Pause, Play } from "lucide-react";

const SPEEDS = [1, 1.5, 2];

let activeMedia = null;

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

/**
 * Transforms Cloudinary URLs to alternative formats.
 * Cloudinary video/upload supports on-the-fly transcoding to .mp3,
 * delivering strict audio/mpeg that Chrome and all browsers play reliably.
 */
export const getTranscodedCloudinaryUrl = (url, targetExt = "mp3") => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) {
    return url;
  }

  const [base, query] = url.split("?");
  const qs = query ? `?${query}` : "";

  if (base.toLowerCase().endsWith(`.${targetExt.toLowerCase()}`)) {
    return url;
  }

  const replaced = base.replace(/\.[a-zA-Z0-9]+$/, "") + `.${targetExt}`;
  return replaced + qs;
};

/**
 * Generates an ordered list of candidate sources for an audio attachment.
 * Universal fallback handles mobile AAC/M4A containers served as video/mp4.
 */
export const getAudioSources = (audio) => {
  const rawUrl = resolveSrc(audio);
  if (!rawUrl) return [];

  // Local Blob / data URLs must be played as-is
  if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) {
    const mime = (typeof audio === "object" && audio?.mimeType) || "audio/webm";
    return [{ src: rawUrl, type: mime }];
  }

  const isCloudinary =
    rawUrl.includes("res.cloudinary.com") && rawUrl.includes("/video/upload/");

  if (isCloudinary) {
    const isM4a = /\.m4a($|\?)/i.test(rawUrl);
    const isWebm = /\.webm($|\?)/i.test(rawUrl);
    const isMp3 = /\.mp3($|\?)/i.test(rawUrl);

    if (isM4a) {
      // Cloudinary .mp3 transcode produces standard audio/mpeg which Chrome's <audio> element
      // plays without container/MIME type rejection.
      const mp3Url = getTranscodedCloudinaryUrl(rawUrl, "mp3");
      return [
        { src: mp3Url, type: "audio/mpeg" },
        { src: rawUrl, type: "audio/mp4" },
      ];
    }

    if (isWebm) {
      const mp3Url = getTranscodedCloudinaryUrl(rawUrl, "mp3");
      return [
        { src: rawUrl, type: "audio/webm" },
        { src: mp3Url, type: "audio/mpeg" },
      ];
    }

    if (isMp3) {
      return [{ src: rawUrl, type: "audio/mpeg" }];
    }

    // Default Cloudinary fallback
    const mp3Url = getTranscodedCloudinaryUrl(rawUrl, "mp3");
    return [
      { src: mp3Url, type: "audio/mpeg" },
      { src: rawUrl, type: "audio/mp4" },
    ];
  }

  const mime = (typeof audio === "object" && audio?.mimeType) || "audio/mp4";
  return [{ src: rawUrl, type: mime }];
};

const VoiceMessage = ({ audio, isMine, uploading = false }) => {
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [nativeDuration, setNativeDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);

  const rawUrl = resolveSrc(audio);
  const sources = useMemo(() => getAudioSources(audio), [audio, rawUrl]);
  const primarySrc = sources[0]?.src || rawUrl;
  const total = audio?.duration || nativeDuration || 0;

  // Active element determines whether audio tag or video fallback tag is in control
  const getActiveMedia = useCallback(() => {
    if (useVideoFallback) return videoRef.current;
    return audioRef.current || videoRef.current;
  }, [useVideoFallback]);

  // Pause on unmount
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      const v = videoRef.current;
      if (a) a.pause();
      if (v) v.pause();
      if (activeMedia === a || activeMedia === v) activeMedia = null;
    };
  }, []);

  // Reset state when audio URL changes
  useEffect(() => {
    setError(false);
    setUseVideoFallback(false);
    setPlaying(false);
    setCurrent(0);
    setNativeDuration(0);
  }, [rawUrl]);

  const toggle = async () => {
    if (uploading || !primarySrc) return;

    let media = getActiveMedia();
    if (!media) return;

    if (playing) {
      media.pause();
      return;
    }

    if (activeMedia && activeMedia !== media) {
      try {
        activeMedia.pause();
      } catch {}
    }
    activeMedia = media;

    try {
      if (error) {
        setError(false);
        setUseVideoFallback(false);
        media = audioRef.current || media;
        if (media.load) media.load();
      }
      media.playbackRate = rate;
      setBuffering(true);
      await media.play();
      setError(false);
      setBuffering(false);
    } catch (err) {
      if (err?.name === "AbortError") {
        setBuffering(false);
        return;
      }

      console.warn("[VoiceMessage] Primary play attempt failed, trying fallback:", err?.message);

      // If audio element failed, attempt video element fallback (which has broader container decoding)
      if (!useVideoFallback && videoRef.current) {
        try {
          setUseVideoFallback(true);
          const v = videoRef.current;
          v.playbackRate = rate;
          activeMedia = v;
          await v.play();
          setError(false);
          setBuffering(false);
          return;
        } catch (vErr) {
          console.error("[VoiceMessage] Video fallback playback also failed:", vErr);
        }
      }

      setBuffering(false);
      setError(true);
    }
  };

  const seek = (e) => {
    const media = getActiveMedia();
    const v = Number(e.target.value);
    if (media) media.currentTime = v;
    setCurrent(v);
  };

  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];
    setRate(next);
    const media = getActiveMedia();
    if (media) media.playbackRate = next;
  };

  const handleMetadata = (e) => {
    setError(false);
    setBuffering(false);
    const d = e.currentTarget.duration;
    if (d && Number.isFinite(d) && d > 0) {
      setNativeDuration(Math.round(d));
    }
  };

  const handleTimeUpdate = (e) => {
    setCurrent(e.currentTarget.currentTime);
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrent(0);
    const media = getActiveMedia();
    if (activeMedia === media) activeMedia = null;
  };

  const handleAudioError = (e) => {
    const mediaErr = e.currentTarget.error;
    console.warn("[VoiceMessage] Audio element error encountered:", {
      code: mediaErr?.code,
      message: mediaErr?.message,
      currentSrc: e.currentTarget.currentSrc || primarySrc,
    });

    // If audio element fails, seamlessly switch to video fallback
    if (!useVideoFallback && videoRef.current) {
      setUseVideoFallback(true);
      setError(false);
    } else {
      setError(true);
      setBuffering(false);
    }
  };

  const handleVideoError = (e) => {
    const mediaErr = e.currentTarget.error;
    console.error("[VoiceMessage] Video fallback element error:", {
      code: mediaErr?.code,
      message: mediaErr?.message,
      currentSrc: e.currentTarget.currentSrc || primarySrc,
    });
    setError(true);
    setBuffering(false);
  };

  const shown = playing || current > 0 ? current : total;

  return (
    <div
      className={`flex w-60 max-w-full items-center gap-2.5 rounded-xl p-1.5 ${
        isMine ? "bg-primary-content/10" : "bg-base-200"
      }`}
    >
      {/* Primary HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={primarySrc}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleMetadata}
        onCanPlay={() => {
          setError(false);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setError(false);
          setBuffering(false);
          setPlaying(true);
        }}
        onPlay={() => {
          setError(false);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleAudioError}
      >
        {sources.map((s, idx) => (
          <source key={`${s.src}-${idx}`} src={s.src} type={s.type} />
        ))}
      </audio>

      {/* Hidden Video Fallback Element (handles video/mp4 containers that audio elements reject) */}
      <video
        ref={videoRef}
        src={rawUrl}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        style={{ display: "none" }}
        onLoadedMetadata={handleMetadata}
        onCanPlay={() => {
          setError(false);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setError(false);
          setBuffering(false);
          setPlaying(true);
        }}
        onPlay={() => {
          setError(false);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleVideoError}
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
        {uploading || buffering ? (
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
