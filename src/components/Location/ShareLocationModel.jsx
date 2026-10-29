import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, MapPin, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../../store/useChatStore";
import { Modal, springSnappy } from "../Chat/chatMotionKit";

const DURATIONS = [
  { min: 15, label: "15 minutes" },
  { min: 60, label: "1 hour" },
  { min: 480, label: "8 hours" },
];

const ShareLocationModal = ({ name, onClose }) => {
  const shareLocation = useChatStore((s) => s.shareLocation);
  const receiverId = useChatStore((s) => s.selectedUser?.id);

  const [mode, setMode] = useState("current");
  const [durationMin, setDurationMin] = useState(60);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!window.isSecureContext) {
      return toast.error("Location needs a secure (https) connection");
    }
    setBusy(true);
    const ok = await shareLocation(receiverId, { mode, durationMin });
    setBusy(false);
    if (ok) onClose();
  };

  const Option = ({ value, icon: Icon, title, desc }) => {
    const on = mode === value;
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={springSnappy}
        onClick={() => setMode(value)}
        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          on
            ? "border-primary bg-primary/10"
            : "border-base-300 hover:bg-base-200"
        }`}
      >
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-base-200 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-base-content/60">{desc}</span>
        </span>
        {on && <Check className="mt-1 size-4 shrink-0 text-primary" />}
      </motion.button>
    );
  };

  return (
    <Modal onClose={onClose} labelId="share-location-title">
      <h3 id="share-location-title" className="font-semibold">
        Share location
      </h3>

      <div className="mt-3 space-y-2">
        <Option
          value="current"
          icon={MapPin}
          title="Send current location"
          desc="One-time pin. It won't update after you send it."
        />
        <Option
          value="live"
          icon={Radio}
          title="Share live location"
          desc="Updates in real time while this app stays open."
        />
      </div>

      {mode === "live" && (
        <div className="mt-3 flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.min}
              type="button"
              onClick={() => setDurationMin(d.min)}
              className={`btn btn-sm flex-1 ${
                durationMin === d.min ? "btn-primary" : "btn-outline"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-base-content/60">
        Only {name || "this person"} will see your location. You can stop
        sharing anytime.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={submit}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "live" ? (
            "Start sharing"
          ) : (
            "Send"
          )}
        </motion.button>
      </div>
    </Modal>
  );
};

export default ShareLocationModal;
