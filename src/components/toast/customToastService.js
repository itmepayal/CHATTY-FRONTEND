/**
 * Centralized Custom Toast Service
 * Imperative event-driven toast store callable from anywhere:
 * React components, custom hooks, Zustand stores, API interceptors, socket listeners, and utility libraries.
 */

const DEFAULT_DURATIONS = {
  success: 4000,
  error: 6000,
  info: 4500,
  warning: 5500,
  loading: Infinity,
  default: 4500,
};

const MAX_TOASTS = 5;
const DEDUP_WINDOW_MS = 1500;

class CustomToastService {
  constructor() {
    this.toasts = [];
    this.listeners = new Set();
    this.timers = new Map();
    this.recentKeys = new Map();
    this.idCounter = 0;
  }

  _generateId() {
    this.idCounter += 1;
    return `custom-toast-${Date.now()}-${this.idCounter}`;
  }

  _notify() {
    const snapshot = [...this.toasts];
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error("[CustomToastService] Listener error:", err);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getToasts() {
    return [...this.toasts];
  }

  /**
   * Internal method to create or update a toast
   */
  _show(type, content, options = {}) {
    const isRenderFn = typeof content === "function";
    const isReactElement =
      typeof content === "object" && content !== null && !options.message;

    let message = "";
    let title = options.title || "";
    let render = null;

    if (isRenderFn) {
      render = content;
    } else if (isReactElement) {
      render = () => content;
    } else {
      message = typeof content === "string" ? content : String(content || "");
    }

    const duration =
      options.duration !== undefined
        ? options.duration
        : DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.default;

    const toastId = options.id || this._generateId();

    // Deduplication check
    const dedupKey = options.id || `${type}:${message}:${title}`;
    const now = Date.now();
    const lastSeen = this.recentKeys.get(dedupKey);

    if (!options.id && lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      return toastId;
    }
    this.recentKeys.set(dedupKey, now);

    // Clean up stale deduplication keys
    if (this.recentKeys.size > 50) {
      for (const [key, timestamp] of this.recentKeys.entries()) {
        if (now - timestamp > DEDUP_WINDOW_MS * 2) {
          this.recentKeys.delete(key);
        }
      }
    }

    const existingIndex = this.toasts.findIndex((t) => t.id === toastId);

    const toastItem = {
      id: toastId,
      type: type || "info",
      title,
      message,
      render,
      duration,
      action: options.action || null,
      dismissible: options.dismissible !== false,
      createdAt: now,
      pausedAt: null,
      remainingTime: duration,
      ...options,
    };

    if (existingIndex >= 0) {
      // Clear old timer if updating existing
      this._clearTimer(toastId);
      this.toasts[existingIndex] = {
        ...this.toasts[existingIndex],
        ...toastItem,
      };
    } else {
      // Enforce max toasts limit (remove oldest auto-dismissable toast)
      if (this.toasts.length >= MAX_TOASTS) {
        const oldestDismissable = this.toasts.find(
          (t) => t.type !== "loading" && t.duration !== Infinity
        );
        if (oldestDismissable) {
          this.dismiss(oldestDismissable.id);
        } else {
          this.dismiss(this.toasts[0].id);
        }
      }
      this.toasts.push(toastItem);
    }

    // Schedule auto-dismissal
    if (duration !== Infinity && duration > 0) {
      this._scheduleTimer(toastId, duration);
    }

    this._notify();
    return toastId;
  }

  _scheduleTimer(id, duration) {
    this._clearTimer(id);
    const timer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
    this.timers.set(id, timer);
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  pause(id) {
    const toast = this.toasts.find((t) => t.id === id);
    if (!toast || toast.duration === Infinity || toast.pausedAt) return;

    this._clearTimer(id);
    const now = Date.now();
    const elapsed = now - (toast.resumedAt || toast.createdAt);
    toast.remainingTime = Math.max(0, (toast.remainingTime || toast.duration) - elapsed);
    toast.pausedAt = now;
    this._notify();
  }

  resume(id) {
    const toast = this.toasts.find((t) => t.id === id);
    if (!toast || toast.duration === Infinity || !toast.pausedAt) return;

    const remaining = toast.remainingTime > 0 ? toast.remainingTime : 1000;
    toast.pausedAt = null;
    toast.resumedAt = Date.now();

    this._scheduleTimer(id, remaining);
    this._notify();
  }

  dismiss(id) {
    if (!id) {
      this.dismissAll();
      return;
    }
    this._clearTimer(id);
    const prevCount = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== prevCount) {
      this._notify();
    }
  }

  dismissAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.toasts = [];
    this._notify();
  }

  update(id, options = {}) {
    const existing = this.toasts.find((t) => t.id === id);
    if (!existing) return;

    const type = options.type || existing.type;
    const content = options.message !== undefined ? options.message : existing.message;
    return this._show(type, content, { ...existing, ...options, id });
  }

  /**
   * Main invocation function: customToast(content, options)
   */
  notify(content, options = {}) {
    return this._show(options.type || "info", content, options);
  }

  success(content, options = {}) {
    return this._show("success", content, options);
  }

  error(content, options = {}) {
    return this._show("error", content, options);
  }

  info(content, options = {}) {
    return this._show("info", content, options);
  }

  warning(content, options = {}) {
    return this._show("warning", content, options);
  }

  loading(content, options = {}) {
    return this._show("loading", content, {
      duration: Infinity,
      dismissible: true,
      ...options,
    });
  }

  promise(promise, msgs = {}, options = {}) {
    const id = this.loading(msgs.loading || "Loading...", options);

    return promise
      .then((data) => {
        const successMsg =
          typeof msgs.success === "function" ? msgs.success(data) : msgs.success;
        this.success(successMsg || "Completed successfully", {
          id,
          ...options,
        });
        return data;
      })
      .catch((err) => {
        const errorMsg =
          typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        this.error(errorMsg || err?.message || "Something went wrong", {
          id,
          ...options,
        });
        throw err;
      });
  }
}

export const customToastService = new CustomToastService();

/**
 * Callable customToast function + namespace
 * Usage:
 *   customToast("Message")
 *   customToast.success("Saved!")
 *   customToast.error("Failed")
 *   customToast.info("Note")
 *   customToast.warning("Careful")
 *   customToast.loading("Working...")
 *   customToast.dismiss(id)
 *   customToast.dismissAll()
 *   customToast.update(id, options)
 *   customToast.promise(promise, msgs, options)
 */
export const customToast = Object.assign(
  (content, options) => customToastService.notify(content, options),
  {
    success: (content, options) => customToastService.success(content, options),
    error: (content, options) => customToastService.error(content, options),
    info: (content, options) => customToastService.info(content, options),
    warning: (content, options) => customToastService.warning(content, options),
    loading: (content, options) => customToastService.loading(content, options),
    dismiss: (id) => customToastService.dismiss(id),
    dismissAll: () => customToastService.dismissAll(),
    update: (id, options) => customToastService.update(id, options),
    promise: (promise, msgs, options) =>
      customToastService.promise(promise, msgs, options),
    subscribe: (listener) => customToastService.subscribe(listener),
    getToasts: () => customToastService.getToasts(),
  }
);

// Backward-compatible alias
export const toast = customToast;
export default customToast;
