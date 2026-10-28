import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-mono/400.css";
import App from "./App";
import { Controller } from "./room/controller";
import { desktop } from "./desktop/bridge";
import { windowsCapture } from "./desktop/capture";
import "./styles.css";
import "./landing.css";
import "./room.css";
import "./finish.css";
import "./multiscreen.css";
import "./preferences.css";
import "./workspace.css";
import "./share.css";
import "./grid-tools.css";
import { registerRoomTools } from "./webmcp";
const root = createRoot(document.getElementById("root")!);
const engine = new Controller(desktop ? windowsCapture : undefined);
if (
  import.meta.env.DEV &&
  ["/qa", "/qa-layout", "/qa-watch", "/qa-switch"].includes(location.pathname)
)
  void import("../../tests/BrowserLab")
    .then((lab) => lab.mountLab(root))
    .catch(() => root.render(<App engine={engine} />));
else root.render(<App engine={engine} />);
const unregister = registerRoomTools(engine);
if (import.meta.env.PROD && !desktop && "serviceWorker" in navigator)
  window.addEventListener(
    "load",
    () => {
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {
          // Installation is optional; room and media connections remain usable.
        });
    },
    { once: true },
  );
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    unregister();
    void engine.destroy();
  });
