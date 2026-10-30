import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { reducedMotion } from "./motion";

/**
 * info waits its turn; important (new screen, Undo) enters on top and pushes
 * the current one down; error is important, red and stays until closed.
 */
export type ToastKind = "info" | "important" | "error";
export interface Toast {
  id: string;
  kind: ToastKind;
  text: ReactNode;
  /** Plain text for the close button label. */
  label: string;
  avatar?: string;
  action?: { label: string; run: () => void };
  /** Quiet answer before the action ("Agora não"). */
  dismiss?: { label: string; run: () => void };
  /** Milliseconds until it leaves; omitted = stays until ×. */
  duration?: number;
  onClose?: () => void;
}

const MAX_SHOWN = 2;

/** One toast at a time, plus at most one important on top of it. */
export class ToastQueue {
  private value: { shown: Toast[]; queue: Toast[] } = { shown: [], queue: [] };
  private listeners = new Set<() => void>();
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private set(shown: Toast[], queue: Toast[]) {
    // Refill: the next queued toast shows when the stack empties, or on top
    // of the current one when it is important.
    while (
      queue.length &&
      (!shown.length || (queue[0].kind !== "info" && shown.length < MAX_SHOWN))
    ) {
      shown = [queue[0], ...shown];
      queue = queue.slice(1);
    }
    this.value = { shown, queue };
    this.listeners.forEach((listener) => listener());
  }
  push(toast: Toast) {
    const { shown, queue } = this.value;
    // Same id updates in place (e.g. a changed error message).
    if (shown.some((t) => t.id === toast.id))
      return this.set(
        shown.map((t) => (t.id === toast.id ? toast : t)),
        queue,
      );
    const rest = queue.filter((t) => t.id !== toast.id);
    if (toast.kind === "info") this.set(shown, [...rest, toast]);
    else this.set(shown, [toast, ...rest]);
  }
  /** `notify: false` when the source itself went away. */
  close(id: string, notify = true) {
    const { shown, queue } = this.value;
    const toast = [...shown, ...queue].find((t) => t.id === id);
    if (!toast) return;
    this.set(
      shown.filter((t) => t.id !== id),
      queue.filter((t) => t.id !== id),
    );
    if (notify) toast.onClose?.();
  }
  clear() {
    this.set([], []);
  }
}

export const toasts = new ToastQueue();

export function ToastStack({ queue = toasts }: { queue?: ToastQueue }) {
  const { shown, queue: waiting } = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
  );
  const nodes = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());
  // FLIP: a toast pushed down by a newer one slides instead of jumping.
  useLayoutEffect(() => {
    const reduce = reducedMotion();
    for (const [id, node] of nodes.current) {
      const before = tops.current.get(id);
      const after = node.offsetTop;
      tops.current.set(id, after);
      if (reduce || before === undefined || before === after) continue;
      node.animate(
        [
          { transform: `translateY(${before - after}px)` },
          { transform: "none" },
        ],
        { duration: 180, easing: "ease-out" },
      );
    }
    for (const id of tops.current.keys())
      if (!nodes.current.has(id)) tops.current.delete(id);
  });
  if (!shown.length) return null;
  return (
    <div className="toast-stack">
      {shown.map((toast) => (
        <div
          key={toast.id}
          ref={(node) => {
            if (node) nodes.current.set(toast.id, node);
            else nodes.current.delete(toast.id);
          }}
          className={`toast is-${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
          style={
            toast.duration
              ? ({ "--toast-duration": `${toast.duration}ms` } as CSSProperties)
              : undefined
          }
        >
          {toast.avatar && (
            <span className="toast-avatar" aria-hidden="true">
              {[...toast.avatar].slice(0, 2).join("").toUpperCase()}
            </span>
          )}
          <p>{toast.text}</p>
          {toast.dismiss && (
            <button
              className="text-button"
              onClick={() => {
                toast.dismiss!.run();
                queue.close(toast.id, false);
              }}
            >
              {toast.dismiss.label}
            </button>
          )}
          {toast.action && (
            <button
              className="primary"
              onClick={() => {
                toast.action!.run();
                queue.close(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            title={`Fechar: ${toast.label}`}
            onClick={() => queue.close(toast.id)}
          >
            <X size={15} />
          </button>
          {toast.duration && toast.kind !== "error" && (
            <i
              className="toast-bar"
              aria-hidden="true"
              onAnimationEnd={() => queue.close(toast.id)}
            />
          )}
        </div>
      ))}
      {waiting.length > 0 && (
        <span
          className="toast-more"
          aria-label={`Mais ${waiting.length} na fila`}
        >
          +{waiting.length}
        </span>
      )}
    </div>
  );
}
