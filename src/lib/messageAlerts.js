import { useSettingsStore } from "../store/useSettingsStore";

let audioCtx = null;

export const playMessageSound = (volumePercent) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = (volumePercent / 100) * 0.3;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch {}
};

export const notifyIncoming = ({ title, body, icon, chatKey }) => {
  const { settings: s } = useSettingsStore.getState();

  if (s.messageSound) playMessageSound(s.soundVolume);

  const canNotify =
    s.desktopNotifications &&
    document.visibilityState !== "visible" &&
    "Notification" in window &&
    Notification.permission === "granted";

  if (!canNotify) return;

  const n = new Notification(title, {
    body: s.messagePreview ? body : "New message",
    icon,
    tag: chatKey,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
};
