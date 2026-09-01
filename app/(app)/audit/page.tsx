import Link from "next/link";
import type { Metadata } from "next";

import { AuditExportPopover } from "@/components/audit/export-popover";
import { AppScreen } from "@/components/shell/app-screen";
import { DateRangeField } from "@/components/ui/date-range-field";
import { FilterForm } from "@/components/ui/filter-form";
import { ScreenStack, TableScroll } from "@/components/ui/layout";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Panel } from "@/components/ui/panel";
import { Avatar, EmptyState } from "@/components/ui/primitives";
import { StatRow } from "@/components/ui/stats";
import {
  FilterSelect,
  FilterSubmit,
  SearchInput,
  type FilterOption,
} from "@/components/ui/toolbar";
import { describeAction, moduleLabeller } from "@/lib/audit-labels";
import {
  AUDIT_MODULE_VALUES,
  AUDIT_PAGE_SIZES,
  AUDIT_SEVERITY_VALUES,
  AUDIT_STATUS_VALUES,
  NO_FILTER,
  auditRetentionBounds,
  getAuditLog,
  isActorId,
} from "@/lib/data/audit";
import { PAGE_META } from "@/lib/nav";
import {
  readIsoDate,
  readOption,
  readPage,
  readSize,
  readText,
} from "@/lib/search-params";
import { BG_TONE, cx } from "@/lib/tone";
import type { AuditOptions, AuditSeverity } from "@/types/access";
import type { Tone } from "@/types/ledger";

export const metadata: Metadata = { title: PAGE_META.audit.title };

const BASE_PATH = "/audit";

/**
 * Six filters, a reset and an export do not fit one row of a 1240px screen at
 * fixed widths — the sum overflows and the last control drops to a line of its
 * own. So none of them is pinned: each select takes an equal share of what is
 * left and shrinks with the others, and the row stays one row.
 */
const SELECT_CLASS = "w-full min-w-[112px] flex-1";

const ROW_GRID =
  "grid grid-cols-[150px_minmax(0,1fr)_170px_minmax(0,1.4fr)_120px] items-center gap-3.5";

/**
 * The backend's three severities. `critical` takes the expense red because it
 * is the one meant to stop a reader; `warning` the amber; `info` stays muted,
 * so an ordinary day of events reads as texture rather than alarm.
 */
const SEVERITY_TONE: Readonly<Record<AuditSeverity, Tone>> = {
  critical: "expense",
  warning: "warn",
  info: "muted",
};

/** Each dropdown's "off" entry, prepended to what the API offers. */
const ALL_ACTORS: FilterOption = { value: NO_FILTER, label: "All actors" };
const ALL_MODULES: FilterOption = { value: NO_FILTER, label: "All modules" };
const ALL_STATUSES: FilterOption = { value: NO_FILTER, label: "All outcomes" };
const ALL_SEVERITIES: FilterOption = { value: NO_FILTER, label: "All events" };

/** An actor's role rides along in the label, as it does in the artboard's rows. */
function actorOptions(options: AuditOptions): readonly FilterOption[] {
  return [
    ALL_ACTORS,
    ...options.actors.map((actor) => ({
      value: actor.value,
      label: actor.role ? `${actor.label} · ${actor.role}` : actor.label,
    })),
  ];
}

function withAll(
  all: FilterOption,
  options: readonly FilterOption[],
): readonly FilterOption[] {
  return [all, ...options];
}

function labelOf(
  entries: readonly FilterOption[],
  value: string,
): string | false {
  if (!value) {
    return false;
  }
  return entries.find((entry) => entry.value === value)?.label ?? value;
}

/**
 * The active filters in words, for the export popover's scope block. The
 * labels come from the same options the dropdowns show, so the summary never
 * invents a name for a code.
 */
