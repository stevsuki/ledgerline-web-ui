"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import { formatRangeLabel, type DateRange } from "@/lib/dates";
import { buildHref, type RawSearchParams } from "@/lib/search-params";

/**
 * The audit screen's export control: pick the period, download the file.
 *
 * The range in here belongs to the download and to nothing else. It is React
 * state rather than a URL param, so opening this and choosing dates leaves
 * the table behind it exactly as it was — the filter bar has its own range
 * field for changing what is on screen.
 *
 * The other filters are a different matter: they come from the URL and go
 * into the file, because this button sits at the end of the bar that set them
 * and quietly ignoring them would be the surprise. The scope block names
 * them, so what the file will hold is on screen before it is asked for rather
 * than discovered afterwards.
 *
 * It opens on whatever period the table is showing. That is a convenient
 * starting value, not a link — moving it from here moves only the export.
 *
 * The download is fetched rather than followed as a plain link, for one
 * reason: a link with `download` on it saves whatever comes back. When the
 * route answers with a failure the browser writes that sentence to disk as a
 * text file and shows nothing, which is how a dead endpoint reaches someone as
 * a mystery file in their downloads folder. Fetching first means the status
 * can be read, and a failure becomes a line in the popover instead.
 */

const EXPORT_PATH = "/audit/export";
const RANGE_FALLBACK = "All dates";
const FALLBACK_FILENAME = "audit-log.csv";
const GENERIC_FAILURE = "The export could not be produced.";

/** The filename the server chose, out of `Content-Disposition`. */
function filenameFrom(response: Response): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1]?.trim() || FALLBACK_FILENAME;
}

/** Hands the browser a file it already has in hand. */
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type AuditExportPopoverProps = {
  readonly params: RawSearchParams;
  /** The table's range, read once as this popover's opening value. */
  readonly from: string;
  readonly to: string;
  readonly todayIso: string;
  readonly min: string;
  readonly max: string;
  /** The active filters in words, built on the server that applied them. */
  readonly scopeSummary: string;
  /** From `/audit-logs/overview`; 0 when that call did not answer. */
  readonly retentionDays: number;
};

export function AuditExportPopover({
  params,
  from,
  to,
  todayIso,
  min,
  max,
  scopeSummary,
  retentionDays,
}: AuditExportPopoverProps) {
  const [isOpen, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ from, to });
  const [isDownloading, setDownloading] = useState(false);
  const [failure, setFailure] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const headingId = useId();

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
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function download() {
    setFailure("");
    setDownloading(true);

    try {
      const response = await fetch(exportHref);
      if (!response.ok) {
        setFailure((await response.text()).trim() || GENERIC_FAILURE);
        return;
      }
      save(await response.blob(), filenameFrom(response));
      setOpen(false);
    } catch {
      setFailure("The export could not be started.");
    } finally {
      setDownloading(false);
    }
  }

  /**
   * The export's own dates win over whatever the URL carries; every other
   * filter passes through untouched. `page` and `size` are dropped — a file
   * covers the filters, never a page of them.
   */
  const exportHref = buildHref(EXPORT_PATH, params, {
    from: range.from || undefined,
    to: range.to || undefined,
    page: undefined,
    size: undefined,
  });

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-primary h-[38px]"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Icon name="download" size={15} />
        Export log
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className="overlay-surface animate-rise absolute top-11 right-0 z-60 w-[320px] p-4"
        >
          <h2
            id={headingId}
            className="text-row font-[family-name:var(--font-heading)] font-semibold"
          >
            Export audit log
          </h2>
          <p className="text-meta text-muted mt-0.5">
            Choose the period to download. The table stays as it is.
          </p>

          <div className="mt-3.5">
            <Calendar
              value={range}
              onChange={setRange}
              todayIso={todayIso}
              min={min}
              max={max}
              labelledBy={headingId}
            />
          </div>

          <dl className="inset mt-3.5 grid gap-1 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-meta text-muted">Period</dt>
              <dd className="text-note truncate">
                {formatRangeLabel(range, RANGE_FALLBACK)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-meta text-muted">Filters</dt>
              <dd className="text-note truncate">{scopeSummary}</dd>
            </div>
          </dl>

          {/* Retention is the backend's to report; when the overview call
              failed there is no number to state, so nothing is claimed. */}
          {retentionDays > 0 ? (
            <p className="text-meta text-muted mt-2">
              Events older than {retentionDays} days are archived and cannot be
              exported.
            </p>
          ) : null}

          {failure ? (
            <p
              role="alert"
              className="text-expense text-meta border-expense/35 mt-3.5 rounded-[var(--radius-control)] border px-3 py-2"
            >
              {failure}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isDownloading}
            className="btn btn-primary btn-block mt-3.5"
            onClick={download}
          >
            <Icon name="download" size={15} />
            {isDownloading ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
