"use server";

import { cookies } from "next/headers";

import {
  DASHBOARD_LAYOUT_COOKIE,
  LAYOUT_FIELD,
  RESET_OP,
  applyChart,
  applyLayoutOp,
  parseLayout,
  parseLayoutOp,
  parseWidgetId,
  serializeLayout,
} from "@/lib/dashboard-layout";

/** The one mutation the dashboard performs: one change to its own layout. */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Folds one change into the stored layout. Setting the cookie is what brings
 * the screen back re-laid in the same round trip, so the form needs no state
 * of its own — and no JavaScript.
 *
 * Anything it cannot read is dropped silently: a display preference has no
 * error worth showing, and the layout simply stays as it was.
 */
export async function changeDashboardLayoutAction(
  formData: FormData,
): Promise<void> {
  const store = await cookies();
  const asked = text(formData, LAYOUT_FIELD.op);
  if (asked === RESET_OP) {
    store.delete(DASHBOARD_LAYOUT_COOKIE);
    return;
  }

  const widget = parseWidgetId(text(formData, LAYOUT_FIELD.widget));
  if (widget === undefined) {
    return;
  }

  // A button posts one or the other: a move, or the form to draw the chart in.
  const op = parseLayoutOp(asked);
  const chart = text(formData, LAYOUT_FIELD.chart);
  if (op === undefined && chart === "") {
    return;
  }

  const current = parseLayout(store.get(DASHBOARD_LAYOUT_COOKIE)?.value);
  const next =
    op === undefined
      ? applyChart(current, widget, chart)
      : applyLayoutOp(current, op, widget);

  // Same-site and readable, like the theme: it is a display preference.
  store.set(DASHBOARD_LAYOUT_COOKIE, serializeLayout(next), {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
