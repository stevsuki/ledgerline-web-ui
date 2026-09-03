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

import { ThresholdField } from "@/components/budgets/threshold-field";
import { useAppChrome } from "@/components/shell/app-chrome";
import { IconChoiceField, SelectField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import {
  BUDGET_FIELD,
  ICON_BY_CATEGORY,
  budgetIconChoices,
  isSpendCategory,
} from "@/lib/budget-fields";
import { deleteBudgetAction, saveBudgetAction } from "@/lib/budgets/actions";
import type {
  BudgetCategoryChoice,
  BudgetDraft,
  BudgetRow,
} from "@/lib/data/budgets";
import { cx } from "@/lib/tone";
import type { CategoryKey } from "@/types/ledger";

/**
 * The budget editor: one field set behind both the "New budget" panel and every
 * row's pencil.
 *
 * Add and edit share `<BudgetFields>` on purpose — the lesson the wallets sheet
 * already records. It matters twice over here, because until now a threshold
 * could only be *chosen at creation*: the six budgets that already existed had
 * no edit affordance at all, so the 75% on Utilities could not be reached from
 * the UI that was supposed to set it.
 */

const NO_ERRORS: Readonly<Record<string, string>> = {};

/** Nothing to correct on a form that has not been rejected. */
type SaveState = {
  readonly formAction: (formData: FormData) => void;
  readonly isSaving: boolean;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly error: string;
};

/**
 * One action serves every row, so its state outlives the form that failed. The
 * id echoed back in `values` is what stops a rejection on one budget greeting
 * the next one opened.
 */
function useBudgetSave(draftId: string, onSaved?: () => void): SaveState {
  const { showToast } = useAppChrome();

  const [state, formAction, isSaving] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await saveBudgetAction(previousState, formData);
      if (next.notice) {
        showToast(next.notice);
        onSaved?.();
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );

  const isCurrent = (state.values[BUDGET_FIELD.id] ?? "") === draftId;

  return {
    formAction,
    isSaving,
    fieldErrors: isCurrent ? state.fieldErrors : NO_ERRORS,
    error: isCurrent ? state.error : "",
  };
}

/* ── the sheet ─────────────────────────────────────────────────────────── */

type EditorApi = {
  readonly open: (budget: BudgetRow) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

function useEditor(): EditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("Budget edit buttons must be inside <BudgetEditorProvider>");
  }
  return context;
}

export function BudgetEditorProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [editing, setEditing] = useState<BudgetRow | null>(null);
  const [isOpen, setOpen] = useState(false);

  const open = useCallback((budget: BudgetRow) => {
    setEditing(budget);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open }), [open]);

  return (
    <EditorContext.Provider value={api}>
      {children}
      {/* Mounted only while open, so the form starts clean on every row. */}
      {isOpen && editing ? (
        <EditSheet budget={editing} onClose={close} />
      ) : null}
    </EditorContext.Provider>
  );
}

function EditSheet({
  budget,
  onClose,
}: {
  readonly budget: BudgetRow;
  readonly onClose: () => void;
}) {
  const { showToast } = useAppChrome();
  const formId = useId();
  const { draft } = budget;
  const save = useBudgetSave(draft.id, onClose);
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, startRemoving] = useTransition();

  const isBusy = save.isSaving || isRemoving;

  /** The sheet stays open until the delete answers, or it unmounts mid-flight. */
  function remove(): void {
    if (!window.confirm(`Remove the ${draft.label} budget?`)) {
      return;
    }

    startRemoving(async () => {
      const error = await deleteBudgetAction(draft.category);
      if (error) {
        setRemoveError(error);
        return;
      }
      showToast(`${draft.label} budget removed`);
      onClose();
    });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title="Edit budget"
      subtitle={`${budget.label} · ${budget.spent} of ${budget.limit}`}
      footer={
        <>
          <button
            type="submit"
            form={formId}
            disabled={isBusy}
            className="btn btn-primary flex-1"
          >
            {save.isSaving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            className="btn btn-ghost text-expense ml-auto"
            onClick={remove}
          >
            {isRemoving ? "Removing…" : "Remove budget"}
          </button>
        </>
      }
    >
      <BudgetFields
        formId={formId}
        formAction={save.formAction}
        fieldErrors={save.fieldErrors}
        bannerError={removeError || save.error}
        draft={draft}
        categories={[]}
      />
    </SlideOver>
  );
}

export function BudgetEditButton({ budget }: { readonly budget: BudgetRow }) {
  const { open } = useEditor();

  return (
    <button
      type="button"
      className="btn btn-secondary btn-icon"
      aria-label={`Edit ${budget.label} budget`}
      onClick={() => open(budget)}
    >
      <Icon name="gear" size={15} />
    </button>
  );
}

/* ── the panel on the page ─────────────────────────────────────────────── */

