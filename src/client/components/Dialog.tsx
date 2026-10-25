import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  close,
  children,
  centered = false,
  modal = true,
  className,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  centered?: boolean;
  /** Non-modal panels leave the room usable behind them (People). */
  modal?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    const previous = el?.ownerDocument.activeElement as HTMLElement | null;
    if (modal) el?.showModal();
    else el?.show();
    return () => {
      el?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    // The dialog opens once; `modal` is fixed for its lifetime.
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet${centered ? " sheet-centered" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      onKeyDown={(e) => {
        // A non-modal dialog gets no cancel event from Escape.
        if (!modal && e.key === "Escape" && !e.defaultPrevented) {
          e.preventDefault();
          close();
        }
      }}
    >
      <div className="sheet-content">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label="Fechar painel"
            className="icon-button"
            onClick={close}
          >
            <X />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
