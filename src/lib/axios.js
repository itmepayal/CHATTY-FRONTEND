import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta?.env?.VITE_API_URL ||
    "https://chatty-backend-2l2t.onrender.com/api/v1",
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

let unlockTokenProvider = null;
export const setUnlockTokenProvider = (fn) => {
  unlockTokenProvider = fn;
};

axiosInstance.interceptors.request.use((config) => {
  if (unlockTokenProvider && !config.headers["X-Chat-Unlock-Token"]) {
    try {
      const token = unlockTokenProvider(config);
      if (token) {
        config.headers["X-Chat-Unlock-Token"] = token;
      }
    } catch {}
  }
  return config;
});

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 423) {
      let chatId = null;
      const matchMsg = error.config?.url?.match(/\/messages\/([a-f0-9]{24})/i);
      const matchGrp = error.config?.url?.match(/\/groups\/([a-f0-9]{24})/i);
      if (matchMsg) chatId = matchMsg[1];
      else if (matchGrp) chatId = matchGrp[1];
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatty:chat-locked", { detail: { chatId } }),
        );
      }
      return Promise.reject(error);
    }

    if (
      !error.response ||
      error.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/check")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axiosInstance.post("/auth/refresh", {}, { withCredentials: true });
      processQueue(null);
      return axiosInstance(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatty:session-revoked"));
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

