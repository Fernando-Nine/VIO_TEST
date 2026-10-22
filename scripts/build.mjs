import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { releases, version } from "../src/shared/releases.ts";
// A local development .env must never include the test lab in a release build.
process.env.NODE_ENV = "production";
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.version !== version)
  throw new Error("Sincronize package.json com src/shared/releases.ts.");
const changelog =
  "# VIO — histórico de versões\n\n" +
  "> **MUDANÇA DE SISTEMA NA 2.0.0:** nova implementação, criada do zero. O histórico anterior foi preservado integralmente a partir somente do CHANGELOG.md de Fernando-Nine/VIO_2.\n\n" +
  releases
    .filter((release) => !release.legacy)
    .map(
      (release) =>
        `## [${release.version}] - ${release.date}\n\n${release.title}\n\n` +
        release.sections
          .map(
            (section) =>
              `### ${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`,
          )
          .join("\n\n"),
    )
    .join("\n\n") +
  "\n\n---\n\n# Registro integral do sistema anterior\n\nFonte: https://github.com/Fernando-Nine/VIO_2/blob/main/CHANGELOG.md\nBlob Git: `458665f5a357c0f0f1c261d055e5e18429839d9c`\n\n" +
  (await readFile("docs/CHANGELOG-VIO_2.md", "utf8"));
await writeFile("CHANGELOG.md", changelog);
await viteBuild();
await esbuild({
  entryPoints: ["src/server/index.ts"],
  outfile: "dist/server/index.js",
  platform: "node",
  format: "esm",
  target: "node24",
  bundle: true,
  packages: "external",
  sourcemap: false,
});
await mkdir("dist", { recursive: true });
// Explicit allowlist prevents publishing .env, local session data or dependency caches.
const sources = [
  "src",
  "public",
  "tests",
  "scripts",
  "docs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "README.md",
  "CHANGELOG.md",
  ".claude",
  "CLAUDE.md",
  "LICENSE",
  "render.yaml",
  "Dockerfile",
  "compose.yaml",
  ".dockerignore",
  ".env.example",
  ".nvmrc",
  ".gitignore",
];
const result = spawnSync("tar", ["-czf", "dist/source.tar.gz", ...sources], {
  stdio: "inherit",
});
if (result.status !== 0)
  throw new Error(
    "Não foi possível gerar o arquivo de código-fonte. Instale tar (incluído no Windows recente e nas imagens Node Debian).",
  );
console.log(`VIO ${version}: cliente, servidor e código-fonte compilados.`);
