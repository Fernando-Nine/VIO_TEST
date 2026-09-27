import { useEffect, useRef, useState } from "react";
import App from "../src/client/App";
import { Controller } from "../src/client/room/controller";
import type { Action } from "../src/shared/protocol";

/** Hold the first join ACK after the real server accepts it. Subsequent joins use the real path. */
export function RoomSwitchLab() {
  const release = useRef<() => void>(() => {});
  const [held, setHeld] = useState(false);
  const [report, setReport] = useState("");
  const [engine] = useState(() => {
    const room = new Controller(undefined, false);
    room.sounds = false;
    const request = room.request.bind(room);
    let firstJoin = true;
    room.request = <T,>(action: Action, data?: unknown): Promise<T> => {
      const result = request<T>(action, data);
      if (action !== "join" || !firstJoin) return result;
      firstJoin = false;
      return result.then(
        (value) =>
          new Promise<T>((resolve) => {
            setHeld(true);
            release.current = () => {
              setHeld(false);
              resolve(value);
            };
          }),
      );
    };
    return room;
  });
  useEffect(
    () => () => {
      release.current();
      void engine.destroy();
    },
    [engine],
  );
  return (
    <>
      <App engine={engine} />
      <details
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          zIndex: 80,
          background: "#111625",
          padding: 8,
          maxWidth: "95vw",
        }}
      >
        <summary>QA · troca rápida de salas</summary>
        <p>
          {held
            ? "Primeira confirmação retida. A sala já foi aceita no servidor."
            : "Nenhuma confirmação retida."}
        </p>
        <button onClick={() => release.current()}>
          Liberar confirmação atrasada
        </button>{" "}
        ·{" "}
        <button onClick={() => engine.socket?.disconnect()}>
          Simular perda de conexão
        </button>{" "}
        ·{" "}
        <button
          onClick={() =>
            setReport(
              JSON.stringify({
                status: engine.view.status,
                code: engine.view.snapshot?.code,
                id: engine.view.id,
                connected: engine.socket?.connected,
                error: engine.view.error,
                peers: engine.peers.entries.size,
              }),
            )
          }
        >
          Verificar sala atual
        </button>
        <pre aria-label="Resultado da troca de sala">{report}</pre>
      </details>
    </>
  );
}
