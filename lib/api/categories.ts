import { ICON_NAMES, type IconName } from "@/components/ui/icon-sprite";
import {
  apiRequest,
  withParsed,
  withQuery,
  withoutData,
} from "@/lib/api/client";
import { isRecord, readEnum, readString } from "@/lib/api/parse";
import {
  CATEGORY_KIND_ORDER,
  NIL_UUID,
  RAMP_STEPS,
} from "@/lib/category-fields";
import type { ApiResult } from "@/types/api";
import type { CategoryKind, RampStep } from "@/types/ledger";

/**
 * The `/categories` endpoints.
 *
 * A category is **per user**: `SeedDefaults` copies the seven `master_categories`
 * rows into an account at registration, all as `expense`, and everything after
 * that is the account's own. `master_category_id` is the only trace of where a
 * row came from, which is why it is carried through rather than dropped.
 *
 * This layer states what the API states and nothing more — what a row is drawn
 * with is decided in `lib/data/category-list.ts`.
 */

const CATEGORIES = "/categories";

export type CategoryRecord = {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
  /** "" when the category has no icon of its own; the reader resolves one. */
  readonly icon: IconName | "";
  readonly color: RampStep | "";
  /** The master row it derives from, or "" when it derives from none. */
  readonly masterId: string;
};

/* ── parsing ───────────────────────────────────────────────────────────── */

/** Anything this sprite cannot draw is no icon at all, exactly as "" is. */
function readIcon(raw: Record<string, unknown>): IconName | "" {
  const name = readString(raw, "icon");
  return ICON_NAMES.find((icon) => icon === name) ?? "";
}

function readColor(raw: Record<string, unknown>): RampStep | "" {
  const value = readString(raw, "color");
  return RAMP_STEPS.find((step) => step === value) ?? "";
}

/** The zero uuid is how "no master row" comes back over the wire. */
function readMasterId(raw: Record<string, unknown>): string {
  const id = readString(raw, "master_category_id") ?? "";
  return id === NIL_UUID ? "" : id;
}

function parseCategory(raw: unknown): CategoryRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const name = readString(raw, "name");
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    kind: readEnum(raw, "type", CATEGORY_KIND_ORDER, "expense"),
    icon: readIcon(raw),
    color: readColor(raw),
    masterId: readMasterId(raw),
  };
}

function parseCategories(raw: unknown): readonly CategoryRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const categories: CategoryRecord[] = [];
  for (const entry of raw) {
    const category = parseCategory(entry);
    if (category) {
      categories.push(category);
    }
  }
  return categories;
}

/* ── reads ─────────────────────────────────────────────────────────────── */

/**
 * GET /categories — every category the signed-in user owns, oldest first.
 *
 * It does not page: a person keeps a handful, and the list is read whole
 * wherever a category has to be named. The array is taken off the result
 * rather than through `withParsed`, which would read an empty list as an
 * unreadable answer.
 */
export async function listCategories(
  accessToken: string,
): Promise<ApiResult<readonly CategoryRecord[]>> {
  const result = await apiRequest({
    path: CATEGORIES,
    method: "GET",
    accessToken,
  });
  return result.ok ? { ...result, data: parseCategories(result.data) } : result;
}

/* ── options ───────────────────────────────────────────────────────────── */

/** A category as a select offers it: the id it posts and the name it shows. */
export type CategoryOption = {
  readonly id: string;
  readonly name: string;
};

/**
 * The screens that ask for a shortlist rather than the whole list. `filter`
 * takes every type; `budget` narrows to expense, because a budget can only
 * limit money going out.
 */
export type CategoryOptionSlug = "filter" | "budget";

function parseOption(raw: unknown): CategoryOption | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, "id");
  const name = readString(raw, "name");
  return id && name ? { id, name } : null;
}

function parseOptions(raw: unknown): readonly CategoryOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const options: CategoryOption[] = [];
  for (const entry of raw) {
    const option = parseOption(entry);
    if (option) {
      options.push(option);
    }
  }
  return options;
}

/**
 * GET /categories/options?slug=… — the categories one screen may offer.
 *
 * The narrowing is the backend's to make, not this client's: `slug=budget`
 * already excludes income, so a budget form that read the full list and
 * filtered it here would be a second copy of that rule waiting to drift.
 */
export async function fetchCategoryOptions(
  accessToken: string,
  slug: CategoryOptionSlug,
): Promise<ApiResult<readonly CategoryOption[]>> {
  const result = await apiRequest({
    path: withQuery(`${CATEGORIES}/options`, { slug }),
    method: "GET",
    accessToken,
  });
  return result.ok ? { ...result, data: parseOptions(result.data) } : result;
}

/* ── writes ────────────────────────────────────────────────────────────── */

export type CategoryInput = {
  readonly name: string;
  readonly kind: CategoryKind;
  /** An icon key from this app's sprite; "" hands the choice back to the reader. */
  readonly icon: string;
  readonly color: string;
  /** The master row this derives from; "" for one named by hand. */
  readonly masterId: string;
};

/**
 * The body both writes send. `master_category_id` is left out unless there is
 * one: on a create that means "derives from no master row", and on a patch an
 * absent field means "leave the link alone" — which is what keeps editing a
 * seeded category from quietly cutting it loose from the row it came from.
 */
function categoryBody(input: CategoryInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name,
    type: input.kind,
    icon: input.icon,
    color: input.color,
  };

  if (input.masterId) {
    body.master_category_id = input.masterId;
  }
  return body;
}

/** POST /categories */
export async function createCategory(
  accessToken: string,
  input: CategoryInput,
): Promise<ApiResult<CategoryRecord>> {
  return withParsed(
    await apiRequest({
      path: CATEGORIES,
      method: "POST",
      accessToken,
      body: categoryBody(input),
    }),
    parseCategory,
  );
}

/** PATCH /categories/{id} */
export async function updateCategory(
  accessToken: string,
  id: string,
  input: CategoryInput,
): Promise<ApiResult<CategoryRecord>> {
  return withParsed(
    await apiRequest({
      path: `${CATEGORIES}/${id}`,
      method: "PATCH",
      accessToken,
      body: categoryBody(input),
    }),
    parseCategory,
  );
}

/** DELETE /categories/{id} — a soft delete, server-side. */
export async function deleteCategory(
  accessToken: string,
  id: string,
): Promise<ApiResult<null>> {
  return withoutData(
    await apiRequest({
      path: `${CATEGORIES}/${id}`,
      method: "DELETE",
      accessToken,
    }),
  );
}
