// ─── Modal ───────────────────────────────────────────────────────────
import { type ReactNode, useEffect, useRef } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`
        backdrop:bg-black/50 backdrop:backdrop-blur-sm
        m-auto max-w-lg rounded-xl border border-neutral-200 bg-white p-0 shadow-xl
        dark:border-neutral-700 dark:bg-neutral-800
        open:animate-in open:fade-in open:zoom-in-95
        ${className}
      `.trim()}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
        {title && <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>}
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
