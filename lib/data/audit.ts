import {
  fetchAuditOptions,
  fetchAuditOverview,
  listAuditLogs,
} from "@/lib/api/audit";
import { requireAccessToken } from "@/lib/auth/session";
import { addDays, toIsoDate } from "@/lib/dates";
import { pagedFromTotal, type Paged } from "@/lib/pagination";
import {
  AUDIT_MODULES,
  AUDIT_SEVERITIES,
  AUDIT_STATUSES,
  type AuditEvent,
  type AuditOptions,
  type AuditOverview,
} from "@/types/access";
import type { MiniStat } from "@/types/ledger";

/**
 * The audit log, live from `ledgerline-backend`.
 *
 * Everything the screen shows comes from three endpoints, asked for together:
 * the page of rows, the counters behind the four cards, and the values the
 * filter dropdowns offer. They are independent, so they go out in parallel and
 * the screen waits once rather than three times.
 *
 * Filtering, sorting and pagination all happen in the database. The browser
 * receives the ten rows it is showing and nothing else.
 */

export const AUDIT_PAGE_SIZES = [10, 25, 50] as const;

/** Every dropdown's first entry: the filter switched off. */
export const NO_FILTER = "";

/**
 * A retention window with no counters yet — the fallback used when the
 * overview call is the one that failed, so the date picker still has bounds.
 */
const FALLBACK_RETENTION_DAYS = 365;

const EMPTY_OPTIONS: AuditOptions = {
  actors: [],
  modules: [],
  statuses: [],
  severities: [],
};

/**
 * A UUID as the backend writes them. `user_id` is the only filter whose values
 * are not a closed set, so it is shape-checked here rather than sent blind and
 * bounced back as a 400.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isActorId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** The three closed vocabularies, for `readOption` to validate a URL against. */
export const AUDIT_STATUS_VALUES = [NO_FILTER, ...AUDIT_STATUSES] as const;
export const AUDIT_SEVERITY_VALUES = [NO_FILTER, ...AUDIT_SEVERITIES] as const;
export const AUDIT_MODULE_VALUES = [NO_FILTER, ...AUDIT_MODULES] as const;

export type AuditFilters = {
  readonly query: string;
  readonly actorId: string;
  readonly module: string;
  readonly status: string;
  readonly severity: string;
  readonly from: string;
  readonly to: string;
  readonly sort: string;
  readonly page: number;
  readonly size: number;
};

export type AuditResult = {
  readonly page: Paged<AuditEvent>;
  readonly stats: readonly MiniStat[];
  readonly options: AuditOptions;
  readonly overview: AuditOverview | null;
  readonly isEmpty: boolean;
  /** An expected failure, ready to show; empty when everything answered. */
  readonly error: string;
};

/**
 * The window the date picker may offer. Retention is policy the backend owns,
 * so it comes from the overview; the fallback only matters when that call
 * failed, and then the picker is bounded rather than unbounded.
 */
export function auditRetentionBounds(overview: AuditOverview | null): {
  readonly min: string;
  readonly max: string;
} {
  const today = new Date();
  const days = overview?.retentionDays || FALLBACK_RETENTION_DAYS;
  return { min: toIsoDate(addDays(today, -days)), max: toIsoDate(today) };
}

/** "1 address" / "3 addresses" — the note under the failed sign-ins card. */
function addressNote(count: number): string {
  const noun = count === 1 ? "address" : "addresses";
  return `From ${count} ${noun}`;
}

function auditStats(overview: AuditOverview | null): readonly MiniStat[] {
  if (!overview) {
    return [];
  }

  return [
    {
      id: "events",
      label: `Events, ${overview.windowDays} days`,
      value: String(overview.events),
      tone: "text",
      note: `Across ${overview.modules} modules`,
    },
    {
      id: "sensitive",
      label: "Sensitive",
      value: String(overview.sensitive),
      tone: "warn",
      note: "Permission, export, delete",
    },
    {
      id: "failed",
      label: "Failed sign-ins",
      value: String(overview.failedSignIns),
      tone: "expense",
      note: addressNote(overview.failedSignInAddresses),
    },
    {
      id: "retention",
      label: "Retention",
      value: `${overview.retentionDays} days`,
      tone: "text",
      note: "Then archived to cold storage",
    },
  ];
}

export async function getAuditLog(
  filters: AuditFilters,
): Promise<AuditResult> {
  const accessToken = await requireAccessToken();

  const [listed, overviewResult, optionsResult] = await Promise.all([
    listAuditLogs(accessToken, {
      search: filters.query,
      userId: filters.actorId,
      status: filters.status,
      severity: filters.severity,
      module: filters.module,
      from: filters.from,
      to: filters.to,
      sort: filters.sort,
      page: filters.page,
      perPage: filters.size,
    }),
    fetchAuditOverview(accessToken),
    fetchAuditOptions(accessToken),
  ]);

  const overview = overviewResult.ok ? overviewResult.data : null;
  const options = optionsResult.ok ? optionsResult.data : EMPTY_OPTIONS;

  if (!listed.ok) {
    return {
      page: pagedFromTotal<AuditEvent>([], 1, filters.size, 0),
      stats: auditStats(overview),
      options,
      overview,
      isEmpty: true,
      error: listed.error.message,
    };
  }

  return {
    page: pagedFromTotal(
      listed.data.items,
      filters.page,
      filters.size,
      listed.data.total,
    ),
    stats: auditStats(overview),
    options,
    overview,
    isEmpty: listed.data.items.length === 0,
    error: "",
  };
}
