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

/**
 * The forms a chart panel can take. Each list holds only forms that are honest
 * for what its panel measures: two series over time on one, the shares of a
 * whole on the other. The first of each is what an untouched dashboard draws.
 */
export const TREND_CHARTS = ["bars", "line", "area", "mirror", "net"] as const;

export const CATEGORY_CHARTS = ["donut", "ranked", "strip", "treemap"] as const;

export type TrendChartKind = (typeof TREND_CHARTS)[number];
export type CategoryChartKind = (typeof CATEGORY_CHARTS)[number];
export type ChartKind = TrendChartKind | CategoryChartKind;

export const CHART_LABEL: Readonly<Record<ChartKind, string>> = {
  bars: "Bars",
  line: "Line",
  area: "Area",
  mirror: "Mirrored",
  net: "Net",
  donut: "Donut",
  ranked: "Ranked",
  strip: "Stacked",
  treemap: "Treemap",
};

const CHARTS_BY_WIDGET: Readonly<Record<WidgetId, readonly ChartKind[]>> = {
  stats: [],
  trend: TREND_CHARTS,
  categories: CATEGORY_CHARTS,
  recent: [],
  budgets: [],
};

/** The forms a panel can be drawn in; empty for a panel that is not a chart. */
export function chartChoices(id: WidgetId): readonly ChartKind[] {
  return CHARTS_BY_WIDGET[id];
}

/** A stored form if this panel can take it, otherwise the panel's first. */
function readChart(id: WidgetId, value: string | undefined): ChartKind | null {
  const choices = CHARTS_BY_WIDGET[id];
  return choices.find((kind) => kind === value) ?? choices[0] ?? null;
}

export type WidgetPlacement = {
  readonly id: WidgetId;
  readonly width: WidgetWidth;
  readonly hidden: boolean;
  /** The form a chart panel is drawn in; `null` on a panel with no choice. */
  readonly chart: ChartKind | null;
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
  (id) => ({
    id,
    width: WIDGET_META[id].defaultWidth,
    hidden: false,
    chart: readChart(id, undefined),
  }),
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
export const LAYOUT_FIELD = {
  op: "op",
  widget: "widget",
  chart: "chart",
} as const;

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

/**
 * `stats.f.v_trend.h.v.line_recent.h.x` — only characters a cookie takes bare.
 * The chart form is a fourth field, written only by a panel that has one, so a
 * cookie from before the field existed still reads whole.
 */
export function serializeLayout(layout: DashboardLayout): string {
  return layout
    .map((placement) =>
      [
        placement.id,
        WIDTH_CODE[placement.width],
        placement.hidden ? HIDDEN_CODE : SHOWN_CODE,
        ...(placement.chart === null ? [] : [placement.chart]),
      ].join(FIELD_SEPARATOR),
    )
    .join(ENTRY_SEPARATOR);
}

function readPlacement(entry: string): WidgetPlacement | undefined {
  const [rawId = "", widthCode, visibility, chart] =
    entry.split(FIELD_SEPARATOR);
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
    chart: readChart(id, chart),
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

/** The layout with one panel redrawn. A form the panel cannot take changes nothing. */
export function applyChart(
  layout: DashboardLayout,
  id: WidgetId,
  value: string,
): DashboardLayout {
  const chart = chartChoices(id).find((kind) => kind === value);
  return chart === undefined ? layout : patch(layout, id, { chart });
}

function pickChart<Kind extends ChartKind>(
  layout: DashboardLayout,
  id: WidgetId,
  kinds: readonly [Kind, ...Kind[]],
): Kind {
  const stored = layout.find((placement) => placement.id === id)?.chart;
  return kinds.find((kind) => kind === stored) ?? kinds[0];
}

export function trendChartOf(layout: DashboardLayout): TrendChartKind {
  return pickChart(layout, "trend", TREND_CHARTS);
}

export function categoryChartOf(layout: DashboardLayout): CategoryChartKind {
  return pickChart(layout, "categories", CATEGORY_CHARTS);
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
