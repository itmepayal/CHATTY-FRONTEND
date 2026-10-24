import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_VOICE_SECONDS = 300;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const pickMime = () =>
  typeof MediaRecorder === "undefined"
    ? ""
    : MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";

const micError = (err) => {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError")
    return "Microphone access is blocked. Allow it in your browser settings.";
  if (err?.name === "NotFoundError") return "No microphone was found.";
  if (err?.name === "NotReadableError")
    return "Your microphone is being used by another app.";
  return "Couldn't start recording.";
};

const useVoiceRecorder = ({
  onComplete,
  onError,
  maxSeconds = MAX_VOICE_SECONDS,
} = {}) => {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const stateRef = useRef("idle");
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const update = (next) => {
    stateRef.current = next;
    setState(next);
  };

  const release = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    update("idle");
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else release();
  }, [release]);

  const start = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onErrorRef.current?.("Voice recording isn't supported in this browser.");
      return;
    }

    update("requesting");
    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        release();
        return;
      }

      streamRef.current = stream;
      const mimeType = pickMime();
      const rec = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };

      rec.onerror = () => {
        onErrorRef.current?.("Recording failed.");
        cancelledRef.current = true;
        release();
      };

      rec.onstop = () => {
        const duration = Math.min(
          Math.round((Date.now() - startedAtRef.current) / 1000),
          maxSeconds,
        );
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const cancelled = cancelledRef.current;
        release();

        if (cancelled) return;
        if (duration < 1 || blob.size === 0) {
          onErrorRef.current?.("Recording was too short.");
          return;
        }
        onCompleteRef.current?.({ blob, duration, mimeType: type });
      };

      startedAtRef.current = Date.now();
      rec.start(250);
      update("recording");

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= maxSeconds) stop();
      }, 250);
    } catch (err) {
      release();
      onErrorRef.current?.(micError(err));
    }
  }, [maxSeconds, release, stop]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  return { state, seconds, start, stop, cancel };
};

export default useVoiceRecorder;
