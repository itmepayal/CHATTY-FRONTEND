import { useEffect } from "react";

export default function useRingtone(active, { pattern = "incoming" } = {}) {
  useEffect(() => {
    if (!active) return;

    let ctx;
    let timer;

    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freq = pattern === "incoming" ? 520 : 400;

      const beep = () => {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        osc.start(t);
        osc.stop(t + 0.75);
      };

      beep();
      timer = setInterval(beep, 2000);
    } catch {
      /* audio not available */
    }

    return () => {
      clearInterval(timer);
      ctx?.close().catch(() => {});
    };
  }, [active, pattern]);
}
