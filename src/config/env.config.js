const LOCAL_API = "http://localhost:8080/api/v1";
const LOCAL_SOCKET = "http://localhost:8080";
const PRODUCTION_API = "https://chatty-backend-2l2t.onrender.com/api/v1";
const PRODUCTION_SOCKET = "https://chatty-backend-2l2t.onrender.com";

const metaEnv =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env
    : {};

const proc =
  typeof globalThis !== "undefined" && globalThis.process
    ? globalThis.process
    : undefined;
const procEnv = proc && typeof proc.env === "object" ? proc.env : {};

const DEV = Boolean(
  metaEnv.DEV ?? (procEnv.NODE_ENV !== "production"),
);
const PROD = Boolean(
  metaEnv.PROD ?? (procEnv.NODE_ENV === "production"),
);
const MODE = metaEnv.MODE || (PROD ? "production" : "development");
const VITE_API_URL =
  metaEnv.VITE_API_URL ||
  procEnv.VITE_API_URL ||
  "";
const VITE_SOCKET_URL =
  metaEnv.VITE_SOCKET_URL ||
  procEnv.VITE_SOCKET_URL ||
  "";

let resolvedApiUrl = (
  VITE_API_URL || (DEV ? LOCAL_API : PROD ? PRODUCTION_API : "")
)
  .trim()
  .replace(/\/+$/, "");

let resolvedSocketUrl = (
  VITE_SOCKET_URL || (DEV ? LOCAL_SOCKET : PROD ? PRODUCTION_SOCKET : "")
)
  .trim()
  .replace(/\/+$/, "");

if (resolvedApiUrl.startsWith("/")) {
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEV
        ? "http://localhost:8080"
        : PRODUCTION_SOCKET;
  resolvedApiUrl = `${base}${resolvedApiUrl}`;
}

if (!resolvedSocketUrl) {
  resolvedSocketUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEV
        ? LOCAL_SOCKET
        : PRODUCTION_SOCKET;
}

if (!DEV && !PROD) {
  throw new Error("[Chatty Config] Unsupported application environment.");
}

if (!resolvedApiUrl || !resolvedSocketUrl) {
  throw new Error("[Chatty Config] Missing environment configuration.");
}

let apiParsed;
let socketParsed;

try {
  apiParsed = new URL(resolvedApiUrl);
  socketParsed = new URL(resolvedSocketUrl);
} catch {
  throw new Error("[Chatty Config] Invalid API or Socket URL configuration.");
}

if (DEV) {
  const isProductionHost = (hostname) =>
    hostname === "chatty-backend-2l2t.onrender.com";

  if (
    isProductionHost(apiParsed.hostname) ||
    isProductionHost(socketParsed.hostname)
  ) {
    throw new Error(
      "[Chatty Config] Production connection blocked in development.",
    );
  }

  const allowedLocalHosts = ["localhost", "127.0.0.1", "::1"];

  if (
    !allowedLocalHosts.includes(apiParsed.hostname) ||
    !allowedLocalHosts.includes(socketParsed.hostname)
  ) {
    throw new Error(
      "[Chatty Config] Only local backend connections are allowed in development.",
    );
  }
}

if (PROD) {
  if (apiParsed.protocol !== "https:" || socketParsed.protocol !== "https:") {
    throw new Error("[Chatty Config] HTTPS is required in production.");
  }

  if (
    ["localhost", "127.0.0.1", "::1"].includes(apiParsed.hostname) ||
    ["localhost", "127.0.0.1", "::1"].includes(socketParsed.hostname)
  ) {
    throw new Error(
      "[Chatty Config] Localhost connections are blocked in production.",
    );
  }
}

export const API_URL = apiParsed.href.replace(/\/+$/, "");
export const SOCKET_URL = socketParsed.origin;
export const IS_DEV = DEV;
export const IS_PROD = PROD;
export const APP_MODE = MODE;

const ENV_CONFIG = Object.freeze({
  API_URL,
  SOCKET_URL,
  IS_DEV,
  IS_PROD,
  APP_MODE,
});

export default ENV_CONFIG;
