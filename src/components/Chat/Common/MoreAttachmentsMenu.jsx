import React, { useEffect, useRef } from "react";
import {
  Image,
  FileText,
  Video,
  Film,
  Sticker,
  BarChart2,
  Gift,
  Clock,
  MapPin,
  X,
  Camera,
} from "lucide-react";

export default function MoreAttachmentsMenu({
  isOpen,
  onClose,
  onPickImage,
  onPickDocument,
  onPickVideo,
  onRecordVideo,
  onOpenStickers,
  onOpenGifs,
  onOpenPoll,
  onOpenGift,
  onOpenSchedule,
  onOpenLocation,
  canSchedule = true,
  canPoll = true,
  canGift = true,
  className = "",
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    {
      id: "photos",
      label: "Photos & Images",
      description: "JPG, PNG, WebP up to 5 MB",
      icon: Image,
      iconColor: "text-emerald-500 bg-emerald-500/10",
      action: () => {
        onClose();
        onPickImage?.();
      },
    },
    {
      id: "documents",
      label: "Documents & Files",
      description: "PDF, Word, Excel, TXT up to 10 MB",
      icon: FileText,
      iconColor: "text-sky-500 bg-sky-500/10",
      action: () => {
        onClose();
        onPickDocument?.();
      },
    },
    {
      id: "videos",
      label: "Video Attachment",
      description: "Upload MP4, WebM or record camera",
      icon: Video,
      iconColor: "text-purple-500 bg-purple-500/10",
      action: () => {
        onClose();
        onPickVideo?.();
      },
    },
    onRecordVideo && {
      id: "record_video",
      label: "Live Video Camera",
      description: "Record camera video with microphone",
      icon: Camera,
      iconColor: "text-rose-500 bg-rose-500/10",
      action: () => {
        onClose();
        onRecordVideo?.();
      },
    },
    {
      id: "stickers",
      label: "Sticker Packs",
      description: "Express with animated & custom stickers",
      icon: Sticker,
      iconColor: "text-amber-500 bg-amber-500/10",
      action: () => {
        onClose();
        onOpenStickers?.();
      },
    },
    {
      id: "gifs",
      label: "Animated GIFs",
      description: "Trending, reaction & meme GIFs",
      icon: Film,
      iconColor: "text-indigo-500 bg-indigo-500/10",
      action: () => {
        onClose();
        onOpenGifs?.();
      },
    },
    canPoll &&
      onOpenPoll && {
        id: "poll",
        label: "Create a Poll",
        description: "Ask questions and gather group votes",
        icon: BarChart2,
        iconColor: "text-teal-500 bg-teal-500/10",
        action: () => {
          onClose();
          onOpenPoll?.();
        },
      },
    canGift &&
      onOpenGift && {
        id: "gift",
        label: "Send Digital Gift",
        description: "Surprise peer with 3D gifts & coins",
        icon: Gift,
        iconColor: "text-amber-500 bg-amber-500/15",
        action: () => {
          onClose();
          onOpenGift?.();
        },
      },
    canSchedule &&
      onOpenSchedule && {
        id: "schedule",
        label: "Schedule Message",
        description: "Pick time and date to send draft",
        icon: Clock,
        iconColor: "text-cyan-500 bg-cyan-500/10",
        action: () => {
          onClose();
          onOpenSchedule?.();
        },
      },
    onOpenLocation && {
      id: "location",
      label: "Share Location",
      description: "Send live or current pin on map",
      icon: MapPin,
      iconColor: "text-rose-500 bg-rose-500/10",
      action: () => {
        onClose();
        onOpenLocation?.();
      },
    },
  ].filter(Boolean);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Attachment Options"
      className={`absolute bottom-full mb-3 left-2 sm:left-4 z-40 w-72 sm:w-80 rounded-3xl bg-base-100 border border-base-300 shadow-2xl p-2.5 animate-fade-in ${className}`}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-base-300/60 mb-1.5">
        <span className="text-xs font-bold text-base-content/80">
          Add Attachment
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-base-200 text-base-content/50 hover:text-base-content"
          aria-label="Close attachment menu"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-1 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-base-200 transition-colors text-left group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconColor}`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-base-content leading-tight group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="text-[10px] text-base-content/55 truncate leading-tight mt-0.5">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
