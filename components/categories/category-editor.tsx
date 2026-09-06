"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { FormBanner } from "@/components/auth/form-feedback";
import { useAppChrome } from "@/components/shell/app-chrome";
import {
  ColorChoiceField,
  IconChoiceField,
  SelectField,
  TextField,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { InsetBlock } from "@/components/ui/panel";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import {
  CATEGORY_FIELD,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  ICON_BY_CATEGORY_KIND,
  RAMP_STEPS,
  categoryIconChoices,
  parseCategoryKind,
  rampStepLabel,
} from "@/lib/category-fields";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/lib/categories/actions";
import type { CategoryDraft, CategoryRow } from "@/lib/data/category-list";
import type {
  CategoryKind,
  RampStep,
  SelectChoice,
} from "@/types/ledger";

/**
 * The category editor: one slide-over behind both the "Add category" button and
 * every row's pencil.
 *
 * Add and edit are one form for the reason wallets and budgets already record —
 * split in two they drift — and it matters here in a particular way. A category
 * named on the fly from a transaction's Other field arrives with nothing but a
 * name; this sheet is where it is given the tile and the colour it will wear
 * everywhere else, so the two paths have to end at the same fields.
 */

type EditorApi = {
  /** `null` opens the sheet blank, for a category that does not exist yet. */
  readonly open: (row: CategoryRow | null) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

const ADD_TITLE = "Add category";

const ADD_SUBTITLE = "Filed against from the next transaction onwards.";

const NO_ERRORS: Readonly<Record<string, string>> = {};

function useEditor(): EditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error(
      "Category edit buttons must be inside <CategoryEditorProvider>",
    );
  }
  return context;
}

function saveLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return "Saving…";
  }
  return isEdit ? "Save changes" : ADD_TITLE;
}

export function CategoryEditorProvider({
  children,
  blank,
  kinds,
}: {
  readonly children: ReactNode;
  /** What a category that does not exist yet opens on. */
  readonly blank: CategoryDraft;
  readonly kinds: readonly SelectChoice[];
}) {
  const { showToast } = useAppChrome();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, startRemoving] = useTransition();
  const formId = useId();

  const [state, formAction, isSaving] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await saveCategoryAction(previousState, formData);
      if (next.notice) {
        setOpen(false);
        showToast(next.notice);
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );

  const open = useCallback((row: CategoryRow | null) => {
    setRemoveError("");
    setEditing(row);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open }), [open]);

  const isEdit = editing !== null;
  const draft = editing?.draft ?? blank;
  const isBusy = isSaving || isRemoving;

  // One action serves every row, so its state outlives the sheet that failed.
  // The id echoed back in `values` is what stops a rejection on one category
  // greeting the next one opened.
  const isCurrent = (state.values[CATEGORY_FIELD.id] ?? "") === draft.id;
  const fieldErrors = isCurrent ? state.fieldErrors : NO_ERRORS;

  /** The sheet stays open until the delete answers, or it unmounts mid-flight. */
  function remove(): void {
    if (!editing || !window.confirm(`Remove ${editing.name} from the list?`)) {
      return;
    }

    const { id, name } = editing;
    startRemoving(async () => {
      const error = await deleteCategoryAction(id);
      if (error) {
        setRemoveError(error);
        return;
      }
      setOpen(false);
      showToast(`${name} removed`);
    });
  }

  return (
    <EditorContext.Provider value={api}>
      {children}

      <SlideOver
        open={isOpen}
        onClose={close}
        title={isEdit ? "Edit category" : ADD_TITLE}
        subtitle={editing?.meta ?? ADD_SUBTITLE}
        footer={
          <>
            <button
              type="submit"
              form={formId}
              disabled={isBusy}
              className="btn btn-primary flex-1"
            >
              {saveLabel(isEdit, isSaving)}
            </button>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            {editing?.removal.canRemove ? (
              <button
                type="button"
                disabled={isBusy}
                className="btn btn-ghost text-expense ml-auto"
                onClick={remove}
              >
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </>
        }
      >
        {/* Keyed on the category so every field resets per row. */}
        <CategoryFields
          key={draft.id || "new"}
          formId={formId}
          formAction={formAction}
          fieldErrors={fieldErrors}
          bannerError={removeError || (isCurrent ? state.error : "")}
          draft={draft}
          kinds={kinds}
          keptReason={editing?.removal.canRemove ? "" : editing?.removal.reason}
        />
      </SlideOver>
    </EditorContext.Provider>
  );
}

function CategoryFields({
  formId,
  formAction,
  fieldErrors,
  bannerError,
  draft,
  kinds,
  keptReason,
}: {
  readonly formId: string;
  readonly formAction: (formData: FormData) => void;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly bannerError: string;
  readonly draft: CategoryDraft;
  readonly kinds: readonly SelectChoice[];
  /** Why this category cannot be removed, or "" when it can. */
  readonly keptReason?: string;
}) {
  const [kind, setKind] = useState<CategoryKind>(draft.kind);
  const [icon, setIcon] = useState<IconName>(draft.icon);
  const [color, setColor] = useState<RampStep>(draft.color);
  // An existing category already wears a decision; a new one is still following
  // the Type select, and stops the moment someone picks a tile themselves.
  const [iconPicked, setIconPicked] = useState(draft.id !== "");

  function changeKind(next: string): void {
    const parsed = parseCategoryKind(next);
    setKind(parsed);
    if (!iconPicked) {
      setIcon(ICON_BY_CATEGORY_KIND[parsed]);
    }
  }

  function chooseIcon(next: IconName): void {
    setIcon(next);
    setIconPicked(true);
  }

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-4">
      {bannerError ? <FormBanner tone="error" message={bannerError} /> : null}

      <input type="hidden" name={CATEGORY_FIELD.id} value={draft.id} />

      <TextField
        id="category-name"
        name={CATEGORY_FIELD.name}
        label="Category name"
        defaultValue={draft.name}
        placeholder="Travel"
        minLength={CATEGORY_NAME_MIN_LENGTH}
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        error={fieldErrors[CATEGORY_FIELD.name]}
        required
      />

      <KindField
        kinds={kinds}
        kind={kind}
        onChange={changeKind}
        isFallback={draft.isFallback}
      />

      <IconChoiceField
        id="category-icon"
        name={CATEGORY_FIELD.icon}
        label="Icon"
        note="Drawn beside the name here, on its budget, and in the ledger."
        choices={categoryIconChoices(icon)}
        value={icon}
        onChange={chooseIcon}
      />

      <ColorChoiceField
        id="category-color"
        name={CATEGORY_FIELD.color}
        label="Colour"
        note="Its share of every chart that splits spending by category."
        choices={RAMP_STEPS}
        optionLabel={rampStepLabel}
        value={color}
        onChange={setColor}
      />

      {keptReason ? (
        <InsetBlock className="p-3.5">
          <p className="text-row">Kept for now</p>
          <p className="text-meta text-muted mt-1.5">{keptReason}</p>
        </InsetBlock>
      ) : null}
    </form>
  );
}

