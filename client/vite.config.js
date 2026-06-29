import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pure dApp: the browser talks straight to the chain (MetaMask + RPC),
// so there's no API server to proxy to.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
});
