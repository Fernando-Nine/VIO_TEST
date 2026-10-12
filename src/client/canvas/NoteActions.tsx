import { useEffect, useRef, useState } from "react";
import type { Controller } from "../room/controller";

export function NoteActions({
  engine,
  label,
  value,
  save,
}: {
  engine: Controller;
  label: string;
  value: string;
  save?: () => Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    setStatus("");
    setError("");
  }, [label, value]);
  async function run(action: () => Promise<unknown>, message: string) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
      setStatus(message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível concluir esta ação.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="note-actions">
      <div className="widget-inline-actions">
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            void run(
              () => navigator.clipboard.writeText(value),
              "Texto copiado.",
            )
          }
        >
          Copiar texto
        </button>
        {save && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void run(save, "Texto salvo neste navegador.")}
          >
            Salvar texto
          </button>
        )}
      </div>
      {status && <small role="status">{status}</small>}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
