import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development the Laravel API is proxied so the SPA and API share one origin:
// Sanctum session cookies + CSRF then work without CORS. The Host header is kept
// (changeOrigin: false) so Laravel resolves the tenant from the browser's hostname.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target, changeOrigin: false },
        "/sanctum": { target, changeOrigin: false },
      },
    },
  };
});
