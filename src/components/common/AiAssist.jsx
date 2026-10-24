import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
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
};

const LOADING_TEXT = {
  correct: "Fixing grammar…",
  hinglish: "Translating to English…",
  rewrite: "Rewriting your message…",
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
    className="group w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-base-200 focus-visible:bg-base-200 outline-none disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
  >
    <span className="size-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
      <Icon className="size-[18px]" />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium leading-tight">{title}</span>
      <span className="block text-xs text-base-content/60 leading-snug">
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

const AiAssist = ({ text, onApply, disabled = false, resetKey }) => {
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

  // user settings (Settings > AI Assistant)
  const { aiEnabled, aiDefaultTone, aiShowChanges } = useSettingsStore(
    (st) => st.settings,
  );

  const [open, setOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(aiShowChanges);
  const wrapRef = useRef(null);
  const lastRunRef = useRef(null); // remembers last action so "Regenerate" works

  const hasText = text.trim().length > 0;

  // keep the "Show changes" chip in sync with the setting
  useEffect(() => {
    setShowDiff(aiShowChanges);
  }, [aiShowChanges]);

  // default tone first in the list
  const tones = useMemo(
    () =>
      AI_TONES.includes(aiDefaultTone)
        ? [aiDefaultTone, ...AI_TONES.filter((t) => t !== aiDefaultTone)]
        : AI_TONES,
    [aiDefaultTone],
  );

  useEffect(() => {
    setOpen(false);
    reset();
    return () => reset();
  }, [resetKey, reset]);

  // close menu on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
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
    if (!result) return;
    onApply(result.value.slice(0, 2000));
    clearResult();
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result.value);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const diff = useMemo(() => {
    if (!result || result.action !== "correct") return null;
    if (result.original === result.value) return null;
    return diffWords(result.original, result.value);
  }, [result]);

  const ResultIcon = ACTION_ICON[result?.action] || Sparkles;
  const showResult = Boolean(result) && !isLoading && !open;

  // AI turned off in Settings -> hide everything (must stay after all hooks)
  if (!aiEnabled) return null;

  return (
    <div ref={wrapRef} className="contents">
      {/* Trigger */}
      <button
        type="button"
        className={`btn btn-sm btn-circle border-0 transition-all ${
          open || isLoading
            ? "bg-gradient-to-br from-primary to-secondary text-primary-content shadow-md"
            : hasText
              ? "btn-ghost text-primary hover:bg-primary/10"
              : "btn-ghost text-base-content/60"
        }`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || isLoading}
        aria-label="AI assist"
        aria-haspopup="menu"
        aria-expanded={open}
        title="AI assist"
      >
        {isLoading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Sparkles className="size-5" />
        )}
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 border-b border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
            <span className="size-8 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">AI Assist</p>
              <p className="text-[11px] leading-tight text-base-content/60">
                {hasText
                  ? "Improve your message before sending"
                  : "Type a message first to use AI"}
              </p>
            </div>
          </div>

          <div className="p-2">
            <ActionRow
              icon={SpellCheck}
              title="Fix grammar"
              desc="Correct spelling, grammar & punctuation"
              disabled={!hasText}
              onClick={() => run(() => correctEnglish(text))}
            />
            <ActionRow
              icon={Languages}
              title="Hinglish → English"
              desc="Turn Hinglish into natural English"
              disabled={!hasText}
              onClick={() => run(() => hinglishToEnglish(text))}
            />
          </div>

          <div className="border-t border-base-300 px-4 pb-3 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">
              Rewrite in a tone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tones.map((tone, i) => {
                const meta = TONE_META[tone] || { emoji: "✨", label: tone };
                return (
                  <button
                    key={tone}
                    type="button"
                    disabled={!hasText}
                    title={i === 0 ? "Your default tone" : undefined}
                    onClick={() => run(() => rewriteText(text, tone))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:border-base-300 disabled:hover:bg-base-100 disabled:hover:text-inherit disabled:cursor-not-allowed ${
                      i === 0
                        ? "border-primary/60 bg-primary/5 text-primary"
                        : "border-base-300 bg-base-100"
                    }`}
                  >
                    <span aria-hidden="true">{meta.emoji}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-40 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2.5">
            <Sparkles className="size-4 animate-pulse text-primary" />
            <p className="text-xs font-medium text-base-content/70">
              {LOADING_TEXT[activeAction] || "Working on it…"}
            </p>
          </div>
          <div className="animate-pulse space-y-2 px-4 py-3">
            <div className="h-3 w-11/12 rounded bg-base-300" />
            <div className="h-3 w-9/12 rounded bg-base-300" />
            <div className="h-3 w-6/12 rounded bg-base-300" />
          </div>
        </div>
      )}

      {/* Result card */}
      {showResult && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-40 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
          {/* header */}
          <div className="flex items-center justify-between gap-2 border-b border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-6 shrink-0 rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center">
                <ResultIcon className="size-3.5" />
              </span>
              <p className="truncate text-sm font-semibold">{result.label}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {diff && (
                <button
                  type="button"
                  onClick={() => setShowDiff((v) => !v)}
                  className={`mr-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    showDiff
                      ? "bg-primary/15 text-primary"
                      : "bg-base-200 text-base-content/60 hover:text-base-content"
                  }`}
                >
                  Show changes
                </button>
              )}
              <IconBtn icon={X} label="Dismiss" onClick={clearResult} />
            </div>
          </div>

          {/* body */}
          <div className="max-h-52 overflow-y-auto px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
              {diff && showDiff
                ? diff.map((part, i) =>
                    part.type === "same" ? (
                      <span key={i}>{part.text}</span>
                    ) : part.type === "add" ? (
                      <span
                        key={i}
                        className="rounded bg-success/20 px-0.5 font-medium text-success"
                      >
                        {part.text}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className="rounded bg-error/15 px-0.5 text-error line-through decoration-error/60"
                      >
                        {part.text}
                      </span>
                    ),
                  )
                : result.value}
            </p>

            {result.changes.length > 0 && (
              <details className="group mt-3 rounded-xl bg-base-200/60 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-base-content/70">
                  <span>
                    {result.changes.length}{" "}
                    {result.changes.length === 1 ? "fix" : "fixes"} made
                  </span>
                  <span className="text-[10px] text-base-content/50 group-open:hidden">
                    View
                  </span>
                  <span className="hidden text-[10px] text-base-content/50 group-open:inline">
                    Hide
                  </span>
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-base-content/70">
                  {result.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center justify-between gap-2 border-t border-base-300 bg-base-200/40 px-3 py-2">
            <div className="flex items-center">
              <IconBtn icon={Copy} label="Copy" onClick={copyResult} />
              <IconBtn
                icon={RefreshCw}
                label="Try again"
                onClick={regenerate}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={clearResult}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn-primary btn-xs gap-1"
                onClick={apply}
              >
                <Check className="size-3.5" />
                Use this
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssist;
