import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/v1": {
        target: "https://chatty-backend-2l2t.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
