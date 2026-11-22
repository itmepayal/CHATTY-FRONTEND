import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Phone,
  Video,
  Search,
  X,
  Users,
  UserPlus,
  PhoneCall,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useContactStore } from "../../store/useContactStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useCall } from "../../context/CallContext";
import { CALL_SPRING } from "../Call/common/callTokens";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

export const NewCallModal = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // all | online

  const users = useChatStore((s) => s.users);
  const contacts = useContactStore((s) => s.contacts);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const authUser = useAuthStore((s) => s.authUser);

  const { startCall, status: callStatus } = useCall();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Combine unique contacts and users
  const candidates = useMemo(() => {
    const map = new Map();
    const myId = String(authUser?._id || authUser?.id || "");

    (contacts || []).forEach((c) => {
      const id = String(c._id || c.id);
      if (id && id !== myId) {
        map.set(id, c);
      }
    });

    (users || []).forEach((u) => {
      const id = String(u._id || u.id);
      if (id && id !== myId && !map.has(id)) {
        map.set(id, u);
      }
    });

    return Array.from(map.values());
  }, [contacts, users, authUser]);

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((u) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const matchQuery = !q || name.includes(q);
      if (!matchQuery) return false;

      const id = String(u._id || u.id);
      const isOnline = Array.isArray(onlineUsers) && onlineUsers.includes(id);

      if (tab === "online" && !isOnline) return false;
      return true;
    });
  }, [candidates, query, tab, onlineUsers]);

  const handleStartCall = (user, type) => {
    onClose();
    startCall(
      {
        id: user._id || user.id,
        fullName: user.fullName || user.name || "User",
        avatar: user.avatar,
      },
      type,
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={CALL_SPRING}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4 bg-base-100/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <PhoneCall className="size-4.5" />
            </span>
            <div>
              <h2 className="font-bold text-base text-base-content leading-tight">
                New Call
              </h2>
              <p className="text-xs text-base-content/55 mt-0.5">
                Start a voice or video call with your contacts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
            aria-label="Close"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 border-b border-base-200/80 space-y-3 bg-base-200/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-xl bg-base-100 border border-base-300/80 pl-9 pr-4 py-2 text-xs sm:text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              onClick={() => setTab("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                tab === "all"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
              }`}
            >
              All ({candidates.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "online"}
              onClick={() => setTab("online")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                tab === "online"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "bg-base-200/60 text-base-content/70 hover:bg-base-200"
              }`}
            >
              <span className="size-1.5 rounded-full bg-success inline-block" />
              <span>Online</span>
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-base-200/40">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((user) => {
              const id = String(user._id || user.id);
              const isOnline =
                Array.isArray(onlineUsers) && onlineUsers.includes(id);

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl hover:bg-base-200/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc(user.avatar)}
                        alt={user.fullName || "User"}
                        className="size-10 sm:size-11 rounded-full object-cover ring-2 ring-base-content/10 shadow-xs"
                      />
                      {isOnline && (
                        <span
                          className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100"
                          title="Online"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm text-base-content">
                        {user.fullName || user.name || "User"}
                      </p>
                      <p className="truncate text-xs text-base-content/50 mt-0.5">
                        {isOnline
                          ? "Online now"
                          : user.about || user.bio || "Available"}
                      </p>
                    </div>
                  </div>

                  {/* Call Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={callStatus !== "idle"}
                      onClick={() => handleStartCall(user, "audio")}
                      className="flex size-8.5 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-xs transition-all active:scale-95 disabled:opacity-40"
                      title={`Voice call ${user.fullName || "User"}`}
                      aria-label="Voice call"
                    >
                      <Phone className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={callStatus !== "idle"}
                      onClick={() => handleStartCall(user, "video")}
                      className="flex size-8.5 items-center justify-center rounded-xl bg-success/15 text-success hover:bg-success hover:text-white shadow-xs transition-all active:scale-95 disabled:opacity-40"
                      title={`Video call ${user.fullName || "User"}`}
                      aria-label="Video call"
                    >
                      <Video className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-base-200/80 text-base-content/40">
                <Users className="size-6" />
              </div>
              <p className="text-sm font-semibold text-base-content/80">
                No contacts found
              </p>
              <p className="text-xs text-base-content/50 max-w-xs mx-auto">
                {query
                  ? `No contacts matching "${query}".`
                  : "Add contacts to quickly connect via voice or video calls."}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NewCallModal;