function describeScope(
  query: string,
  actorId: string,
  moduleCode: string,
  status: string,
  severity: string,
  options: AuditOptions,
): string {
  const parts = [
    query && `“${query}”`,
    labelOf(options.actors, actorId),
    labelOf(options.modules, moduleCode),
    labelOf(options.statuses, status),
    labelOf(options.severities, severity),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : "None";
}

export default async function AuditPage(props: PageProps<"/audit">) {
  const params = await props.searchParams;
  const query = readText(params, "q");
  const moduleCode = readOption(params, "module", AUDIT_MODULE_VALUES);
  const status = readOption(params, "status", AUDIT_STATUS_VALUES);
  const severity = readOption(params, "severity", AUDIT_SEVERITY_VALUES);
  const from = readIsoDate(params, "from");
  const to = readIsoDate(params, "to");

  // Actors are the one open set, so the id is shape-checked here rather than
  // matched against a list the URL had to be parsed before we could fetch.
  const rawActor = readText(params, "actor");
  const actorId = isActorId(rawActor) ? rawActor : NO_FILTER;

  const { page, stats, options, overview, isEmpty, error } = await getAuditLog({
    query,
    actorId,
    module: moduleCode,
    status,
    severity,
    from,
    to,
    sort: "",
    page: readPage(params),
    size: readSize(params, AUDIT_PAGE_SIZES),
  });

  const { min, max } = auditRetentionBounds(overview);
  const labelModule = moduleLabeller(options.modules);

  return (
    <AppScreen
      title={PAGE_META.audit.title}
      subtitle={PAGE_META.audit.subtitle}
      maxWidth={1240}
    >
      <ScreenStack>
        <StatRow stats={stats} size="large" />

        <Panel>
          {/* The export control is not a filter, so it sits beside the form
              rather than inside it — it must not be submitted with the fields. */}
          <div className="panel-head flex flex-wrap items-center gap-2.5">
            <FilterForm
              action={BASE_PATH}
              className="flex flex-1 flex-wrap items-center gap-2.5"
            >
              <SearchInput
                id="audit-search"
                name="q"
                label="Search the audit log"
                placeholder="Search actor, action or detail"
                defaultValue={query}
                className="min-w-[170px] flex-[2]"
              />
              <DateRangeField
                // Remounting on a URL change is what resets a half-picked
                // range, so the field never syncs itself back from its props.
                key={`${from}|${to}`}
                from={from}
                to={to}
                todayIso={max}
                min={min}
                max={max}
                label="Filter by date range"
                className="min-w-[118px]"
              />
              <FilterSelect
                id="audit-filter-actor"
                name="actor"
                label="Actor"
                options={actorOptions(options)}
                value={actorId}
                className={SELECT_CLASS}
              />
              <FilterSelect
                id="audit-filter-module"
                name="module"
                label="Module"
                options={withAll(ALL_MODULES, options.modules)}
                value={moduleCode}
                className={SELECT_CLASS}
              />
              <FilterSelect
                id="audit-filter-status"
                name="status"
                label="Outcome"
                options={withAll(ALL_STATUSES, options.statuses)}
                value={status}
                className={SELECT_CLASS}
              />
              <FilterSelect
                id="audit-filter-severity"
                name="severity"
                label="Severity"
                options={withAll(ALL_SEVERITIES, options.severities)}
                value={severity}
                className={SELECT_CLASS}
              />
              <FilterSubmit />
              <Link href={BASE_PATH} className="btn btn-secondary h-[38px]">
                Reset
              </Link>
            </FilterForm>

            <AuditExportPopover
              key={`${from}|${to}`}
              params={params}
              from={from}
              to={to}
              todayIso={max}
              min={min}
              max={max}
              scopeSummary={describeScope(
                query,
                actorId,
                moduleCode,
                status,
                severity,
                options,
              )}
              retentionDays={overview?.retentionDays ?? 0}
            />
          </div>

          <TableScroll minWidth={940}>
            <div className={cx("column-head-access", ROW_GRID)}>
              <span>Timestamp</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Detail</span>
              <span>IP address</span>
            </div>

            <ul>
              {page.items.map((event) => (
                <li
                  key={event.id}
                  className={cx("panel-row row-hover py-3", ROW_GRID)}
                >
                  <span className="text-muted text-note tabular-nums">
                    {event.time}
                  </span>

                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      name={event.actor}
                      size={30}
                      highlight={event.severity === "critical"}
                    />
                    <div className="min-w-0">
                      <p className="text-note truncate">{event.actor}</p>
                      <p className="text-meta text-muted truncate">
                        {event.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cx(
                        "size-[7px] flex-none rounded-full",
                        BG_TONE[SEVERITY_TONE[event.severity]],
                      )}
                    />
                    <span className="text-note truncate">
                      {describeAction(event.action, event.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-note truncate">{event.detail}</p>
                    <p className="text-meta text-muted truncate">
                      {labelModule(event.module)}
                    </p>
                  </div>

                  <span className="text-muted text-note tabular-nums">
                    {event.ip}
                  </span>
                </li>
              ))}
            </ul>
          </TableScroll>

          {isEmpty ? (
            <EmptyState
              message={error || "No events match these filters."}
              resetHref={BASE_PATH}
              resetLabel={error ? "Try again" : "Clear them"}
            />
          ) : null}

          <PaginationBar
            paged={page}
            basePath={BASE_PATH}
            params={params}
            unit="events"
            sizes={AUDIT_PAGE_SIZES}
            formId="audit"
          />
        </Panel>
      </ScreenStack>
    </AppScreen>
  );
}
