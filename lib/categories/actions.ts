"use server";

import { revalidatePath } from "next/cache";

import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/api/categories";
import {
  failureState,
  localFailureState,
  noticeState,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { requireAccessToken } from "@/lib/auth/session";
import {
  CATEGORY_FIELD,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  parseCategoryKind,
  rampStepOrBlank,
} from "@/lib/category-fields";
import { iconNameOrBlank } from "@/lib/icon-choice";

/**
 * The categories screen's mutations, over the live `/categories` endpoints.
 *
 * Only what the backend cannot phrase better is checked here — a name that is
 * too short comes back from Gin as a bind error nobody can act on. Everything
 * else is the API's answer, keyed by the field it names, which is why the form
 * posts the backend's own json tags.
 */

const NAME_ERROR = `Give the category a name of ${CATEGORY_NAME_MIN_LENGTH} to ${CATEGORY_NAME_MAX_LENGTH} characters.`;
const CHECK_FIELDS = "Check the highlighted fields and try again.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** What was typed, kept as it was typed: a rejected save has to come back legible. */
function submittedValues(formData: FormData): Readonly<Record<string, string>> {
  return {
    // The id rides along so the sheet can tell whether an error it is holding
    // belongs to the category now on screen, or to the one opened before it.
    [CATEGORY_FIELD.id]: text(formData, CATEGORY_FIELD.id),
    [CATEGORY_FIELD.name]: text(formData, CATEGORY_FIELD.name),
  };
}

type ReadResult =
  | { readonly ok: true; readonly input: CategoryInput }
  | {
      readonly ok: false;
      readonly fieldErrors: Readonly<Record<string, string>>;
    };

function readInput(formData: FormData): ReadResult {
  const name = text(formData, CATEGORY_FIELD.name);

  if (
    name.length < CATEGORY_NAME_MIN_LENGTH ||
    name.length > CATEGORY_NAME_MAX_LENGTH
  ) {
    return { ok: false, fieldErrors: { [CATEGORY_FIELD.name]: NAME_ERROR } };
  }

  return {
    ok: true,
    input: {
      name,
      kind: parseCategoryKind(text(formData, CATEGORY_FIELD.kind)),
      // "" hands the tile and the colour back to the reader, which is the
      // column's own default — never a guess made on the way out.
      icon: iconNameOrBlank(text(formData, CATEGORY_FIELD.icon)),
      color: rampStepOrBlank(text(formData, CATEGORY_FIELD.color)),
      // A category created here derives from no master row. On an edit the
      // field is left out entirely, so the seeded link is never cut by accident.
      masterId: "",
    },
  };
}

/**
 * Master data is read wherever a category is named, so the whole shell is
 * revalidated rather than this one page: the add-transaction sheet lives in the
 * app layout and offers the very list being edited here.
 */
function revalidateCategories(): void {
  revalidatePath("/", "layout");
}

/**
 * One action behind both the "Add category" button and every row's pencil. Add
 * and edit are one form for the reason wallets and budgets already record:
 * split in two, they drift.
 */
export async function saveCategoryAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const id = text(formData, CATEGORY_FIELD.id);
  const values = submittedValues(formData);

  const read = readInput(formData);
  if (!read.ok) {
    return localFailureState(CHECK_FIELDS, read.fieldErrors, values);
  }

  const accessToken = await requireAccessToken();
  const result = id
    ? await updateCategory(accessToken, id, read.input)
    : await createCategory(accessToken, read.input);

  if (!result.ok) {
    return failureState(result.error, values);
  }

  revalidateCategories();
  return noticeState(`${result.data.name} ${id ? "updated" : "added"}.`);
}

/**
 * Removal is a handler rather than a form: the button only exists inside a
 * slide-over that JavaScript opened, so there is no no-script path to protect.
 * "" means it went through.
 */
export async function deleteCategoryAction(id: string): Promise<string> {
  if (!id) {
    return "";
  }

  const accessToken = await requireAccessToken();
  const result = await deleteCategory(accessToken, id);
  if (!result.ok) {
    return failureState(result.error).error;
  }

  revalidateCategories();
  return "";
}
