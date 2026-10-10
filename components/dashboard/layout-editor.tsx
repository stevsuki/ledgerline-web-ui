import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { changeDashboardLayoutAction } from "@/lib/dashboard/actions";
import {
  DASHBOARD_WIDGETS,
  LAYOUT_FIELD,
  RESET_OP,
  WIDGET_META,
  type DashboardLayout,
  type LayoutOp,
  type WidgetPlacement,
  type WidgetWidth,
} from "@/lib/dashboard-layout";

/**
 * Arranging the dashboard, drawn on the dashboard itself.
 *
 * Every control here is a submit button in a plain form over one Server
 * Action, so there is no client component and no state: a click is a round
 * trip that rewrites the cookie and brings the screen back re-laid. That is
 * also what makes it work with a keyboard, a screen reader and a phone, none
 * of which drag well.
 */

const WIDTH_LABEL: Readonly<Record<WidgetWidth, string>> = {
  half: "Half",
  full: "Full",
};

const WIDTHS: readonly WidgetWidth[] = ["half", "full"];

function MoveButton({
  op,
  icon,
  label,
  disabled,
}: {
  readonly op: LayoutOp;
  readonly icon: IconName;
  readonly label: string;
  readonly disabled: boolean;
}) {
  return (
    <button
      type="submit"
      name={LAYOUT_FIELD.op}
      value={op}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="btn btn-secondary btn-icon"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/** The bar over a panel while the dashboard is being arranged. */
export function WidgetEditBar({
  placement,
  isFirst,
  isLast,
}: {
  readonly placement: WidgetPlacement;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}) {
  const meta = WIDGET_META[placement.id];

  return (
    <form
      action={changeDashboardLayoutAction}
      className="inset flex flex-wrap items-center gap-2 px-3 py-2"
    >
      <input type="hidden" name={LAYOUT_FIELD.widget} value={placement.id} />
      <span className="text-note min-w-0 flex-1 truncate font-semibold">
        {meta.title}
      </span>

      <MoveButton
        op="earlier"
        icon="arrow-up"
        label={`Move ${meta.title} earlier`}
        disabled={isFirst}
      />
      <MoveButton
        op="later"
        icon="arrow-down"
        label={`Move ${meta.title} later`}
        disabled={isLast}
      />

      {meta.resizable ? (
        <div className="seg" role="group" aria-label={`${meta.title} width`}>
          {WIDTHS.map((width) => (
            <button
              key={width}
              type="submit"
              name={LAYOUT_FIELD.op}
              value={width}
              aria-pressed={placement.width === width}
              className="seg-opt"
            >
              {WIDTH_LABEL[width]}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="submit"
        name={LAYOUT_FIELD.op}
        value="hide"
        className="btn btn-secondary text-note"
      >
        Hide
      </button>
    </form>
  );
}

/** A panel and, while arranging, the bar that moves it. */
export function WidgetSlot({
  editBar,
  children,
}: {
  readonly editBar: ReactNode;
  readonly children: ReactNode;
}) {
  if (editBar === null) {
    return children;
  }
  return (
    // A move remounts the row, which would replay each panel's rise; while
    // arranging, panels hold still.
    <div className="flex min-w-0 flex-col gap-2 [&_.animate-pop]:animate-none">
      {editBar}
      {children}
    </div>
  );
}

/** The way in, and — once in — what is going on and the way back out. */
export function LayoutToolbar({
  editing,
  editHref,
  doneHref,
}: {
  readonly editing: boolean;
  readonly editHref: string;
  readonly doneHref: string;
}) {
  if (!editing) {
    return (
      <div className="flex justify-end">
        <Link href={editHref} className="btn btn-secondary text-note">
          <Icon name="pencil" size={14} />
          Customise
        </Link>
      </div>
    );
  }

  return (
    <div className="border-accent/45 bg-accent/[0.09] flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-row font-semibold">Arranging your dashboard</p>
        <p className="text-meta text-muted mt-px">
          Move, resize or hide a panel. Each change is saved as you make it, on
          this browser.
        </p>
      </div>
      <form action={changeDashboardLayoutAction}>
        <button
          type="submit"
          name={LAYOUT_FIELD.op}
          value={RESET_OP}
          className="btn btn-secondary text-note"
        >
          Reset
        </button>
      </form>
      <Link href={doneHref} className="btn btn-primary text-note">
        <Icon name="check" size={14} />
        Done
      </Link>
    </div>
  );
}

/** What was taken off the screen, each with the way back. */
export function HiddenWidgets({
  hidden,
}: {
  readonly hidden: DashboardLayout;
}) {
  if (hidden.length === 0) {
    return null;
  }

  return (
    <section className="inset panel-pad" aria-labelledby="hidden-panels">
      <h2 id="hidden-panels" className="panel-kicker">
        Hidden panels
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {hidden.map((placement) => (
          <li key={placement.id}>
            <form action={changeDashboardLayoutAction}>
              <input
                type="hidden"
                name={LAYOUT_FIELD.widget}
                value={placement.id}
              />
              <button
                type="submit"
                name={LAYOUT_FIELD.op}
                value="show"
                className="btn btn-secondary text-note"
              >
                <Icon name="plus" size={14} />
                {WIDGET_META[placement.id].title}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Said when every panel has been hidden, so the screen is not just blank. */
export function EmptyDashboard({ editHref }: { readonly editHref: string }) {
  return (
    <div className="inset panel-pad flex flex-wrap items-center gap-3">
      <p className="text-row min-w-0 flex-1">
        All {DASHBOARD_WIDGETS.length} panels are hidden.
      </p>
      <Link href={editHref} className="btn btn-secondary text-note">
        Choose what to show
        <Icon name="right" size={14} />
      </Link>
    </div>
  );
}
