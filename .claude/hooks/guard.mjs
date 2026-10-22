// PreToolUse guard for Bash. Exit code 2 blocks the call and shows stderr to the agent.
import { execFileSync } from "node:child_process";

const input = JSON.parse(
  await new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data || "{}"));
  }),
);
const command = String(input?.tool_input?.command ?? "");
const cwd = input?.cwd || process.cwd();

const block = (reason) => {
  process.stderr.write(`Bloqueado pela trava do VIO: ${reason}\n`);
  process.exit(2);
};

const git = (...args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

// Each shell segment is checked on its own so "cd x && git push" is still caught.
for (const segment of command.split(/&&|\|\||;|\n/)) {
  const words = segment.trim().split(/\s+/);
  const at = words.indexOf("git");
  if (at === -1) continue;
  const args = words.slice(at + 1).filter((word) => !word.startsWith("-C"));
  const sub = args.find((word) => !word.startsWith("-"));

  if (sub === "push") {
    if (
      args.some(
        (a) =>
          a === "--force" ||
          a === "-f" ||
          /^-[a-z]*f[a-z]*$/.test(a) ||
          a.startsWith("+"),
      )
    )
      block(
        "force push é proibido. Use --force-with-lease apenas no seu próprio branch.",
      );
    const targets = args
      .slice(args.indexOf("push") + 1)
      .filter((a) => !a.startsWith("-"));
    const refs = targets.slice(1);
    if (refs.some((r) => /(^|:|refs\/heads\/)main$/.test(r)))
      block(
        "push direto na main. Abra uma PR (CLAUDE.md → Ambientes e fluxo).",
      );
    if (
      refs.length === 0 &&
      git("rev-parse", "--abbrev-ref", "HEAD") === "main"
    )
      block("push direto na main. Crie um branch e abra uma PR.");
  }

  if (sub === "commit") {
    const staged = git("diff", "--cached", "--name-only").split("\n");
    const secret = staged.find(
      (f) =>
        /(^|\/)\.env(\.(?!example$).+)?$/.test(f) || /\.(pem|key)$/.test(f),
    );
    if (secret)
      block(
        `arquivo com segredo no commit (${secret}). Remova com git restore --staged.`,
      );
  }
}
