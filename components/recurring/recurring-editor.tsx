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

import { useAppChrome } from "@/components/shell/app-chrome";
import { Field, SelectField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import type {
  CategoryChoice,
  RecurringDraft,
  RecurringRow,
  WalletChoice,
} from "@/lib/data/recurring-list";
import {
  confirmRecurringAction,
  deleteRecurringAction,
  saveRecurringAction,
} from "@/lib/recurring/actions";
import {
  FREQUENCY_OPTIONS,
  RECURRING_FIELD,
  RECURRING_NAME_MAX_LENGTH,
  RECURRING_NOTE_MAX_LENGTH,
} from "@/lib/recurring-fields";
import { maskFigure } from "@/lib/format";
import { applyMask } from "@/lib/input-mask";
import { cx } from "@/lib/tone";
import type { CurrencyCode } from "@/types/ledger";

/**
 * The recurring editor: one field set behind the "New recurring item" panel and
 * every row's pencil, plus the sheet that confirms a payment by hand.
 */

const NO_ERRORS: Readonly<Record<string, string>> = {};

type FormAction = (
  previousState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

type SaveState = {
  readonly formAction: (formData: FormData) => void;
  readonly isSaving: boolean;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly error: string;
};

/** The echoed id keeps a rejection on one item from greeting the next one opened. */
function useRecurringAction(
  action: FormAction,
  draftId: string,
  onSaved?: () => void,
): SaveState {
  const { showToast } = useAppChrome();

  const [state, formAction, isSaving] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await action(previousState, formData);
      if (next.notice) {
        showToast(next.notice);
        onSaved?.();
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );

  const isCurrent = (state.values[RECURRING_FIELD.id] ?? "") === draftId;

  return {
    formAction,
    isSaving,
    fieldErrors: isCurrent ? state.fieldErrors : NO_ERRORS,
    error: isCurrent ? state.error : "",
  };
}

/* ── the sheets ────────────────────────────────────────────────────────── */

type Sheet = {
  readonly kind: "edit" | "confirm";
  readonly row: RecurringRow;
};

type Choices = {
  readonly wallets: readonly WalletChoice[];
  readonly categories: readonly CategoryChoice[];
};

type EditorApi = {
  readonly edit: (row: RecurringRow) => void;
  readonly confirm: (row: RecurringRow) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

function useEditor(): EditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error(
      "Recurring row buttons must be inside <RecurringEditorProvider>",
    );
  }
  return context;
}

export function RecurringEditorProvider({
  wallets,
  categories,
  today,
  children,
}: Choices & {
  readonly today: string;
  readonly children: ReactNode;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const close = useCallback(() => setSheet(null), []);
  const api = useMemo(
    () => ({
      edit: (row: RecurringRow) => setSheet({ kind: "edit", row }),
      confirm: (row: RecurringRow) => setSheet({ kind: "confirm", row }),
    }),
    [],
  );

  return (
    <EditorContext.Provider value={api}>
      {children}
      {sheet?.kind === "edit" ? (
        <EditSheet
          row={sheet.row}
          wallets={wallets}
          categories={categories}
          onClose={close}
        />
      ) : null}
      {sheet?.kind === "confirm" ? (
        <ConfirmSheet row={sheet.row} today={today} onClose={close} />
      ) : null}
    </EditorContext.Provider>
  );
}

function EditSheet({
  row,
  wallets,
  categories,
  onClose,
}: Choices & {
  readonly row: RecurringRow;
  readonly onClose: () => void;
}) {
  const { showToast } = useAppChrome();
  const formId = useId();
  const { draft } = row;
  const save = useRecurringAction(saveRecurringAction, draft.id, onClose);
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, startRemoving] = useTransition();

  const isBusy = save.isSaving || isRemoving;

  function remove(): void {
    if (!window.confirm(`Remove ${draft.name} from the schedule?`)) {
      return;
    }

    startRemoving(async () => {
      const error = await deleteRecurringAction(draft.id);
      if (error) {
        setRemoveError(error);
        return;
      }
      showToast(`${draft.name} removed`);
      onClose();
    });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      title="Edit recurring item"
      subtitle={`${row.name} · ${row.amount} · ${row.frequency}`}
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
            {isRemoving ? "Removing…" : "Remove item"}
          </button>
        </>
      }
    >
      <RecurringFields
        formId={formId}
        save={save}
        bannerError={removeError || save.error}
        draft={draft}
        wallets={wallets}
        categories={categories}
      />
    </SlideOver>
  );
}

