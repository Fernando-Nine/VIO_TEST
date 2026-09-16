import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", sourcemap: false },
  server: {
    middlewareMode: true,
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
});
