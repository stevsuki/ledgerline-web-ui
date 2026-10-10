/**
 * The dashboard as its reader arranged it: which panels show, in what order,
 * and how wide each one runs.
 *
 * It is kept in a cookie rather than in React state for the reason the theme
 * and the rail are — the server lays the screen out, so the first painted
 * frame is already the arrangement that was saved, with nothing to shuffle
 * into place after hydration. Everything here is pure: the page reads a layout,
 * the action folds one change into it, and neither trusts the stored string.
 */

export const DASHBOARD_LAYOUT_COOKIE = "ll-dashboard";

/** Every panel the dashboard can show, in the order it shows them untouched. */
export const DASHBOARD_WIDGETS = [
  "stats",
  "trend",
  "categories",
  "recent",
  "budgets",
] as const;

export type WidgetId = (typeof DASHBOARD_WIDGETS)[number];

export type WidgetWidth = "half" | "full";

export type WidgetPlacement = {
  readonly id: WidgetId;
  readonly width: WidgetWidth;
  readonly hidden: boolean;
};

/** Visible panels first, in order; hidden ones after them. */
export type DashboardLayout = readonly WidgetPlacement[];

type WidgetMeta = {
  readonly title: string;
  readonly defaultWidth: WidgetWidth;
  /** The stat strip is four cards across; half a row would only crush them. */
  readonly resizable: boolean;
};

