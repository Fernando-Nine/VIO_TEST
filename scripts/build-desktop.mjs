import { build } from "vite";
import { channelOf } from "./desktop-channel.mjs";

// Interface bundled in the Windows installer. It talks to its channel's server for
// signaling and points invitations at that public web address (VIO_CHANNEL).
const { server } = channelOf();
process.env.NODE_ENV = "production";
process.env.VITE_DESKTOP = "1";
process.env.VITE_API_BASE = server;
process.env.VITE_WEB_URL = server;
await build({
  build: { outDir: "dist/desktop", sourcemap: false, assetsInlineLimit: 0 },
});
console.log(`VIO Windows: interface local compilada para ${server}.`);
