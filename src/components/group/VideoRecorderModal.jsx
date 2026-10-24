import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CameraOff,
  Loader2,
  RotateCcw,
  Send,
  SwitchCamera,
  X,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];
const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

const pickMime = () => {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return (
    candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ""
  );
};

const fmt = (s) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const fmtSize = (bytes = 0) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const glassBtn =
  "grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-90 hover:bg-black/60 disabled:opacity-40";

/**
 * Props:
 *  - maxSeconds: auto-stop limit (default 60)
 *  - onClose(): close modal
 *  - onSend({ blob, duration, mimeType }): called when user presses Send
 */
const VideoRecorderModal = ({ maxSeconds = 60, onClose, onSend }) => {
  // starting | ready | countdown | recording | review
  const [phase, setPhase] = useState("starting");
  const [elapsed, setElapsed] = useState(0); // ms
  const [count, setCount] = useState(3);
  const [error, setError] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [facing, setFacing] = useState("user");
  const [canFlip, setCanFlip] = useState(false);
  const [resultInfo, setResultInfo] = useState(null); // { duration, size }

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const startedAtRef = useRef(0);
  const resultRef = useRef(null); // { blob, duration, mimeType }

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (facingMode = "user") => {
      setError("");
      setPhase("starting");
      stopStream();
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
          throw new Error("Video recording isn't supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        streamRef.current = stream;
        setPhase("ready");

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
        } catch {
          setCanFlip(false);
        }
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera or microphone permission was denied. Allow access in your browser settings and try again."
            : e?.name === "NotFoundError"
              ? "No camera found on this device."
              : e?.message || "Couldn't access the camera.",
        );
      }
    },
    [stopStream],
  );

  // open camera on mount, clean everything on unmount
  useEffect(() => {
    startCamera("user");
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      try {
        const rec = recorderRef.current;
        if (rec && rec.state !== "inactive") {
          rec.onstop = null;
          rec.stop();
        }
      } catch {
        /* ignore */
      }
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Escape closes
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // lock page scroll behind the modal
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // revoke review URL on change / unmount
  useEffect(() => {
    return () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    };
  }, [reviewUrl]);

  // attach live stream / recorded blob to <video>
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (phase === "ready" || phase === "countdown" || phase === "recording") {
      if (el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
      el.removeAttribute("src");
      el.muted = true;
      el.controls = false;
      el.loop = false;
      el.play().catch(() => {});
    } else if (phase === "review" && reviewUrl) {
      el.srcObject = null;
      el.src = reviewUrl;
      el.muted = false;
      el.controls = false;
      el.loop = true;
      el.play().catch(() => {});
    }
  }, [phase, reviewUrl]);

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickMime();
    let rec;
    try {
      rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_200_000, // keeps a 60s clip around ~9 MB
        audioBitsPerSecond: 96_000,
      });
    } catch {
      setError("Couldn't start recording on this device.");
      return;
    }
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      clearInterval(timerRef.current);
      const duration = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const type = rec.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      stopStream();
      if (!blob.size) {
        setError("The recording was empty. Please try again.");
        return;
      }
      const finalDuration = Math.min(duration, maxSeconds);
      resultRef.current = { blob, duration: finalDuration, mimeType: type };
      setResultInfo({ duration: finalDuration, size: blob.size });
      setReviewUrl(URL.createObjectURL(blob));
      setPhase("review");
    };

    startedAtRef.current = Date.now();
    setElapsed(0);
    rec.start(250);
    setPhase("recording");

    timerRef.current = setInterval(() => {
      const ms = Date.now() - startedAtRef.current;
      setElapsed(ms);
      if (ms >= maxSeconds * 1000) finishRecording();
    }, 100);
  };

  // 3 · 2 · 1 then record
  const beginCountdown = () => {
    let n = 3;
    setCount(n);
    setPhase("countdown");
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownRef.current);
        startRecording();
      } else {
        setCount(n);
      }
    }, 800);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setPhase("ready");
  };

  const flipCamera = () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    startCamera(next);
  };

  const retake = () => {
    resultRef.current = null;
    setResultInfo(null);
    setReviewUrl("");
    setElapsed(0);
    startCamera(facing);
  };

  const send = () => {
    if (!resultRef.current) return;
    onSend?.(resultRef.current);
  };

  const live =
    phase === "ready" || phase === "countdown" || phase === "recording";
  const mirror = live && facing === "user";
  const progress = Math.min(elapsed / (maxSeconds * 1000), 1);
  const nearLimit = phase === "recording" && maxSeconds - elapsed / 1000 <= 10;

  const onMainButton = () => {
    if (phase === "ready") beginCountdown();
    else if (phase === "countdown") cancelCountdown();
    else if (phase === "recording") finishRecording();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Record video message"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="relative h-full w-full overflow-hidden bg-black sm:h-[min(92vh,760px)] sm:max-w-[440px] sm:rounded-3xl sm:shadow-2xl sm:ring-1 sm:ring-white/10"
      >
        {/* ---------- camera / playback ---------- */}
        {!error && (
          <video
            ref={videoRef}
            playsInline
            className={`absolute inset-0 h-full w-full object-cover ${
              mirror ? "[transform:scaleX(-1)]" : ""
            }`}
          />
        )}

        {/* soft gradients so controls stay readable */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/80 to-transparent" />

        {/* ---------- top bar ---------- */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className={glassBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            {phase === "recording" && (
              <motion.div
                key="rec"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md ${
                  nearLimit ? "bg-error/80" : "bg-black/45"
                }`}
              >
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                </span>
                <span className="font-mono tabular-nums">
                  {fmt(elapsed / 1000)}
                </span>
                <span className="text-white/60">/ {fmt(maxSeconds)}</span>
              </motion.div>
            )}
            {phase === "review" && resultInfo && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-full bg-black/45 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md"
              >
                <span className="font-mono tabular-nums">
                  {fmt(resultInfo.duration)}
                </span>
                <span className="text-white/60">
                  {" "}
                  · {fmtSize(resultInfo.size)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {canFlip && phase === "ready" ? (
            <button
              type="button"
              className={glassBtn}
              onClick={flipCamera}
              aria-label="Switch camera"
            >
              <SwitchCamera className="size-5" />
            </button>
          ) : (
            <span className="size-10" />
          )}
        </div>

        {/* ---------- loading ---------- */}
        <AnimatePresence>
          {phase === "starting" && !error && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[5] grid place-items-center bg-neutral-950"
            >
              <div className="flex flex-col items-center gap-3 text-white/70">
                <Loader2 className="size-7 animate-spin" />
                <span className="text-sm">Starting camera…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- countdown ---------- */}
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              key={`count-${count}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="pointer-events-none absolute inset-0 z-[6] grid place-items-center"
            >
              <span className="text-8xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                {count}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- error ---------- */}
        {error && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 bg-neutral-950 px-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-white/10 text-white/80">
              <CameraOff className="size-7" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              {error}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-full px-5"
                onClick={() => startCamera(facing)}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-full text-white"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ---------- bottom controls ---------- */}
        {!error && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {phase !== "review" ? (
              <>
                <motion.button
                  type="button"
                  onClick={onMainButton}
                  disabled={phase === "starting"}
                  whileTap={{ scale: 0.92 }}
                  className="relative grid size-20 place-items-center disabled:opacity-40"
                  aria-label={
                    phase === "recording"
                      ? "Stop recording"
                      : phase === "countdown"
                        ? "Cancel"
                        : "Start recording"
                  }
                >
                  {/* progress ring */}
                  <svg
                    viewBox="0 0 80 80"
                    className="absolute inset-0 -rotate-90"
                    aria-hidden="true"
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r={RING_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={RING_R}
                      fill="none"
                      stroke={nearLimit ? "#f87171" : "#ef4444"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C * (1 - progress)}
                      style={{ transition: "stroke-dashoffset 120ms linear" }}
                    />
                  </svg>
                  {/* inner shape: circle -> rounded square while recording */}
                  <motion.span
                    animate={{
                      width: phase === "recording" ? 26 : 56,
                      height: phase === "recording" ? 26 : 56,
                      borderRadius: phase === "recording" ? 7 : 28,
                    }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="block bg-red-500 shadow-lg shadow-red-500/30"
                  />
                </motion.button>

                <p className="h-4 text-xs text-white/70">
                  {phase === "ready" &&
                    `Tap to record · up to ${fmt(maxSeconds)}`}
                  {phase === "countdown" && "Tap to cancel"}
                  {phase === "recording" && "Tap to stop"}
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="flex w-full items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={retake}
                  className="flex h-12 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white backdrop-blur-md transition active:scale-95 hover:bg-white/25"
                >
                  <RotateCcw className="size-4" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={send}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-content shadow-lg shadow-primary/30 transition active:scale-95 hover:brightness-110"
                >
                  <Send className="size-4" />
                  Send video
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default VideoRecorderModal;
