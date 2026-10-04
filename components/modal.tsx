"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

let openDialogs = 0;
let previousOverflow = "";
const dialogs: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const currentDialog = () => dialogs.at(-1) ?? null;

/** Keep action failures visible and announced above the active native dialog. */
export function ModalNotice({ children }: { children: ReactNode }) {
  const target = useSyncExternalStore(subscribe, currentDialog, () => null);
  return target ? createPortal(children, target) : children;
}

/** Native modal semantics keep nested evidence viewers inside the focus stack. */
export default function Modal({
  children,
  className,
  label,
  onClose,
}: {
  children: ReactNode;
  className: string;
  label: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement;
    if (openDialogs++ === 0) {
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
    dialog.showModal();
    dialogs.push(dialog);
    listeners.forEach((listener) => listener());
    return () => {
      dialogs.splice(dialogs.indexOf(dialog), 1);
      listeners.forEach((listener) => listener());
      dialog.close();
      if (--openDialogs === 0)
        document.documentElement.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal-dialog ${className}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      {children}
    </dialog>
  );
}
