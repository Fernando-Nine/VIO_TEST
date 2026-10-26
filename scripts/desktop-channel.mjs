import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Two Windows apps from the same code. "stable" (VIO) is built only by the VIO
// repository from a vX.Y.Z tag and signed with the production key, which lives only
// there. "beta" (VIO Teste) is built by VIO_TEST on every merge with the test key.
// Each reads its own feed in vio-releases, so one never installs the other.
const releases = "https://github.com/Fernando-Nine/vio-releases/releases";

export const channels = {
  stable: {
    productName: "VIO",
    identifier: "studio.nerdquest.vio",
    server: "https://vio-quest.onrender.com",
    tag: (version) => `v${version}`,
    feed: "latest.json",
    installer: () => "VIO-x64-setup.exe",
    endpoint: `${releases}/latest/download/latest.json`,
    pubkey:
      "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDdENDk5RUI5MUYwQ0ExRkUKUldUK29Rd2Z1WjVKZmJLclBZY2toRk9iTkl4K20ydVlkdVNyK1BLUlNSckQ2RFVXc09PcmRheTIK",
    icon: "icons/icon.ico",
  },
  beta: {
    productName: "VIO Teste",
    identifier: "studio.nerdquest.vio.test",
    server: "https://vio-test.onrender.com",
    tag: () => "beta",
    feed: "beta.json",
    // Versioned name: the old installer stays valid until beta.json is replaced.
    installer: (version) => `VIO-Teste-${version}-x64-setup.exe`,
    endpoint: `${releases}/download/beta/beta.json`,
    pubkey:
      "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDMxMjNFMzhCQjc5M0NFMEQKUldRTnpwTzNpK01qTWMxc1FVTWFDdFU2dFBIS3FhV3ZzcWpnSFRESWMvZVc1UWJQRmMwV05ERWkK",
    icon: "icons/icon-beta.ico",
  },
};

export function channelOf(name = process.env.VIO_CHANNEL || "beta") {
  const channel = channels[name];
  if (!channel) throw new Error(`Canal desconhecido: ${name}`);
  return channel;
}

// Beta builds grow on every run: 2.9.0-rc.11 → 2.9.0-rc.11.<run>. A plain version on
// VIO_TEST main still gets a prerelease so it never looks like the stable release.
export function appVersion(name, version, run) {
  if (name === "stable" || !run) return version;
  return version.includes("-") ? `${version}.${run}` : `${version}-rc.0.${run}`;
}

// Tauri merges this over tauri.conf.json (`--config`).
export function overlay(name, version) {
  const c = channelOf(name);
  const conf = JSON.parse(
    readFileSync(
      new URL("../src-tauri/tauri.conf.json", import.meta.url),
      "utf8",
    ),
  );
  const host = new URL(c.server).host;
  return {
    productName: c.productName,
    version,
    identifier: c.identifier,
    app: {
      security: {
        csp: conf.app.security.csp.replace(
          /https:\/\/[^ ;]+onrender\.com wss:\/\/[^ ;]+onrender\.com/,
          `https://${host} wss://${host}`,
        ),
      },
    },
    bundle: { icon: [c.icon] },
    plugins: { updater: { pubkey: c.pubkey, endpoints: [c.endpoint] } },
  };
}

// Feed read by tauri-plugin-updater.
export function manifest(name, version, signature) {
  const c = channelOf(name);
  return {
    version,
    notes: `${c.productName} ${version}`,
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature: signature.trim(),
        url: `${releases}/download/${c.tag(version)}/${c.installer(version)}`,
      },
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, name = process.env.VIO_CHANNEL || "beta", arg] =
    process.argv.slice(2);
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const version = appVersion(name, pkg.version, process.env.GITHUB_RUN_NUMBER);
  if (command === "config") {
    const ref = process.env.GITHUB_REF || "";
    if (
      name === "stable" &&
      ref.startsWith("refs/tags/") &&
      ref !== `refs/tags/v${version}`
    ) {
      throw new Error(
        `A tag ${ref} não bate com a versão ${version} do package.json.`,
      );
    }
    writeFileSync(
      new URL("../src-tauri/tauri.channel.json", import.meta.url),
      JSON.stringify(overlay(name, version), null, 2),
    );
    console.log(version);
  } else if (command === "manifest") {
    process.stdout.write(
      JSON.stringify(
        manifest(name, version, readFileSync(arg, "utf8")),
        null,
        2,
      ),
    );
  } else if (command === "get") {
    const c = channelOf(name);
    const field = c[arg];
    console.log(
      arg === "version"
        ? version
        : typeof field === "function"
          ? field(version)
          : field,
    );
  } else {
    throw new Error(
      "Uso: desktop-channel.mjs config|manifest|get <stable|beta> [arquivo|campo]",
    );
  }
}