export const WIDGET_META: Readonly<Record<WidgetId, WidgetMeta>> = {
  stats: { title: "Month at a glance", defaultWidth: "full", resizable: false },
  trend: { title: "Income vs expense", defaultWidth: "half", resizable: true },
  categories: {
    title: "Spending by category",
    defaultWidth: "half",
    resizable: true,
  },
  recent: {
    title: "Recent transactions",
    defaultWidth: "half",
    resizable: true,
  },
  budgets: { title: "Budgets", defaultWidth: "half", resizable: true },
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = DASHBOARD_WIDGETS.map(
  (id) => ({ id, width: WIDGET_META[id].defaultWidth, hidden: false }),
);

/** Everything a reader can do to the layout; the edit bar posts one of these. */
export const LAYOUT_OPS = [
  "earlier",
  "later",
  "half",
  "full",
  "hide",
  "show",
] as const;

export type LayoutOp = (typeof LAYOUT_OPS)[number];

/** Not a change to one panel, so not a `LayoutOp`: it forgets the cookie. */
export const RESET_OP = "reset";

/** The names the edit bar's forms post under. */
export const LAYOUT_FIELD = { op: "op", widget: "widget" } as const;

export function parseWidgetId(value: string): WidgetId | undefined {
  return DASHBOARD_WIDGETS.find((id) => id === value);
}

export function parseLayoutOp(value: string): LayoutOp | undefined {
  return LAYOUT_OPS.find((op) => op === value);
}

/* ── the cookie ────────────────────────────────────────────────────────── */

const ENTRY_SEPARATOR = "_";
const FIELD_SEPARATOR = ".";
const WIDTH_CODE: Readonly<Record<WidgetWidth, string>> = {
  half: "h",
  full: "f",
};
const HIDDEN_CODE = "x";
const SHOWN_CODE = "v";

/** `stats.f.v_trend.h.v_recent.h.x` — only characters a cookie takes bare. */
export function serializeLayout(layout: DashboardLayout): string {
  return layout
    .map((placement) =>
      [
        placement.id,
        WIDTH_CODE[placement.width],
        placement.hidden ? HIDDEN_CODE : SHOWN_CODE,
      ].join(FIELD_SEPARATOR),
    )
    .join(ENTRY_SEPARATOR);
}

function readPlacement(entry: string): WidgetPlacement | undefined {
  const [rawId = "", widthCode, visibility] = entry.split(FIELD_SEPARATOR);
  const id = parseWidgetId(rawId);
  if (id === undefined) {
    return undefined;
  }
  const meta = WIDGET_META[id];
  const asked: WidgetWidth = widthCode === WIDTH_CODE.full ? "full" : "half";
  return {
    id,
    width: meta.resizable ? asked : meta.defaultWidth,
    hidden: visibility === HIDDEN_CODE,
  };
}

/** Hidden panels sink to the end, so "earlier" and "later" only meet visible ones. */
function settle(layout: DashboardLayout): DashboardLayout {
  return [
    ...layout.filter((placement) => !placement.hidden),
    ...layout.filter((placement) => placement.hidden),
  ];
}

/**
 * A stored layout, made whole. An id this build does not know is dropped, a
 * repeat is ignored, and a panel added since the cookie was written joins the
 * end visible — a new panel must not start life hidden from everyone who
 * arranged their dashboard before it existed.
 */
export function parseLayout(value: string | undefined): DashboardLayout {
  if (!value) {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
  const seen = new Set<WidgetId>();
  const stored: WidgetPlacement[] = [];
  for (const entry of value.split(ENTRY_SEPARATOR)) {
    const placement = readPlacement(entry);
    if (placement && !seen.has(placement.id)) {
      seen.add(placement.id);
      stored.push(placement);
    }
  }
  const missing = DEFAULT_DASHBOARD_LAYOUT.filter(
    (placement) => !seen.has(placement.id),
  );
  return settle([...stored, ...missing]);
}

/* ── one change ────────────────────────────────────────────────────────── */

function swap(
  layout: DashboardLayout,
  from: number,
  to: number,
): DashboardLayout {
  const target = layout[to];
  const moving = layout[from];
  if (!target || !moving || target.hidden || moving.hidden) {
    return layout;
  }
  return layout.map((placement, index) => {
    if (index === from) {
      return target;
    }
    return index === to ? moving : placement;
  });
}

function patch(
  layout: DashboardLayout,
  id: WidgetId,
  change: Partial<Omit<WidgetPlacement, "id">>,
): DashboardLayout {
  return layout.map((placement) =>
    placement.id === id ? { ...placement, ...change } : placement,
  );
}

type Change = (
  layout: DashboardLayout,
  id: WidgetId,
  index: number,
) => DashboardLayout;

const CHANGE_BY_OP: Readonly<Record<LayoutOp, Change>> = {
  earlier: (layout, _id, index) => swap(layout, index, index - 1),
  later: (layout, _id, index) => swap(layout, index, index + 1),
  half: (layout, id) => patch(layout, id, { width: "half" }),
  full: (layout, id) => patch(layout, id, { width: "full" }),
  hide: (layout, id) => patch(layout, id, { hidden: true }),
  show: (layout, id) => patch(layout, id, { hidden: false }),
};

/** The layout after one change. A change that cannot apply leaves it as it was. */
export function applyLayoutOp(
  layout: DashboardLayout,
  op: LayoutOp,
  id: WidgetId,
): DashboardLayout {
  const index = layout.findIndex((placement) => placement.id === id);
  const meta = WIDGET_META[id];
  if ((op === "half" || op === "full") && !meta.resizable) {
    return layout;
  }
  return settle(CHANGE_BY_OP[op](layout, id, index));
}

/* ── rows ──────────────────────────────────────────────────────────────── */

export type LayoutRow = {
  readonly key: string;
  readonly widgets: readonly WidgetPlacement[];
};

export function visibleWidgets(layout: DashboardLayout): DashboardLayout {
  return layout.filter((placement) => !placement.hidden);
}

export function hiddenWidgets(layout: DashboardLayout): DashboardLayout {
  return layout.filter((placement) => placement.hidden);
}

/**
 * The visible panels as rows. Two halves in a row share one; a half with no
 * half beside it takes the row to itself rather than leaving a hole.
 */
export function toRows(layout: DashboardLayout): readonly LayoutRow[] {
  const rows: LayoutRow[] = [];
  let pending: WidgetPlacement | undefined;

  for (const placement of visibleWidgets(layout)) {
    if (placement.width === "half" && pending === undefined) {
      pending = placement;
      continue;
    }
    if (placement.width === "half" && pending !== undefined) {
      rows.push({
        key: `${pending.id}-${placement.id}`,
        widgets: [pending, placement],
      });
      pending = undefined;
      continue;
    }
    if (pending !== undefined) {
      rows.push({ key: pending.id, widgets: [pending] });
      pending = undefined;
    }
    rows.push({ key: placement.id, widgets: [placement] });
  }

  if (pending !== undefined) {
    rows.push({ key: pending.id, widgets: [pending] });
  }
  return rows;
}
