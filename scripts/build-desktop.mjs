import { build } from "vite";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// The native package and its IPC must never load the remote web application.
// These two endpoints only carry room signaling and public invitations.
const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
const result = spawnSync(process.execPath, ["scripts/build.mjs"], {
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status || 1);
process.env.NODE_ENV = "production";
process.env.VITE_DESKTOP = "1";
process.env.VITE_DESKTOP_VERSION = config.version;
process.env.VITE_API_BASE = "https://vio-test.onrender.com";
process.env.VITE_WEB_URL = "https://vio-test.onrender.com";
await build({ build: { outDir: "dist/desktop", sourcemap: false, assetsInlineLimit: 0 } });
console.log(
  `VIO Windows ${config.version}: interface local e captura WASAPI preparadas.`,
);
