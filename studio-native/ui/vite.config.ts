import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri serves the built `dist/` (frontendDist) or the dev server on 5173.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Tauri targets modern webviews; skip legacy transpilation.
    target: "esnext",
    emptyOutDir: true,
  },
});
