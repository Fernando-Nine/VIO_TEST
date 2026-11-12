import { randomBytes } from "node:crypto";
import { createApp } from "../../src/server/app";
import { readConfig } from "../../src/server/config";

/**
 * Server for the showcase (#269). Test lab on, development mode only:
 * `readConfig` itself refuses ENABLE_TEST_LAB=1 in production.
 */
const port = Number(process.env.VITRINE_PORT || 4173);
const config = readConfig({
  ...process.env,
  ENABLE_TEST_LAB: "1",
  // Each test announces its own address (see the spec), so the per-address
  // limits of the real server do not throttle a run where all come from here.
  TRUST_PROXY: "1",
  NODE_ENV: "development",
  PORT: String(port),
  SESSION_SECRET: randomBytes(32).toString("hex"),
  ALLOWED_ORIGINS: `http://127.0.0.1:${port}`,
});
const app = await createApp(config, true);
app.http.listen(port, "127.0.0.1", () =>
  console.log(`Vitrine: http://127.0.0.1:${port}/qa-vitrine`),
);
process.on("SIGTERM", () => void app.close().then(() => process.exit(0)));
process.on("SIGINT", () => void app.close().then(() => process.exit(0)));
