import { createApp } from "./app";
import { log } from "./security";
import { readConfig } from "./config";
const portFlag = process.argv.indexOf("--port");
const config = readConfig({
  ...process.env,
  ...(portFlag >= 0 ? { PORT: process.argv[portFlag + 1] } : {}),
});
const server = await createApp(config, process.argv.includes("--dev"));
server.http.listen(server.config.port, "0.0.0.0", () =>
  log("listening", { port: server.config.port }),
);
let stopping = false;
for (const event of ["SIGINT", "SIGTERM"] as const)
  process.on(event, () => {
    if (stopping) return;
    stopping = true;
    log("shutdown");
    const timeout = setTimeout(() => process.exit(1), 25000);
    timeout.unref();
    void server.close().then(() => process.exit(0));
  });
