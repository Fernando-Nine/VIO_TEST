import { defineConfig } from "@playwright/test";
import { TELAS_DA_RODADA } from "./tests/vitrine/config";

const port = Number(process.env.VITRINE_PORT || 4173);

export default defineConfig({
  testDir: "tests/vitrine",
  testMatch: "*.spec.ts",
  outputDir: "test-results/vitrine",
  snapshotPathTemplate: "{testDir}/base/{arg}{ext}",
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  timeout: 60_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    reducedMotion: "reduce",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "dark",
    trace: "off",
    // CI installs the browser; locally VITRINE_CHROMIUM may point to one.
    launchOptions: {
      executablePath: process.env.VITRINE_CHROMIUM || undefined,
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
  },
  projects: TELAS_DA_RODADA.map((tela) => ({
    name: tela.nome,
    use: {
      viewport: { width: tela.width, height: tela.height },
      isMobile: tela.toque,
      hasTouch: tela.toque,
    },
  })),
  webServer: {
    command: "node --import tsx tests/vitrine/servidor.ts",
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITRINE_PORT: String(port) },
  },
});
