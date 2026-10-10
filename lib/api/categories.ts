import { knownIconOrBlank } from "@/lib/api/icon-key";
import type { IconKey } from "@/lib/icon-choice";
import {
  apiRequest,
  withParsed,
  withQuery,
  withoutData,
} from "@/lib/api/client";
import { isRecord, readEnum, readString } from "@/lib/api/parse";
import {
  CATEGORY_KIND_ORDER,
  RAMP_STEPS,
} from "@/lib/category-fields";
import type { ApiResult } from "@/types/api";
import type { CategoryKind, RampStep } from "@/types/ledger";

/**
 * The `/categories` endpoints.
 *
 * A category is **per user**, and an account starts with none: nothing is seeded
 * at registration. `/categories` is therefore only what the account has made or
 * taken up — the pickers read `/categories/options`, which offers the shared
 * master rows alongside it.
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
  readonly icon: IconKey | "";
  readonly color: RampStep | "";
  /**
   * False marks a shared master row: offered to this account, not held by it.
   * It has no timestamps and nothing to delete, and editing it takes it up.
   */
  readonly isOwn: boolean;
  /**
   * Whether this name and direction are one of the shared master rows. Always
   * true while the row still is one; for a row the account holds it is read off
   * the same name-and-direction rule the offer list uses.
   */
  readonly isBuiltIn: boolean;
};

/* ── parsing ───────────────────────────────────────────────────────────── */

/** Anything this sprite cannot draw is no icon at all, exactly as "" is. */
function readIcon(raw: Record<string, unknown>): IconKey | "" {
  const name = readString(raw, "icon");
  return knownIconOrBlank(name ?? "");
}

function readColor(raw: Record<string, unknown>): RampStep | "" {
  const value = readString(raw, "color");
  return RAMP_STEPS.find((step) => step === value) ?? "";
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
    isOwn: raw.is_own !== false,
    isBuiltIn: raw.is_built_in === true,
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

/**
 * A category as a select offers it.
 *
 * The id may name one of the account's own categories or a master row it has
 * not taken up yet — the caller does not have to tell them apart, it posts the
 * id back either way and the backend resolves it. `kind` rides along because
 * the add-transaction sheet offers only the half matching the direction being
 * recorded.
 */
export type CategoryOption = {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
};

/** Narrow the offer to one direction, or omit for both. */
export type CategoryOptionType = CategoryKind | "";

function parseOption(raw: unknown): CategoryOption | null {
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
  };
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
 * Each caller asks for the direction it needs. That is not the rule living in
 * two places: what a budget may limit is enforced where budgets are written, and
 * this list only decides what is convenient to show.
 */
export async function fetchCategoryOptions(
  accessToken: string,
  type: CategoryOptionType = "",
): Promise<ApiResult<readonly CategoryOption[]>> {
  const result = await apiRequest({
    path: withQuery(`${CATEGORIES}/options`, { type }),
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
};

/** The body both writes send. */
function categoryBody(input: CategoryInput): Record<string, unknown> {
  return {
    name: input.name,
    type: input.kind,
    icon: input.icon,
    color: input.color,
  };
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
