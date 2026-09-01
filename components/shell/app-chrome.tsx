"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The two pieces of chrome that any screen can reach: the confirmation toast
 * and the add-transaction slide-over.
 *
 * Holding them here means one dialog exists for the whole app, however many
 * buttons open it, and `children` stays server-rendered — a client provider
 * does not drag its subtree across the boundary.
 */

type AppChrome = {
  readonly showToast: (message: string) => void;
  readonly openTransaction: () => void;
  readonly closeTransaction: () => void;
  readonly isTransactionOpen: boolean;
};

const AppChromeContext = createContext<AppChrome | null>(null);

/** How long a confirmation stays up, matching the artboard's 2.8s timer. */
const TOAST_MS = 2800;

export function AppChromeProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [isTransactionOpen, setTransactionOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const openTransaction = useCallback(() => setTransactionOpen(true), []);
  const closeTransaction = useCallback(() => setTransactionOpen(false), []);

  const value = useMemo(
    () => ({ showToast, openTransaction, closeTransaction, isTransactionOpen }),
    [showToast, openTransaction, closeTransaction, isTransactionOpen],
  );

  return (
    <AppChromeContext.Provider value={value}>
      {children}
      <Toaster message={toast} />
    </AppChromeContext.Provider>
  );
}

export function useAppChrome(): AppChrome {
  const context = useContext(AppChromeContext);
  if (!context) {
    throw new Error("useAppChrome must be used inside <AppChromeProvider>");
  }
  return context;
}

function Toaster({ message }: { readonly message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <output
      aria-live="polite"
      className="overlay-surface animate-toast fixed bottom-7 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 px-4 py-3 text-[13px]"
    >
      <svg width={16} height={16} className="text-income" aria-hidden="true">
        <use href="#i-check" />
      </svg>
      <span>{message}</span>
    </output>
  );
}
