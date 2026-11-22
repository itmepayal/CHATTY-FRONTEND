import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Languages,
  Loader2,
  RefreshCw,
  Sparkles,
  SpellCheck,
  Wand2,
  X,
  Minimize2,
  Maximize2,
  Smile,
  Briefcase,
  MessageSquarePlus,
  Edit3,
} from "lucide-react";
import { customToast } from "../toast";
import { AI_TONES, useAiStore } from "../../store/useAiStore";
import { useSettingsStore } from "../../store/UseSettingsStore";

/* ---------- constants ---------- */

const TONE_META = {
  formal: { emoji: "👔", label: "Formal" },
  casual: { emoji: "😎", label: "Casual" },
  friendly: { emoji: "😊", label: "Friendly" },
  professional: { emoji: "💼", label: "Professional" },
  persuasive: { emoji: "🎯", label: "Persuasive" },
};

const ACTION_ICON = {
  correct: SpellCheck,
  hinglish: Languages,
  rewrite: Wand2,
  shorter: Minimize2,
  expand: Maximize2,
  suggest: MessageSquarePlus,
};

const LOADING_TEXT = {
  correct: "Fixing grammar & spelling…",
  hinglish: "Translating to natural English…",
  rewrite: "Rewriting message…",
  shorter: "Making it concise…",
  expand: "Expanding message…",
  suggest: "Drafting suggested reply…",
};

/* ---------- tiny word diff (for "Fix grammar") ---------- */

const tokenize = (s) => s.split(/(\s+)/).filter(Boolean);

const diffWords = (a, b) => {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  const push = (type, text) => {
    const lastOp = ops[ops.length - 1];
    if (lastOp && lastOp.type === type) lastOp.text += text;
    else ops.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", A[i++]);
    } else {
      push("add", B[j++]);
    }
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("add", B[j++]);
  return ops;
};

/* ---------- small UI pieces ---------- */

const ActionRow = ({ icon: Icon, title, desc, onClick, disabled }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    disabled={disabled}
    className="group w-full flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-base-200 focus-visible:bg-base-200 outline-none disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
  >
    <span className="size-8 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
      <Icon className="size-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-base-content leading-tight">
        {title}
      </span>
      <span className="block text-[11px] text-base-content/60 leading-snug">
        {desc}
      </span>
    </span>
  </button>
);

const IconBtn = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
    aria-label={label}
    title={label}
  >
    <Icon className="size-3.5" />
  </button>
);

/* ---------- main component ---------- */

