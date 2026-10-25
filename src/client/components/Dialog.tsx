import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  close,
  children,
  centered = false,
  className,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  centered?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    const previous = el?.ownerDocument.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      el?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
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
