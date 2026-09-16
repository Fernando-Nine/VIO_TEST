import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import App from "./App";
import { Controller } from "./room/controller";
import "./styles.css";
import { registerRoomTools } from "./webmcp";
const root = createRoot(document.getElementById("root")!);
const engine = new Controller();
if (import.meta.env.DEV && location.pathname === "/qa")
  void import("../../tests/BrowserLab")
    .then((lab) => lab.mountLab(root))
    .catch(() => root.render(<App engine={engine} />));
else root.render(<App engine={engine} />);
const unregister = registerRoomTools(engine);
if (import.meta.env.PROD && "serviceWorker" in navigator)
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
