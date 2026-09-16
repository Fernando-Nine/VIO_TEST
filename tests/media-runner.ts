import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
const config = readConfig({
  ...process.env,
  ENABLE_TEST_LAB: "1",
  NODE_ENV: "development",
});
const app = await createApp(config, true);
app.http.listen(config.port, "0.0.0.0", () =>
  console.log(
    `Laboratório de mídia: http://localhost:${config.port}/qa\nAbra no navegador e clique em Executar testes de mídia.`,
  ),
);
process.on("SIGINT", () => void app.close().then(() => process.exit(0)));
