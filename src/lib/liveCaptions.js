import { axiosInstance } from "./axios";

export const CAPTION_LANGUAGES = Object.freeze([
  { code: "en", name: "English", bcp47: "en-US" },
  { code: "hi", name: "Hindi (हिन्दी)", bcp47: "hi-IN" },
  { code: "gu", name: "Gujarati (ગુજરાતી)", bcp47: "gu-IN" },
  { code: "es", name: "Spanish (Español)", bcp47: "es-ES" },
  { code: "fr", name: "French (Français)", bcp47: "fr-FR" },
  { code: "de", name: "German (Deutsch)", bcp47: "de-DE" },
]);

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  );
}

export class LiveCaptionService {
  constructor({ onTranscript, onStatusChange }) {
    this.recognition = null;
    this.isListening = false;
    this.sourceLanguage = "en-US";
    this.targetLanguage = "en";
    this.onTranscript = onTranscript || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.transcriptHistory = [];
  }

  setLanguages(sourceBcp47, targetCode) {
    this.sourceLanguage = sourceBcp47 || "en-US";
    this.targetLanguage = targetCode || "en";
    if (this.recognition && this.isListening) {
      try {
        this.recognition.lang = this.sourceLanguage;
      } catch {}
    }
  }

  start() {
    if (!isSpeechRecognitionSupported()) {
      console.warn("[liveCaptions] Web Speech API is not supported in this browser.");
      return false;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.sourceLanguage;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatusChange(true);
    };

    this.recognition.onresult = async (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const text = item[0]?.transcript?.trim();
        const isFinal = item.isFinal;

        if (text) {
          let displayText = text;
          // If translation needed and different from source
          if (this.targetLanguage && !this.sourceLanguage.startsWith(this.targetLanguage)) {
            try {
              const res = await axiosInstance.post("/calls/translate", {
                text,
                sourceLang: this.sourceLanguage.slice(0, 2),
                targetLang: this.targetLanguage,
              });
              if (res.data?.data?.translatedText) {
                displayText = res.data.data.translatedText;
              }
            } catch (err) {
              // Gracefully fall back to original text if translation endpoint fails
            }
          }

          if (isFinal) {
            this.transcriptHistory.push({
              id: Date.now() + Math.random(),
              speaker: "You",
              text: displayText,
              originalText: text,
              timestamp: new Date().toLocaleTimeString(),
            });
          }

          this.onTranscript({
            speaker: "You",
            text: displayText,
            isFinal,
            timestamp: Date.now(),
          });
        }
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error !== "no-speech") {
        console.warn("[liveCaptions] recognition error:", e.error);
      }
    };

    this.recognition.onend = () => {
      // Auto restart if still marked as listening
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch {}
      } else {
        this.onStatusChange(false);
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.error("[liveCaptions] failed to start:", err);
      return false;
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.onStatusChange(false);
  }

  addRemoteCaption({ speaker, text, isFinal, timestamp }) {
    if (isFinal && text) {
      this.transcriptHistory.push({
        id: Date.now() + Math.random(),
        speaker: speaker || "Peer",
        text,
        timestamp: new Date(timestamp || Date.now()).toLocaleTimeString(),
      });
    }
  }

  clearHistory() {
    this.transcriptHistory = [];
  }

  exportHistoryAsText() {
    if (!this.transcriptHistory.length) return "";
    const lines = this.transcriptHistory.map(
      (entry) => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`
    );
    return lines.join("\n");
  }
}
