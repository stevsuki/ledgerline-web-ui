"use client";

import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { IconTile } from "@/components/ui/primitives";

/**
 * The boundary above `(app)/layout.tsx`. It catches the case the session guard
 * now separates out: the API answered, but with a fault of its own — so the
 * visitor is still signed in and must not be sent to the sign-in card.
 */
export default function AppError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  return (
    <main className="bg-bg grid min-h-dvh place-items-center p-6">
      <Panel className="panel-pad w-full max-w-[440px]">
        <IconTile name="warn" tone="expense" />
        <h1 className="panel-title mt-4">Ledgerline could not load</h1>
        <p className="text-note text-muted mt-2">
          The workspace is fine — the service behind it did not answer. Your
          session is still open, so this is worth trying again.
        </p>
        {error.digest ? (
          <p className="text-meta text-muted mt-3 tabular-nums">
            Reference {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary mt-5"
        >
          <Icon name="repeat" size={15} />
          Try again
        </button>
      </Panel>
    </main>
  );
}
