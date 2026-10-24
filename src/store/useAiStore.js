import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

export const AI_MAX_TEXT_LENGTH = 2000;
export const AI_CHAT_MAX_LENGTH = 400;
export const AI_TONES = [
  "formal",
  "casual",
  "friendly",
  "professional",
  "persuasive",
];

let requestSeq = 0;

const unwrap = (res) => res?.data?.data ?? {};

export const isAiAbort = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

const errorMessage = (error) => {
  if (error?.response?.status === 429) {
    return "Too many AI requests. Please wait a minute.";
  }
  return (
    error?.response?.data?.message ||
    "AI is unavailable right now. Please try again."
  );
};

export const useAiStore = create((set, get) => ({
  isLoading: false,
  activeAction: null,
  result: null,

  _run: async ({ action, label, text, request, pick }) => {
    const clean = (text || "").trim();
    if (!clean) {
      toast.error("Type something first.");
      return null;
    }
    if (clean.length > AI_MAX_TEXT_LENGTH) {
      toast.error(`Text must be at most ${AI_MAX_TEXT_LENGTH} characters.`);
      return null;
    }

    const seq = ++requestSeq;
    set({ isLoading: true, activeAction: action, result: null });

    try {
      const res = await request(clean);
      if (seq !== requestSeq) return null; // stale

      const data = unwrap(res);
      const picked = pick(data);
      if (!picked.value) throw new Error("Empty AI response");

      const result = {
        action,
        label,
        original: clean,
        value: picked.value,
        changes: picked.changes ?? [],
      };
      set({ result });
      return result;
    } catch (error) {
      if (seq !== requestSeq) return null;
      console.error(`AI ${action} error:`, error);
      toast.error(errorMessage(error));
      return null;
    } finally {
      if (seq === requestSeq) set({ isLoading: false, activeAction: null });
    }
  },

  correctEnglish: (text) =>
    get()._run({
      action: "correct",
      label: "Grammar fixed",
      text,
      request: (t) =>
        axiosInstance.post(
          "/ai/correct",
          { text: t },
          { withCredentials: true },
        ),
      pick: (d) => ({
        value: d.corrected,
        changes: Array.isArray(d.changes) ? d.changes : [],
      }),
    }),

  rewriteText: (text, tone) => {
    if (!AI_TONES.includes(tone)) {
      toast.error("Invalid tone.");
      return Promise.resolve(null);
    }
    return get()._run({
      action: "rewrite",
      label: `Rewritten (${tone})`,
      text,
      request: (t) =>
        axiosInstance.post(
          "/ai/rewrite",
          { text: t, tone },
          { withCredentials: true },
        ),
      pick: (d) => ({ value: d.rewritten }),
    });
  },

  hinglishToEnglish: (text) =>
    get()._run({
      action: "hinglish",
      label: "Translated to English",
      text,
      request: (t) =>
        axiosInstance.post(
          "/ai/hinglish",
          { text: t },
          { withCredentials: true },
        ),
      pick: (d) => ({ value: d.translated }),
    }),

  askChatbot: async (history, { signal } = {}) => {
    const last = history?.[history.length - 1];
    if (!last || last.role !== "user" || !last.content?.trim()) {
      throw new Error("Type something first.");
    }
    if (last.content.length > AI_CHAT_MAX_LENGTH) {
      throw new Error(
        `Message must be at most ${AI_CHAT_MAX_LENGTH} characters.`,
      );
    }

    try {
      const res = await axiosInstance.post(
        "/ai/chatbot",
        { messages: history },
        { withCredentials: true, signal },
      );
      const reply = (unwrap(res).reply || "").trim();
      if (!reply) throw new Error("Empty AI response");
      return reply;
    } catch (error) {
      if (isAiAbort(error)) throw error;
      console.error("AI chatbot error:", error);
      throw new Error(errorMessage(error));
    }
  },

  clearResult: () => set({ result: null }),

  reset: () => {
    requestSeq++;
    set({ isLoading: false, activeAction: null, result: null });
  },
}));
