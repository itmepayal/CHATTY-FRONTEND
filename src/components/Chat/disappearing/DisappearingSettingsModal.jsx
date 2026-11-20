import React, { useState } from "react";
import { Clock, X, ShieldAlert, Check } from "lucide-react";
import { axiosInstance } from "../../../lib/axios.js";
import { customToast as toast } from "../../toast/customToastService.js";

const DURATIONS = [
  { label: "Off", seconds: 0, description: "Messages do not disappear automatically" },
  { label: "24 Hours", seconds: 86400, description: "Messages disappear 24 hours after being sent" },
  { label: "7 Days", seconds: 604800, description: "Messages disappear 7 days after being sent" },
  { label: "30 Days", seconds: 2592000, description: "Messages disappear 30 days after being sent" },
];

const DisappearingSettingsModal = ({ groupId, currentDuration = 0, onClose, onUpdated }) => {
  const [selectedDuration, setSelectedDuration] = useState(currentDuration);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.patch(`/groups/${groupId}/disappearing`, {
        seconds: selectedDuration,
      });

      if (res.data?.success) {
        toast.success("Group disappearing messages updated.");
        if (onUpdated) onUpdated(selectedDuration);
        onClose();
      }
    } catch (err) {
      console.error("[DisappearingSettings] Update failed:", err);
      toast.error(err?.response?.data?.message || "Failed to update disappearing messages.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Disappearing Messages</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-base-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-base-content/70">
            When enabled, new messages sent in this group will disappear after the selected duration.
          </p>

          <div className="space-y-2">
            {DURATIONS.map((d) => {
              const isSelected = selectedDuration === d.seconds;
              return (
                <div
                  key={d.seconds}
                  onClick={() => setSelectedDuration(d.seconds)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-base-300 hover:border-base-content/20 bg-base-200/40"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-base-content">{d.label}</div>
                    <div className="text-[10px] text-base-content/60 leading-tight mt-0.5">
                      {d.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-sm btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="btn btn-sm btn-primary text-xs"
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisappearingSettingsModal;
