import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { releases, version } from "../src/shared/releases.ts";
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (pkg.version !== version)
  throw new Error("Sincronize package.json com src/shared/releases.ts.");
const changelog =
  "# VIO — histórico desta implementação\n\nFonte: `src/shared/releases.ts`. Este arquivo é gerado no build.\n\n" +
  releases
    .map(
      (r) =>
        `## ${r.version} — ${r.date}\n\n${r.title}\n\n` +
        r.changes.map((c) => `- ${c}`).join("\n"),
    )
    .join("\n\n") +
  "\n";
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
  "ESTADO-DO-PROJETO.md",
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
