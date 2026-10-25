import { build } from "vite";

// Interface bundled in the Windows installer. It talks to the preview server for
// signaling and points invitations at the public web address.
process.env.NODE_ENV = "production";
process.env.VITE_DESKTOP = "1";
process.env.VITE_API_BASE = "https://vio-test.onrender.com";
process.env.VITE_WEB_URL = "https://vio-test.onrender.com";
await build({
  build: { outDir: "dist/desktop", sourcemap: false, assetsInlineLimit: 0 },
});
console.log("VIO Windows: interface local compilada.");
