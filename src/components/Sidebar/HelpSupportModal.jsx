import { useState } from "react";
import {
  HelpCircle,
  Keyboard,
  ShieldCheck,
  MessageSquare,
  Lock,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";

export const HelpSupportModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("shortcuts");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-base-100 border border-base-300 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <h3 id="help-modal-title" className="font-bold text-base text-base-content leading-tight">
                Help & Support
              </h3>
              <p className="text-xs text-base-content/60">
                Guides, shortcuts and security details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            className="btn btn-sm btn-ghost btn-square rounded-lg text-base-content/60 hover:text-base-content"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-base-300 bg-base-200/50 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("shortcuts")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "shortcuts"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Keyboard className="size-3.5" />
            <span>Shortcuts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "security"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Security & Privacy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "faq"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <MessageSquare className="size-3.5" />
            <span>FAQ</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {activeTab === "shortcuts" && (
            <div className="space-y-3">
              <p className="text-base-content/70">
                Speed up your messaging experience with native keyboard shortcuts:
              </p>
              <div className="divide-y divide-base-300/60 rounded-xl border border-base-300 bg-base-200/30 overflow-hidden">
                {[
                  { keys: ["⌘ / Ctrl", "B"], desc: "Toggle sliding sidebar (expand / collapse)" },
                  { keys: ["Esc"], desc: "Close sliding drawer, modals or dropdowns" },
                  { keys: ["Enter"], desc: "Send message in active chat" },
                  { keys: ["Shift", "Enter"], desc: "Add new line in message composer" },
                  { keys: ["/"], desc: "Focus chat search box" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 hover:bg-base-200/50 transition-colors"
                  >
                    <span className="text-base-content/80 font-medium">{item.desc}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, ki) => (
                        <kbd key={ki} className="kbd kbd-xs bg-base-100 border-base-300 shadow-2xs font-mono font-bold">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                <Lock className="size-4 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">End-to-End Encryption</h4>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Your direct messages and thread replies are encrypted with client-side keypairs. Only you and your recipient hold the decryption keys.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-base-200/50 border border-base-300 space-y-2">
                <h4 className="font-bold text-xs text-base-content flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Privacy Highlights</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-base-content/70 text-[11px]">
                  <li><strong>App Lock & Chat Lock:</strong> Lock confidential chats with PIN verification.</li>
                  <li><strong>Disappearing Messages:</strong> Automatically purge messages after 24 hours, 7 days, or 90 days.</li>
                  <li><strong>View-Once Media:</strong> Media files that auto-destruct immediately after viewing.</li>
                  <li><strong>Last Seen & Status:</strong> Granular controls in Settings &gt; Privacy.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-2.5">
              {[
                {
                  q: "How do I start a group call?",
                  a: "Open any group chat and click the Phone or Video icon in the header. All active group members receive an instant call invitation.",
                },
                {
                  q: "Where are my starred and saved messages stored?",
                  a: "Click 'Saved Messages' in the Sliding Sidebar or press Bookmark in any message action menu to pin messages for instant access.",
                },
                {
                  q: "Can I use Chatty on multiple devices?",
                  a: "Yes! Real-time Socket.IO synchronization keeps your unread badges, active calls, and contacts list synchronized across all open tabs and devices.",
                },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-base-200/50 border border-base-300">
                  <h4 className="font-bold text-xs text-base-content">{item.q}</h4>
                  <p className="text-[11px] text-base-content/70 mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-base-300 bg-base-200/40 flex items-center justify-between text-[11px] text-base-content/60">
          <span>Chatty Messenger v2.4.0</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-xs btn-primary rounded-lg px-3"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
