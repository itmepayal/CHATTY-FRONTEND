import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_VIDEO_SECONDS = 60;

const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ].find((t) => MediaRecorder.isTypeSupported(t)) || ""
  );
};

export default function useVideoRecorder({ onComplete, onError } = {}) {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [stream, setStream] = useState(null);

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);

  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
    setStream(null);
    setSeconds(0);
    setState("idle");
  }, []);

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recRef.current?.state === "recording") recRef.current.stop();
    else cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (state !== "idle") return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onErrorRef.current?.("Video recording isn't supported in this browser.");
      return;
    }

    cancelledRef.current = false;
    setState("requesting");

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      streamRef.current = media;
      setStream(media);

      const mimeType = pickMime();
      const rec = new MediaRecorder(media, {
        ...(mimeType && { mimeType }),
        videoBitsPerSecond: 1_500_000,
        audioBitsPerSecond: 64_000,
      });
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const cancelled = cancelledRef.current;
        const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
        const type = rec.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        if (cancelled || !blob.size || duration < 1) return;
        onCompleteRef.current?.({ blob, mimeType: type, duration });
      };

      rec.start(250);
      startedAtRef.current = Date.now();
      setState("recording");

      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(sec);
        if (sec >= MAX_VIDEO_SECONDS) stop();
      }, 250);
    } catch (err) {
      cleanup();
      onErrorRef.current?.(
        err?.name === "NotAllowedError"
          ? "Camera/microphone permission denied."
          : err?.name === "NotFoundError"
            ? "No camera or microphone found."
            : "Couldn't start video recording.",
      );
    }
  }, [state, cleanup, stop]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { state, seconds, stream, start, stop, cancel };
}
