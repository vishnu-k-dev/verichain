import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward API calls to the relayer so the UI can just use /api.
    proxy: { "/api": "http://localhost:5000" },
  },
  preview: {
    port: 4173,
    proxy: { "/api": "http://localhost:5000" },
  },
});
