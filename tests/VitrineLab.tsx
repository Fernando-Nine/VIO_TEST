import { useEffect, useState } from "react";
import { Controller } from "../src/client/room/controller";
import App from "../src/client/App";
import { Home } from "../src/client/components/Home";
import { toasts } from "../src/client/components/Toasts";
import { createWidget } from "../src/client/canvas/widgets";
import { createContent } from "../src/client/canvas/CustomWidget";
import { createModule } from "../src/client/canvas/ModuleWidget";
import { roomContentKind } from "../src/client/canvas/room-content";
import { isModule } from "../src/shared/room-modules";
import { contentKind } from "../src/shared/widgets";
import { freshKey } from "../src/client/id";
import { syntheticAdapter } from "./synthetic";
import { CASOS, type Caso } from "./vitrine/casos";

/**
 * Showcase page (#269), development-only like the other labs: one screen of
 * the interface per `?caso=`, filled with invented people and synthetic media
 * (a coloured canvas, never a camera or microphone). Playwright walks it.
 */
const people = ["Ana", "Bia", "Caio"];
const colors = ["#2727f5", "#e0457b", "#1a9e6f"];
const longText =
  "Mensagem longa de teste para conferir quebra de linha em larguras pequenas, inclusive palavras muito compridas como supercalifragilisticoespialidoso.";

async function until(condition: () => boolean, label: string, ms = 20000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("Tempo esgotado: " + label);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Personal widgets live in this browser; the rest belong to the room. */
const personal = ["screen", "people", "cameras", "stream"];

async function prepareRoom(caso: Caso, code: string) {
  const sources = people.map((name, i) => syntheticAdapter(name, colors[i]));
  const engines = sources.map((s) => new Controller(s.adapter, false));
  const me = engines[0];
  for (const [i, engine] of engines.entries()) {
    engine.sounds = false;
    await engine.enter(people[i], code);
  }
  await until(
    () =>
      engines.every(
        (e) =>
          e.view.status === "connected" &&
          e.view.snapshot?.participants.length === people.length,
      ),
    "pessoas na sala",
  );
  const type = caso.widget;
  if (type === "screen") {
    await me.startScreen(false);
    me.select(me.publications.get("screen")!.id);
  }
  if (type === "people" || type === "cameras" || type === "stream") {
    for (const engine of engines) engine.joinCall();
    await engines[1].camera();
    await engines[2].camera();
    await until(
      () => me.view.snapshot?.participants.filter((p) => p.inCall).length === 3,
      "pessoas na chamada",
    );
  }
  me.canvas.preset(caso.tamanho === "pequeno" ? "grid-2x2" : "strip-left");
  if (type && personal.includes(type)) {
    const widget = createWidget(type);
    if (type === "screen")
      widget.config.publicationId = me.publications.get("screen")!.id;
    me.canvas.add(widget, me.canvas.getSnapshot().slots[0].id);
    me.canvas.focus(widget.id);
  } else if (type) {
    const kind = roomContentKind(type, "room");
    const shared = await me.request<
      Parameters<Controller["receiveSharedWidget"]>[0]
    >("widget-create", {
      id: freshKey(),
      content:
        kind === "module" && isModule(type)
          ? createModule(type)
          : kind === "chat"
            ? { kind: "chat", title: "Chat", blocks: [] }
            : createContent(kind === "timer" ? "timer" : "custom"),
    });
    me.receiveSharedWidget(shared);
    // Same instance RoomCanvas builds when its creator opens the widget.
    const instance = {
      id: freshKey(),
      type: contentKind(shared),
      title: shared.title,
      config: { sharedId: shared.id },
      transient: true,
    };
    me.canvas.add(instance, me.canvas.getSnapshot().slots[0].id);
    if (caso.tamanho === "grande") me.canvas.focus(instance.id);
    // One message per author: the server spaces messages of the same person.
    if (type === "chat")
      for (const [i, text] of ["Oi, pessoal!", longText].entries())
        await engines[i + 1].request("chat-send", {
          id: shared.id,
          messageId: freshKey(),
          text,
        });
  }
  return { me, engines, sources };
}

export function VitrineLab() {
  const id = new URLSearchParams(location.search).get("caso") || "";
  const caso = CASOS.find((c) => c.id === id);
  const [engine, setEngine] = useState<Controller>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!caso) return;
    let cleanup = async () => {};
    let gone = false;
    const run = async () => {
      if (caso.sala === "landing" || caso.sala.startsWith("inicio-app")) {
        const idle = new Controller(undefined, false);
        cleanup = () => idle.destroy();
        if (!gone) setEngine(idle);
        return;
      }
      // Parallel tests share one server: each asks for its own room code.
      const code = new URLSearchParams(location.search).get("sala");
      const room = await prepareRoom(
        caso,
        code && /^[A-Z0-9]{8,24}$/.test(code) ? code : "UIVITRINE0001",
      );
      cleanup = async () => {
        await Promise.all(room.engines.map((e) => e.destroy()));
        room.sources.forEach((s) => s.dispose());
      };
      if (caso.avisos) pushFakeToasts();
      if (!gone) setEngine(room.me);
    };
    run().catch((e) => setError(String(e)));
    return () => {
      gone = true;
      void cleanup();
    };
  }, [caso]);
  if (!caso)
    return (
      <main className="lab">
        <h1>Vitrine</h1>
        <ul>
          {CASOS.map((c) => (
            <li key={c.id}>
              <a href={`?caso=${c.id}`}>{c.id}</a>
            </li>
          ))}
        </ul>
      </main>
    );
  if (error)
    return (
      <p role="alert" data-vitrine-erro>
        {error}
      </p>
    );
  if (!engine) return <p role="status">Preparando…</p>;
  // The marker tells the robot the page is ready to be measured.
  const marker = <div data-vitrine-pronta hidden />;
  if (caso.sala.startsWith("inicio-app"))
    return (
      <div className="app home-page">
        <Home
          engine={engine}
          name="Ana"
          setName={() => {}}
          initialCode={caso.sala === "inicio-app-entrar" ? "ABCD-EFGH" : ""}
          busy={false}
          enter={() => {}}
        />
        {marker}
      </div>
    );
  return (
    <>
      <App engine={engine} />
      {marker}
    </>
  );
}

function pushFakeToasts() {
  toasts.clear();
  toasts.push({
    id: "vitrine-info",
    kind: "info",
    label: "Bia entrou na sala.",
    text: "Bia entrou na sala.",
  });
  toasts.push({
    id: "vitrine-importante",
    kind: "important",
    label: "Caio bateu na porta.",
    text: "Caio bateu na porta.",
    dismiss: { label: "Agora não", run: () => {} },
    action: { label: "Deixar entrar", run: () => {} },
  });
  toasts.push({
    id: "vitrine-erro",
    kind: "error",
    label: "Não foi possível conectar. Tente de novo em instantes.",
    text: "Não foi possível conectar. Tente de novo em instantes.",
  });
}