const AiAssist = ({
  text,
  onApply,
  disabled = false,
  resetKey,
  className = "",
}) => {
  const {
    isLoading,
    activeAction,
    result,
    correctEnglish,
    rewriteText,
    hinglishToEnglish,
    clearResult,
    reset,
  } = useAiStore();

  const { aiEnabled, aiDefaultTone, aiShowChanges } = useSettingsStore(
    (st) => st.settings,
  );

  const [open, setOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(aiShowChanges);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editableValue, setEditableValue] = useState("");
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const cardRef = useRef(null);
  const loadingRef = useRef(null);
  const lastRunRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const updateCoords = () => {
    if (!wrapRef.current || typeof window === "undefined") return;
    const rect = wrapRef.current.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    const bottom = Math.max(12, window.innerHeight - rect.top + 8);
    setCoords({ bottom, right });
  };

  useEffect(() => {
    if (open || isLoading || result) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }
  }, [open, isLoading, result]);

  const hasText = text?.trim()?.length > 0;

  useEffect(() => {
    setShowDiff(aiShowChanges);
  }, [aiShowChanges]);

  // When result arrives, initialize editable draft
  useEffect(() => {
    if (result?.value) {
      setEditableValue(result.value);
      setIsEditingDraft(false);
    }
  }, [result]);

  const tones = useMemo(() => {
    const list = ["professional", "friendly", "casual", "formal", "persuasive"];
    return AI_TONES.includes(aiDefaultTone)
      ? [aiDefaultTone, ...list.filter((t) => t !== aiDefaultTone)]
      : list;
  }, [aiDefaultTone]);

  useEffect(() => {
    setOpen(false);
    reset();
    return () => reset();
  }, [resetKey, reset]);

  // Close menu on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        !wrapRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Escape closes the result card
  useEffect(() => {
    if (!result) return;
    const onKey = (e) => e.key === "Escape" && clearResult();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, clearResult]);

  const run = (fn) => {
    lastRunRef.current = fn;
    setOpen(false);
    fn();
  };

  const regenerate = () => {
    if (!hasText || !lastRunRef.current) return;
    lastRunRef.current();
  };

  const apply = () => {
    if (!editableValue) return;
    onApply(editableValue.slice(0, 2000));
    clearResult();
    customToast.success("Draft applied to composer");
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(editableValue);
      customToast.success("Copied to clipboard");
    } catch {
      customToast.error("Couldn't copy");
    }
  };

  const diff = useMemo(() => {
    if (!result || result.action !== "correct") return null;
    if (result.original === result.value) return null;
    return diffWords(result.original, result.value);
  }, [result]);

  const ResultIcon = ACTION_ICON[result?.action] || Sparkles;
  const showResult = Boolean(result) && !isLoading && !open;

  const renderPopover = (content) => {
    if (typeof document === "undefined") return content;
    return createPortal(content, document.body);
  };

  const popoverStyle = coords
    ? {
        position: "fixed",
        bottom: `${coords.bottom}px`,
        right: `${coords.right}px`,
        zIndex: 9999,
      }
    : {
        position: "absolute",
        bottom: "100%",
        right: 0,
        marginBottom: "0.75rem",
        zIndex: 50,
      };

  if (!aiEnabled) return null;

  return (
    <div ref={wrapRef} className="relative inline-flex items-center">
      {/* Trigger Button */}
      <button
        type="button"
        className={`btn btn-sm btn-circle transition-all ${
          open || isLoading
            ? "bg-primary text-primary-content shadow-sm"
            : hasText
              ? "btn-ghost text-primary hover:bg-primary/10"
              : "btn-ghost text-base-content/60 hover:text-primary hover:bg-base-200"
        } ${className}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || isLoading}
        aria-label="AI Writing Assistant"
        aria-haspopup="menu"
        aria-expanded={open}
        title="AI Writing Assistant"
      >
        {isLoading ? (
          <Loader2 className="size-4.5 animate-spin" />
        ) : (
          <Sparkles className="size-4.5" />
        )}
      </button>

      {/* AI Assistant Context Menu */}
      {open &&
        renderPopover(
          <div
            ref={menuRef}
            role="menu"
            style={popoverStyle}
            className="z-50 bottom-full right-0 w-[calc(100vw-2rem)] sm:w-80 max-w-[340px] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl p-2.5 animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-base-300/60 mb-1">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-base-content leading-tight">
                    AI Writing Assistant
                  </p>
                  <p className="text-[10px] text-base-content/60 leading-tight">
                    {hasText ? "Enhance, polish or translate draft" : "Type a draft to enhance"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-base-200 text-base-content/50"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-0.5">
              <ActionRow
                icon={SpellCheck}
                title="Fix Grammar & Spelling"
                desc="Correct typos, punctuation and grammar"
                disabled={!hasText}
                onClick={() => run(() => correctEnglish(text))}
              />
              <ActionRow
                icon={Minimize2}
                title="Make it Shorter"
                desc="Remove filler words and make it concise"
                disabled={!hasText}
                onClick={() => run(() => rewriteText(text, "shorter"))}
              />
              <ActionRow
                icon={Maximize2}
                title="Expand Message"
                desc="Add clear context and reasoning"
                disabled={!hasText}
                onClick={() => run(() => rewriteText(text, "expand"))}
              />
              <ActionRow
                icon={Languages}
                title="Translate to English"
                desc="Turn Hinglish/regional notes into clear English"
                disabled={!hasText}
                onClick={() => run(() => hinglishToEnglish(text))}
              />
            </div>

            {/* Tone Selector */}
            <div className="border-t border-base-300/60 pt-2.5 mt-1.5 px-1">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                Rewrite Tone
              </p>
              <div className="flex flex-wrap gap-1">
                {tones.map((tone) => {
                  const meta = TONE_META[tone] || { emoji: "✨", label: tone };
                  return (
                    <button
                      key={tone}
                      type="button"
                      disabled={!hasText}
                      onClick={() => run(() => rewriteText(text, tone))}
                      className="inline-flex items-center gap-1 rounded-xl border border-base-300 px-2.5 py-1 text-xs font-medium bg-base-200/50 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* Loading Banner */}
      {isLoading &&
        renderPopover(
          <div
            ref={loadingRef}
            style={popoverStyle}
            className="z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-[340px] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl p-4 animate-fade-in"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 animate-spin text-primary" />
              <span className="text-xs font-bold text-base-content">
                {LOADING_TEXT[activeAction] || "Polishing message…"}
              </span>
            </div>
            <div className="space-y-1.5 animate-pulse">
              <div className="h-3 w-10/12 rounded-lg bg-base-300" />
              <div className="h-3 w-8/12 rounded-lg bg-base-300" />
            </div>
          </div>
        )}

      {/* Editable Draft Result Card */}
      {showResult &&
        renderPopover(
          <div
            ref={cardRef}
            style={popoverStyle}
            className="z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-[380px] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-base-300/80 bg-base-200/50 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-6 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <ResultIcon className="size-3.5" />
                </span>
                <p className="truncate text-xs font-bold text-base-content">
                  {result.label}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {diff && (
                  <button
                    type="button"
                    onClick={() => setShowDiff((v) => !v)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                      showDiff
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-base-200 text-base-content/60 hover:text-base-content"
                    }`}
                  >
                    {showDiff ? "Hide Changes" : "Show Changes"}
                  </button>
                )}
                <IconBtn icon={X} label="Dismiss" onClick={clearResult} />
              </div>
            </div>

            {/* Editable Draft Body */}
            <div className="p-3 max-h-56 overflow-y-auto scrollbar-thin">
              {isEditingDraft ? (
                <textarea
                  value={editableValue}
                  onChange={(e) => setEditableValue(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs rounded-xl bg-base-200 border border-base-300 text-base-content focus:outline-none focus:border-primary resize-none"
                  placeholder="Edit AI draft before applying..."
                />
              ) : diff && showDiff ? (
                <div className="p-2 rounded-xl bg-base-200/40 text-xs leading-relaxed">
                  {diff.map((part, i) =>
                    part.type === "same" ? (
                      <span key={i}>{part.text}</span>
                    ) : part.type === "add" ? (
                      <span
                        key={i}
                        className="rounded bg-success/20 text-success font-medium px-0.5"
                      >
                        {part.text}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className="rounded bg-error/15 text-error line-through px-0.5"
                      >
                        {part.text}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDraft(true)}
                  title="Click to edit before applying"
                  className="p-2 rounded-xl bg-base-200/40 text-xs leading-relaxed text-base-content hover:bg-base-200/70 transition-colors cursor-pointer border border-transparent hover:border-base-300"
                >
                  {editableValue}
                </div>
              )}

              <div className="flex items-center justify-between mt-2 text-[10px] text-base-content/50">
                <span className="flex items-center gap-1">
                  <Edit3 className="size-3 text-primary" />
                  <span>Editable suggestion · not sent automatically</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDraft(!isEditingDraft)}
                  className="text-primary hover:underline font-semibold"
                >
                  {isEditingDraft ? "Done Editing" : "Edit Text"}
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-2 border-t border-base-300 px-3 py-2 bg-base-200/40">
              <div className="flex items-center gap-1">
                <IconBtn icon={Copy} label="Copy" onClick={copyResult} />
                <IconBtn icon={RefreshCw} label="Try again" onClick={regenerate} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs rounded-xl"
                  onClick={clearResult}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-xs rounded-xl font-bold gap-1 shadow-2xs"
                  onClick={apply}
                >
                  <Check className="size-3.5" />
                  Apply to Message
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AiAssist;
