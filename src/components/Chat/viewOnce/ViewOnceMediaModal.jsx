import React, { useEffect } from "react";
import { X, ShieldAlert, Eye, Lock } from "lucide-react";
import { axiosInstance } from "../../../lib/axios.js";

const ViewOnceMediaModal = ({
  message,
  isGroup = false,
  groupId = null,
  onClose,
}) => {
  useEffect(() => {
    // Immediately tell the backend this view-once media has been opened!
    const markOpened = async () => {
      try {
        const url = isGroup
          ? `/groups/${groupId}/messages/${message.id || message._id}/view-once/open`
          : `/messages/${message.id || message._id}/view-once/open`;
        await axiosInstance.post(url);
      } catch (err) {
        console.error("[ViewOnce] Failed to mark opened:", err);
      }
    };

    markOpened();
  }, [message, isGroup, groupId]);

  const mediaUrl = message.image?.url || message.video?.url || message.file?.url;
  const isVideo = Boolean(message.video?.url);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-black/95 text-white animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <div className="w-6 h-6 rounded-full border border-primary text-primary flex items-center justify-center font-bold text-xs">
            1
          </div>
          <span>View Once {isVideo ? "Video" : "Photo"}</span>
          <span className="text-white/40">• Purged after closing</span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          title="Close (will delete media)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Media Container */}
      <div
        className="flex-1 flex items-center justify-center w-full max-w-4xl p-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain"
          />
        ) : (
          <img
            src={mediaUrl}
            alt="View Once"
            className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain pointer-events-none"
          />
        )}
      </div>

      {/* Bottom Disclaimer */}
      <div className="text-center py-2 text-xs text-white/50 flex items-center gap-1.5 z-10">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span>This media will disappear permanently once you leave this screen.</span>
      </div>
    </div>
  );
};

export default ViewOnceMediaModal;
