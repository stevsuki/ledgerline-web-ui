import { useEffect, useId, useRef, useState, type RefObject } from "react";

/**
 * What every header popover needs and none should rewrite: the open flag, the
 * id its trigger points `aria-controls` at, and closing on a click outside or
 * on Escape.
 */
export function usePopover(): {
  readonly isOpen: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly panelId: string;
} {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return {
    isOpen,
    toggle: () => setOpen((previous) => !previous),
    close: () => setOpen(false),
    containerRef,
    panelId,
  };
}