/**
 * Which way the category runs. The fallback cannot change: something has to
 * catch spending nobody named, and a category that has become income would
 * catch it silently.
 */
function KindField({
  kinds,
  kind,
  onChange,
  isFallback,
}: {
  readonly kinds: readonly SelectChoice[];
  readonly kind: CategoryKind;
  readonly onChange: (next: string) => void;
  readonly isFallback: boolean;
}) {
  if (isFallback) {
    return (
      <InsetBlock className="p-3.5">
        <p className="text-row">Type stays Expense</p>
        <p className="text-meta text-muted mt-1.5">
          This is the bucket unnamed spending falls into, so it has to stay
          somewhere money goes.
        </p>
      </InsetBlock>
    );
  }

  return (
    <div>
      <SelectField
        id="category-kind"
        name={CATEGORY_FIELD.kind}
        label="Type"
        options={kinds}
        value={kind}
        onChange={onChange}
      />
      <p className="text-meta text-muted mt-1.5">
        Only a spending category can be budgeted or charted.
      </p>
    </div>
  );
}

/** The button in the list panel's header. */
export function AddCategoryButton() {
  const { open } = useEditor();

  return (
    <button
      type="button"
      className="btn btn-primary gap-1.5"
      onClick={() => open(null)}
    >
      <Icon name="plus" size={15} />
      {ADD_TITLE}
    </button>
  );
}

/** The pencil on a category row. Icon-only, so it carries the row's name. */
export function EditCategoryButton({ row }: { readonly row: CategoryRow }) {
  const { open } = useEditor();

  return (
    <button
      type="button"
      aria-label={`Edit ${row.name}`}
      className="btn btn-secondary btn-icon text-muted hover:text-text size-[30px]"
      onClick={() => open(row)}
    >
      <Icon name="pencil" size={14} />
    </button>
  );
}
