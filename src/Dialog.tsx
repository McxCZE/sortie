import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
export default function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => before?.focus();
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={ref}
        className={`modal ${wide ? "shop-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled), [href], input:not(:disabled)",
              ),
            ];
            const first = buttons[0],
              last = buttons.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="dialog-close"
            onClick={onClose}
            aria-label="Zavřít"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
