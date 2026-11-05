// Generates src/shared/build-info.json (not committed): pending release notes from
// changes/ and the short commit of this build. Runs before dev, typecheck, test and build.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface ChangelogRelease {
  version: string;
  date: string | null;
  title: string;
  legacy?: boolean;
  sections: { title: string; items: string[] }[];
}

export interface BuildInfo {
  commit: string | null;
  notes: string[];
}

const notePattern = /^(\d+)-[a-z0-9-]+\.md$/;

/** One paragraph per file, ordered by issue number; README.md is documentation. */
export function readPendingNotes(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const notes = names
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => {
      const match = notePattern.exec(name);
      if (!match)
        throw new Error(
          `changes/${name}: use o nome <issue>-<slug>.md (ex.: 281-avisos-layout.md).`,
        );
      const text = readFileSync(`${dir}/${name}`, "utf8").trim();
      if (!text || /\n\s*\n/.test(text))
        throw new Error(`changes/${name}: escreva um único parágrafo.`);
      return { issue: Number(match[1]), name, text: text.replace(/\s+/g, " ") };
    });
  return notes
    .sort((a, b) => a.issue - b.issue || a.name.localeCompare(b.name))
    .map((note) => note.text);
}

/** Render exposes the deployed commit; it is public (AGPL source), never a secret. */
export function shortCommit(value: string | undefined): string | null {
  return value && /^[0-9a-f]{7,40}$/i.test(value)
    ? value.slice(0, 7).toLowerCase()
    : null;
}

export function writeBuildInfo(root = "."): BuildInfo {
  const info: BuildInfo = {
    commit: shortCommit(process.env.RENDER_GIT_COMMIT),
    notes: readPendingNotes(`${root}/changes`),
  };
  const path = `${root}/src/shared/build-info.json`;
  const text = JSON.stringify(info, null, 2) + "\n";
  let previous = "";
  try {
    previous = readFileSync(path, "utf8");
  } catch {
    // First run after a fresh clone.
  }
  if (previous !== text) writeFileSync(path, text);
  return info;
}

/** CHANGELOG.md lists only registered releases: pending notes would change it on every PR. */
export function renderChangelog(
  releases: ChangelogRelease[],
  legacyLog: string,
): string {
  return (
    "# VIO — histórico de versões\n\n" +
    "> **MUDANÇA DE SISTEMA NA 2.0.0:** nova implementação, criada do zero. O histórico anterior foi preservado integralmente a partir somente do CHANGELOG.md de Fernando-Nine/VIO_2.\n\n" +
    releases
      .filter((release) => !release.legacy)
      .map(
        (release) =>
          `## [${release.version}] - ${release.date ?? "prevista"}\n\n${release.title}\n\n` +
          release.sections
            .map(
              (section) =>
                `### ${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`,
            )
            .join("\n\n"),
      )
      .join("\n\n") +
    "\n\n---\n\n# Registro integral do sistema anterior\n\nFonte: https://github.com/Fernando-Nine/VIO_2/blob/main/CHANGELOG.md\nBlob Git: `458665f5a357c0f0f1c261d055e5e18429839d9c`\n\n" +
    legacyLog
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeBuildInfo();
