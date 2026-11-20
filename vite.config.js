import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target =
    env.VITE_BACKEND_URL ||
    env.VITE_SOCKET_URL ||
    (env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") : null) ||
    process.env.VITE_BACKEND_URL ||
    process.env.VITE_SOCKET_URL ||
    "http://localhost:8080";

  return {
    plugins: [react(), tailwindcss()],

    server: {
      proxy: {
        "/api/v1": {
          target,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