/** The "New budget" panel: the same fields, with its button under them. */
export function NewBudgetForm({
  draft,
  categories,
}: {
  readonly draft: BudgetDraft;
  readonly categories: readonly BudgetCategoryChoice[];
}) {
  const formId = useId();
  const save = useBudgetSave(draft.id);

  return (
    <>
      <BudgetFields
        formId={formId}
        formAction={save.formAction}
        fieldErrors={save.fieldErrors}
        bannerError={save.error}
        draft={draft}
        categories={categories}
      />
      <button
        type="submit"
        form={formId}
        disabled={save.isSaving}
        className="btn btn-primary btn-block mt-4"
      >
        {save.isSaving ? "Saving…" : "Create budget"}
      </button>
    </>
  );
}

/* ── the fields ────────────────────────────────────────────────────────── */

function BudgetFields({
  formId,
  formAction,
  fieldErrors,
  bannerError,
  draft,
  categories,
}: {
  readonly formId: string;
  readonly formAction: (formData: FormData) => void;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly bannerError: string;
  readonly draft: BudgetDraft;
  /** The categories still free. Empty when editing — a budget cannot move. */
  readonly categories: readonly BudgetCategoryChoice[];
}) {
  const isEdit = draft.id !== "";

  const [category, setCategory] = useState<CategoryKey>(draft.category);
  const [limit, setLimit] = useState(draft.limit);
  const [icon, setIcon] = useState<IconName>(draft.icon);
  const [isIconChosen, setIconChosen] = useState(false);

  /** Until a tile is picked, a new budget's icon follows the category select. */
  function chooseCategory(next: string): void {
    if (!isSpendCategory(next)) {
      return;
    }
    setCategory(next);
    if (!isIconChosen) {
      setIcon(ICON_BY_CATEGORY[next]);
    }
  }

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name={BUDGET_FIELD.id} value={draft.id} readOnly />
      {/* Untouched posts "" — the column's own way of saying "no icon of its own". */}
      <input
        type="hidden"
        name={BUDGET_FIELD.icon}
        value={isIconChosen ? icon : ""}
        readOnly
      />

      {bannerError ? (
        <p className="text-expense text-note" role="alert">
          {bannerError}
        </p>
      ) : null}

      <CategoryField
        formId={formId}
        draft={draft}
        categories={categories}
        isEdit={isEdit}
        value={category}
        onChange={chooseCategory}
        error={fieldErrors[BUDGET_FIELD.category]}
      />

      <LimitField
        formId={formId}
        value={limit}
        onChange={setLimit}
        error={fieldErrors[BUDGET_FIELD.limit]}
      />

      <ThresholdField
        defaultThreshold={draft.threshold}
        defaultIsCustom={draft.isCustomThreshold}
        limitText={limit}
        error={
          fieldErrors[BUDGET_FIELD.thresholdCustom] ??
          fieldErrors[BUDGET_FIELD.threshold]
        }
      />

      <IconChoiceField
        id={`${formId}-icon`}
        label="Icon"
        name={`${formId}-icon-choice`}
        choices={budgetIconChoices(icon)}
        value={icon}
        onChange={(next) => {
          setIcon(next);
          setIconChosen(true);
        }}
        note="Shown on the budget row and beside its alert."
      />

      <ToggleRow
        id={`${formId}-rollover`}
        name={BUDGET_FIELD.rollover}
        label="Roll unspent amount forward"
        defaultChecked={draft.rollover}
      />
    </form>
  );
}

/** A budget is the pairing of a category with a limit, so it cannot move. */
function CategoryField({
  formId,
  draft,
  categories,
  isEdit,
  value,
  onChange,
  error,
}: {
  readonly formId: string;
  readonly draft: BudgetDraft;
  readonly categories: readonly BudgetCategoryChoice[];
  readonly isEdit: boolean;
  readonly value: CategoryKey;
  readonly onChange: (next: string) => void;
  readonly error?: string;
}) {
  if (isEdit) {
    return (
      <>
        <input
          type="hidden"
          name={BUDGET_FIELD.category}
          value={draft.category}
          readOnly
        />
        <p className="text-meta text-muted">
          Measured against every {draft.label} transaction this cycle.
        </p>
      </>
    );
  }

  return (
    <SelectField
      id={`${formId}-category`}
      name={BUDGET_FIELD.category}
      label="Category"
      options={categories.map((choice) => ({
        value: choice.value,
        label: choice.label,
      }))}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

/** The `Rp` prefix pattern the artboard's own limit field already used. */
function LimitField({
  formId,
  value,
  onChange,
  error,
}: {
  readonly formId: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly error?: string;
}) {
  const id = `${formId}-limit`;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>Monthly limit</label>
      <div
        className={cx(
          "inset flex min-h-[38px] items-center gap-2 px-2.5",
          error && "border-expense",
        )}
      >
        <span className="text-muted text-[13px]">Rp</span>
        <input
          id={id}
          name={BUDGET_FIELD.limit}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="1.500.000"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="text-text min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-expense text-meta mt-1.5">
          {error}
        </p>
      ) : null}
    </div>
  );
}
