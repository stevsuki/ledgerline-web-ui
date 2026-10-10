"use client";

import { useDeferredValue, useState, type KeyboardEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { CATALOGUE_INDEX_URL } from "@/lib/icon-catalogue.generated";
import {
  catalogueIconName,
  withCurrent,
  type CatalogueIconName,
  type IconKey,
} from "@/lib/icon-choice";

/** How many matches are drawn at once; past it the line asks for more letters. */
const RESULT_LIMIT = 60;

type CatalogueEntry = {
  readonly name: CatalogueIconName;
  /** The name as a person would say it: `piggy bank`, not `piggy-bank`. */
  readonly label: string;
  /** The label and the icon's tags, which is what a query is matched against. */
  readonly haystack: string;
};

type PendingStatus = "idle" | "loading" | "failed";

type CatalogueState =
  | { readonly status: PendingStatus }
  | { readonly status: "ready"; readonly entries: readonly CatalogueEntry[] };

const IDLE: CatalogueState = { status: "idle" };
const LOADING: CatalogueState = { status: "loading" };
const FAILED: CatalogueState = { status: "failed" };

type SearchResult = {
  readonly shown: readonly CatalogueEntry[];
  readonly total: number;
};

const NO_RESULT: SearchResult = { shown: [], total: 0 };

function isIndexRow(row: unknown): row is readonly [string, string] {
  return (
    Array.isArray(row) &&
    row.length === 2 &&
    typeof row[0] === "string" &&
    typeof row[1] === "string"
  );
}

async function fetchCatalogue(): Promise<readonly CatalogueEntry[]> {
  const response = await fetch(CATALOGUE_INDEX_URL);
  if (!response.ok) {
    throw new Error(`The icon index answered ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new TypeError("The icon index is not a list");
  }
  return payload.filter(isIndexRow).map(([symbol, tags]) => {
    const label = symbol.replaceAll("-", " ");
    return {
      name: catalogueIconName(symbol),
      label,
      haystack: `${label} ${tags}`,
    };
  });
}

/** One fetch for the whole session, shared by every picker on the page. */
let catalogueRequest: Promise<readonly CatalogueEntry[]> | undefined;

function loadCatalogue(): Promise<readonly CatalogueEntry[]> {
  catalogueRequest ??= fetchCatalogue().catch((error: unknown) => {
    // A failed fetch must not be the answer for good; the next try starts over.
    catalogueRequest = undefined;
    throw error;
  });
  return catalogueRequest;
}

/** Icons named for the query come before the ones that merely mention it. */
function rankOf(entry: CatalogueEntry, term: string): number {
  if (entry.label.startsWith(term)) {
    return 0;
  }
  return entry.label.includes(term) ? 1 : 2;
}

function searchCatalogue(
  entries: readonly CatalogueEntry[],
  query: string,
  taken: readonly IconKey[],
): SearchResult {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const [first] = terms;
  if (first === undefined) {
    return NO_RESULT;
  }
  const matches = entries
    .filter(
      (entry) =>
        !taken.includes(entry.name) &&
        terms.every((term) => entry.haystack.includes(term)),
    )
    .sort((a, b) => rankOf(a, first) - rankOf(b, first));
  return { shown: matches.slice(0, RESULT_LIMIT), total: matches.length };
}

const PENDING_LINE: Readonly<Record<PendingStatus, string>> = {
  idle: "Search by name, or by what it shows — “food”, “travel”, “pet”.",
  loading: "Loading the icon library…",
  failed: "The icon library could not be loaded. Type again to retry.",
};

function statusLine(
  state: CatalogueState,
  query: string,
  result: SearchResult,
): string {
  if (state.status !== "ready") {
    return PENDING_LINE[state.status];
  }
  const asked = query.trim();
  if (asked === "") {
    return PENDING_LINE.idle;
  }
  if (result.total === 0) {
    return `No icon matches “${asked}”.`;
  }
  if (result.total > result.shown.length) {
    return `Showing ${result.shown.length} of ${result.total} — keep typing to narrow it down.`;
  }
  return "Pick one to add it to the row above.";
}

/**
 * The icon a record wears — a name, never a picture.
 *
 * The shortlist is native radios, so the common answers post with JavaScript
 * off and the arrow keys walk them. Under it, a search reaches the whole
 * catalogue: its index is fetched the first time the box is used, never with
 * the page, and a match that is picked joins the radios as the checked one.
 *
 * Pass `value` + `onChange` to drive it from state, exactly as `SelectField`
 * does; omit both for a plain form.
 */
export function IconChoiceField({
  id,
  label,
  choices,
  defaultValue,
  value,
  onChange,
  name,
  note,
}: {
  readonly id: string;
  readonly label: string;
  readonly choices: readonly IconKey[];
  readonly defaultValue?: IconKey;
  readonly value?: IconKey;
  readonly onChange?: (next: IconKey) => void;
  readonly name?: string;
  /** The line under the field, saying where the choice shows up. */
  readonly note?: string;
}) {
  const [picked, setPicked] = useState<IconKey | undefined>(defaultValue);
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState<CatalogueState>(IDLE);
  const deferredQuery = useDeferredValue(query);

  const current = value ?? picked;
  const shortlist =
    current === undefined ? choices : withCurrent(choices, current);
  const result =
    catalogue.status === "ready"
      ? searchCatalogue(catalogue.entries, deferredQuery, shortlist)
      : NO_RESULT;
  const searchId = `${id}-search`;
  const statusId = `${id}-status`;

  function choose(next: IconKey): void {
    setPicked(next);
    onChange?.(next);
  }

  function openCatalogue(): void {
    if (catalogue.status === "loading" || catalogue.status === "ready") {
      return;
    }
    setCatalogue(LOADING);
    loadCatalogue().then(
      (entries) => setCatalogue({ status: "ready", entries }),
      () => setCatalogue(FAILED),
    );
  }

  /** Enter in the box must not submit the form the picker sits in. */
  function keepEnter(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  return (
    <fieldset className="field" id={id}>
      <legend>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {shortlist.map((choice) => (
          <label key={choice} className="icon-choice" title={choice}>
            <input
              type="radio"
              name={name ?? id}
              value={choice}
              aria-label={choice}
              checked={current === choice}
              onChange={() => choose(choice)}
            />
            <Icon name={choice} size={16} />
          </label>
        ))}
      </div>

      <div className="mt-2.5">
        <label htmlFor={searchId} className="sr-only">
          Search all icons
        </label>
        <input
          id={searchId}
          type="search"
          className="input"
          placeholder="Search all icons"
          autoComplete="off"
          value={query}
          aria-describedby={statusId}
          onFocus={openCatalogue}
          onChange={(event) => {
            openCatalogue();
            setQuery(event.target.value);
          }}
          onKeyDown={keepEnter}
        />
      </div>

      {result.shown.length > 0 ? (
        // The inset clips; the list inside it scrolls. One element doing both
        // lets the scrollbar's square ends run through the rounded corners.
        <div className="inset mt-2 overflow-hidden">
          <div className="flex max-h-[176px] flex-wrap gap-2 overflow-y-auto p-2.5">
            {result.shown.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className="icon-choice"
                title={entry.label}
                aria-label={`Use ${entry.label}`}
                onClick={() => choose(entry.name)}
              >
                <Icon name={entry.name} size={16} />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p
        id={statusId}
        aria-live="polite"
        className="text-meta text-muted mt-1.5"
      >
        {statusLine(catalogue, deferredQuery, result)}
      </p>
      {note ? <p className="text-meta text-muted mt-1">{note}</p> : null}
    </fieldset>
  );
}