/** Nothing is recorded until this sheet is submitted: the payment is confirmed by hand. */
function ConfirmSheet({
  row,
  today,
  onClose,
}: {
  readonly row: RecurringRow;
  readonly today: string;
  readonly onClose: () => void;
}) {
  const formId = useId();
  const { draft } = row;
  const save = useRecurringAction(confirmRecurringAction, draft.id, onClose);
  const [amount, setAmount] = useState(draft.amount);
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");

  return (
    <SlideOver
      open
      onClose={onClose}
      title="Record payment"
      subtitle={`${row.name} · ${row.dueLabel}`}
      footer={
        <>
          <button
            type="submit"
            form={formId}
            disabled={save.isSaving}
            className="btn btn-primary flex-1"
          >
            {save.isSaving ? "Recording…" : "Record payment"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <form
        id={formId}
        action={save.formAction}
        className="flex flex-col gap-3"
      >
        <input
          type="hidden"
          name={RECURRING_FIELD.id}
          value={draft.id}
          readOnly
        />
        <input
          type="hidden"
          name={RECURRING_FIELD.currency}
          value={draft.currency}
          readOnly
        />

        <Banner message={save.error} />

        <p className="text-meta text-muted">
          Saves an expense from {row.wallet} and moves the next due date on by
          one {row.frequency.toLowerCase()} step.
        </p>

        <AmountField
          id={`${formId}-amount`}
          currency={draft.currency}
          value={amount}
          onChange={setAmount}
          error={save.fieldErrors[RECURRING_FIELD.amount]}
        />

        <InputField
          id={`${formId}-paid-on`}
          name={RECURRING_FIELD.paidOn}
          label="Paid on"
          type="date"
          value={paidOn}
          onChange={setPaidOn}
          error={save.fieldErrors[RECURRING_FIELD.paidOn]}
        />

        <InputField
          id={`${formId}-note`}
          name={RECURRING_FIELD.note}
          label="Note (optional)"
          value={note}
          onChange={setNote}
          maxLength={RECURRING_NOTE_MAX_LENGTH}
          placeholder="Recurring payment"
          error={save.fieldErrors[RECURRING_FIELD.note]}
        />
      </form>
    </SlideOver>
  );
}

const ROW_BUTTON = "btn btn-icon size-[30px]";
const ROW_BUTTON_QUIET = "btn-secondary text-muted hover:text-text";

export function RecurringEditButton({ row }: { readonly row: RecurringRow }) {
  const { edit } = useEditor();

  return (
    <button
      type="button"
      className={cx(ROW_BUTTON, ROW_BUTTON_QUIET)}
      aria-label={`Edit ${row.name}`}
      onClick={() => edit(row)}
    >
      <Icon name="pencil" size={14} />
    </button>
  );
}

export function RecurringConfirmButton({ row }: { readonly row: RecurringRow }) {
  const { confirm } = useEditor();

  return (
    <button
      type="button"
      className={cx(
        ROW_BUTTON,
        row.needsAction ? "btn-primary" : ROW_BUTTON_QUIET,
      )}
      aria-label={`Record a payment for ${row.name}`}
      title="Record payment"
      onClick={() => confirm(row)}
    >
      <Icon name="check" size={14} />
    </button>
  );
}

/* ── the panel on the page ─────────────────────────────────────────────── */

export function NewRecurringForm({
  draft,
  wallets,
  categories,
}: Choices & { readonly draft: RecurringDraft }) {
  const formId = useId();
  const save = useRecurringAction(saveRecurringAction, draft.id);

  return (
    <>
      <RecurringFields
        formId={formId}
        save={save}
        bannerError={save.error}
        draft={draft}
        wallets={wallets}
        categories={categories}
      />
      <button
        type="submit"
        form={formId}
        disabled={save.isSaving}
        className="btn btn-primary btn-block mt-4"
      >
        {save.isSaving ? "Saving…" : "Schedule item"}
      </button>
    </>
  );
}

/* ── the fields ────────────────────────────────────────────────────────── */

function RecurringFields({
  formId,
  save,
  bannerError,
  draft,
  wallets,
  categories,
}: Choices & {
  readonly formId: string;
  readonly save: SaveState;
  readonly bannerError: string;
  readonly draft: RecurringDraft;
}) {
  const isEdit = draft.id !== "";
  const { fieldErrors } = save;

  // Controlled, so a rejected save keeps what was typed.
  const [name, setName] = useState(draft.name);
  const [amount, setAmount] = useState(draft.amount);
  const [frequency, setFrequency] = useState<string>(draft.frequency);
  const [nextDueDate, setNextDueDate] = useState(draft.nextDueDate);
  const [walletId, setWalletId] = useState(draft.walletId);
  const [categoryId, setCategoryId] = useState(draft.categoryId);

  const currency =
    wallets.find((wallet) => wallet.value === walletId)?.currency ??
    draft.currency;

  return (
    <form id={formId} action={save.formAction} className="flex flex-col gap-3">
      <input type="hidden" name={RECURRING_FIELD.id} value={draft.id} readOnly />
      <input
        type="hidden"
        name={RECURRING_FIELD.currency}
        value={currency}
        readOnly
      />

      <Banner message={bannerError} />

      <InputField
        id={`${formId}-name`}
        name={RECURRING_FIELD.name}
        label="Name"
        value={name}
        onChange={setName}
        maxLength={RECURRING_NAME_MAX_LENGTH}
        placeholder="Internet bill"
        required
        error={fieldErrors[RECURRING_FIELD.name]}
      />

      <SelectField
        id={`${formId}-wallet`}
        name={RECURRING_FIELD.wallet}
        label="Paid from"
        options={wallets}
        value={walletId}
        onChange={setWalletId}
        error={fieldErrors[RECURRING_FIELD.wallet]}
      />

      <AmountField
        id={`${formId}-amount`}
        currency={currency}
        value={amount}
        onChange={setAmount}
        error={fieldErrors[RECURRING_FIELD.amount]}
      />

      <SelectField
        id={`${formId}-category`}
        name={RECURRING_FIELD.category}
        label="Category"
        options={categories}
        value={categoryId}
        onChange={setCategoryId}
        error={fieldErrors[RECURRING_FIELD.category]}
      />

      <SelectField
        id={`${formId}-frequency`}
        name={RECURRING_FIELD.frequency}
        label="Frequency"
        options={FREQUENCY_OPTIONS}
        value={frequency}
        onChange={setFrequency}
        error={fieldErrors[RECURRING_FIELD.frequency]}
      />

      <InputField
        id={`${formId}-due`}
        name={RECURRING_FIELD.nextDueDate}
        label="Next due"
        type="date"
        value={nextDueDate}
        onChange={setNextDueDate}
        required
        error={fieldErrors[RECURRING_FIELD.nextDueDate]}
      />

      {isEdit ? (
        <ToggleRow
          id={`${formId}-paused`}
          name={RECURRING_FIELD.isPaused}
          label="Paused"
          defaultChecked={draft.isPaused}
        />
      ) : null}
    </form>
  );
}

function Banner({ message }: { readonly message: string }) {
  return message ? (
    <p className="text-expense text-note" role="alert">
      {message}
    </p>
  ) : null;
}

function InputField({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  required = false,
  error,
}: {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly type?: "text" | "date";
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly required?: boolean;
  readonly error?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        className={cx("input", error && "input-invalid")}
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

/** The amount, prefixed with the currency of the wallet it is paid from. */
function AmountField({
  id,
  currency,
  value,
  onChange,
  error,
}: {
  readonly id: string;
  readonly currency: CurrencyCode;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly error?: string;
}) {
  return (
    <Field id={id} label="Amount" error={error}>
      <div
        className={cx(
          "inset flex min-h-[38px] items-center gap-2 px-2.5",
          error && "border-expense",
        )}
      >
        <span className="text-muted text-[13px]">{currency}</span>
        <input
          id={id}
          name={RECURRING_FIELD.amount}
          value={value}
          onChange={(event) =>
            onChange(
              applyMask(event.target, (text) => maskFigure(text, currency)),
            )
          }
          inputMode="numeric"
          autoComplete="off"
          placeholder="150.000"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="text-text min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
        />
      </div>
    </Field>
  );
}
