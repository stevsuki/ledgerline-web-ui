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
  IconChoiceField,
  SelectField,
  TextField,
  ToggleRow,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-sprite";
import { FieldGrid } from "@/components/ui/layout";
import { SlideOver } from "@/components/ui/slide-over";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { deleteWalletAction, saveWalletAction } from "@/lib/wallets/actions";
import {
  CARD_KIND,
  CASH_META,
  ICON_BY_KIND,
  REFERENCE_HINT,
  REFERENCE_MAX_LENGTH,
  REFERENCE_NOTE,
  WALLET_FIELD,
  WALLET_NAME_MAX_LENGTH,
  WALLET_NAME_MIN_LENGTH,
  parseWalletKind,
  walletIconChoices,
} from "@/lib/wallet-fields";
import type {
  SelectChoice,
  WalletCard,
  WalletDraft,
  WalletKind,
} from "@/types/ledger";

/**
 * The wallet editor: one slide-over behind both the dashed "Add wallet" card and
 * every card's pencil. Nothing syncs with a bank, so this sheet is the only way
 * a balance, a limit or a statement day ever changes — which is why it opens
 * saying how old the figure on the card is.
 *
 * Add and edit are one form on purpose. Split in two they drift: the inline
 * panel this replaced could not set a reference or a credit limit, so a credit
 * card could not be created whole.
 *
 * It posts to `saveWalletAction`, so every field name here is the backend's own
 * json tag and a validation error comes back sitting on the field that caused
 * it.
 */

type EditorApi = {
  /** `null` opens the sheet blank, for a wallet that does not exist yet. */
  readonly open: (wallet: WalletCard | null) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

const ADD_TITLE = "Add wallet";

const NEGATIVE_NOTE = "Money owed on a card is written as a negative.";

/** A wallet that does not exist yet: rupiah, counted in, nothing else filled in. */
const BLANK_DRAFT: WalletDraft = {
  id: "new",
  name: "",
  kind: "bank",
  icon: ICON_BY_KIND.bank,
  currency: "IDR",
  reference: "",
  // Prefilled rather than blank: the field is required, and a new wallet that
  // holds nothing is the ordinary case, not one worth making someone type.
  balance: "0",
  creditLimit: "",
  dueDay: "",
  includeInTotal: true,
  updatedSince: "",
};

/** Nothing to correct — a sheet that has not been rejected shows this. */
const NO_ERRORS: Readonly<Record<string, string>> = {};

/** What the sheet posts as its `id`: blank for a wallet that does not exist yet. */
function walletId(draft: WalletDraft, isEdit: boolean): string {
  return isEdit ? draft.id : "";
}

function useEditor(): EditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("Wallet edit buttons must be inside <WalletEditorProvider>");
  }
  return context;
}

/** Unwound rather than nested, so each state reads at a glance. */
function sheetSubtitle(draft: WalletDraft, isEdit: boolean): string {
  if (!isEdit) {
    return "Balances are entered by hand — nothing will refresh this one for you.";
  }
  return `Last updated ${draft.updatedSince}`;
}

function balanceNote(draft: WalletDraft, isEdit: boolean): string {
  if (!isEdit) {
    return `${NEGATIVE_NOTE} The figure you type is where this wallet starts.`;
  }
  return `${NEGATIVE_NOTE} Saving stamps today, so the card stops reading ${draft.updatedSince}.`;
}

function saveLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return "Saving…";
  }
  return isEdit ? "Save changes" : ADD_TITLE;
}

export function WalletEditorProvider({
  children,
  kinds,
  currencies,
}: {
  readonly children: ReactNode;
  readonly kinds: readonly SelectChoice[];
  readonly currencies: readonly SelectChoice[];
}) {
  const { showToast } = useAppChrome();
  const [editing, setEditing] = useState<WalletCard | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, startRemoving] = useTransition();
  const formId = useId();

  // The action is wrapped rather than watched from an effect.
  const [state, formAction, isSaving] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await saveWalletAction(previousState, formData);
      if (next.notice) {
        setOpen(false);
        showToast(next.notice);
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );

  const open = useCallback((wallet: WalletCard | null) => {
    setRemoveError("");
    setEditing(wallet);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open }), [open]);

  const isEdit = editing !== null;
  const draft = editing?.draft ?? BLANK_DRAFT;
  const isBusy = isSaving || isRemoving;

  // One action serves every card, so its state outlives the sheet that failed.
  // A rejected save on one wallet must not greet the next one opened, which is
  // what the id echoed back in `values` settles.
  const isCurrent = (state.values[WALLET_FIELD.id] ?? "") === walletId(draft, isEdit);
  const fieldErrors = isCurrent ? state.fieldErrors : NO_ERRORS;

  /**
   * The sheet stays open until the delete answers: closing first would unmount
   * the transition that is still carrying it.
   */
  function remove() {
    if (!editing || !window.confirm(`Remove ${editing.name} from this workspace?`)) {
      return;
    }

    const { id, name } = editing;
    startRemoving(async () => {
      const error = await deleteWalletAction(id);
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
        title={isEdit ? "Edit wallet" : ADD_TITLE}
        subtitle={sheetSubtitle(draft, isEdit)}
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
            {isEdit ? (
              <button
                type="button"
                disabled={isBusy}
                className="btn btn-ghost text-expense ml-auto"
                onClick={remove}
              >
                {isRemoving ? "Removing…" : "Remove wallet"}
              </button>
            ) : null}
          </>
        }
      >
        {/* Keyed on the wallet so the fields and the kind reset per card. */}
        <WalletFields
          key={draft.id}
          formId={formId}
          formAction={formAction}
          fieldErrors={fieldErrors}
          bannerError={removeError || (isCurrent ? state.error : "")}
          draft={draft}
          isEdit={isEdit}
          kinds={kinds}
          currencies={currencies}
        />
      </SlideOver>
    </EditorContext.Provider>
  );
}

function WalletFields({
  formId,
  formAction,
  fieldErrors,
  bannerError,
  draft,
  isEdit,
  kinds,
  currencies,
}: {
  readonly formId: string;
  readonly formAction: (formData: FormData) => void;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly bannerError: string;
  readonly draft: WalletDraft;
  readonly isEdit: boolean;
  readonly kinds: readonly SelectChoice[];
  readonly currencies: readonly SelectChoice[];
}) {
  const [kind, setKind] = useState<WalletKind>(draft.kind);
  const [icon, setIcon] = useState<IconName>(draft.icon);
  // An existing wallet already wears a decision; a new one is still following
  // the Type select, and stops the moment someone picks a tile themselves.
  const [iconPicked, setIconPicked] = useState(isEdit);

  function changeKind(next: string) {
    const parsed = parseWalletKind(next);
    setKind(parsed);
    if (!iconPicked) {
      setIcon(ICON_BY_KIND[parsed]);
    }
  }

  function chooseIcon(next: IconName) {
    setIcon(next);
    setIconPicked(true);
  }

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-4">
      {bannerError ? <FormBanner tone="error" message={bannerError} /> : null}

      <input
        type="hidden"
        name={WALLET_FIELD.id}
        value={walletId(draft, isEdit)}
      />

      <TextField
        id="wallet-name"
        name={WALLET_FIELD.name}
        label="Wallet name"
        defaultValue={draft.name}
        placeholder="Jenius savings"
        minLength={WALLET_NAME_MIN_LENGTH}
        maxLength={WALLET_NAME_MAX_LENGTH}
        error={fieldErrors[WALLET_FIELD.name]}
        required
      />

      <FieldGrid>
        <SelectField
          id="wallet-kind"
          name={WALLET_FIELD.kind}
          label="Type"
          options={kinds}
          value={kind}
          onChange={changeKind}
        />
        <SelectField
          id="wallet-currency"
          name={WALLET_FIELD.currency}
          label="Currency"
          options={currencies}
          defaultValue={draft.currency}
        />
      </FieldGrid>

      <IconChoiceField
        id="wallet-icon"
        name={WALLET_FIELD.icon}
        label="Icon"
        note="Drawn on the wallet card, and beside it in the transaction list."
        choices={walletIconChoices(icon)}
        value={icon}
        onChange={chooseIcon}
      />

      <ReferenceField
        kind={kind}
        defaultValue={draft.reference}
        error={fieldErrors[WALLET_FIELD.reference]}
      />

      <div>
        <TextField
          id="wallet-balance"
          name={WALLET_FIELD.balance}
          label={isEdit ? "Current balance" : "Opening balance"}
          defaultValue={draft.balance}
          placeholder="0"
          inputMode="numeric"
          error={fieldErrors[WALLET_FIELD.balance]}
          required
        />
        <p className="text-meta text-muted mt-1.5">
          {balanceNote(draft, isEdit)}
        </p>
      </div>

      {kind === CARD_KIND ? (
        <CardFields draft={draft} fieldErrors={fieldErrors} />
      ) : null}

      <ToggleRow
        id="wallet-in-total"
        name={WALLET_FIELD.includeInTotal}
        label="Include in total balance"
        defaultChecked={draft.includeInTotal}
      />
    </form>
  );
}

/**
 * The one field whose meaning follows the type: an account number, a registered
 * phone, a card number — or, for cash, nothing at all. Cash is not a blank field
 * to leave empty; it has no reference to keep, and the card says so instead.
 */
function ReferenceField({
  kind,
  defaultValue,
  error,
}: {
  readonly kind: WalletKind;
  readonly defaultValue: string;
  readonly error?: string;
}) {
  const hint = REFERENCE_HINT[kind];

  if (!hint) {
    return (
      <div className="inset p-3.5">
        <p className="text-row">No reference to keep</p>
        <p className="text-meta text-muted mt-1.5">
          Cash has no account number behind it, so the card reads “{CASH_META}”
          under the name.
        </p>
      </div>
    );
  }

  return (
    <div>
      <TextField
        id="wallet-reference"
        name={WALLET_FIELD.reference}
        label={hint.label}
        defaultValue={defaultValue}
        placeholder={hint.placeholder}
        maxLength={REFERENCE_MAX_LENGTH}
        error={error}
      />
      <p className="text-meta text-muted mt-1.5">{REFERENCE_NOTE}</p>
    </div>
  );
}

/**
 * A card is drawn against a ceiling and falls due on a day; nothing else is.
 * Leaving either blank keeps whatever the card already has — the API reads an
 * absent figure as "unchanged", so this sheet cannot clear one.
 */
function CardFields({
  draft,
  fieldErrors,
}: {
  readonly draft: WalletDraft;
  readonly fieldErrors: Readonly<Record<string, string>>;
}) {
  return (
    <FieldGrid>
      <TextField
        id="wallet-limit"
        name={WALLET_FIELD.creditLimit}
        label="Credit limit"
        defaultValue={draft.creditLimit}
        placeholder="25.000.000"
        inputMode="numeric"
        error={fieldErrors[WALLET_FIELD.creditLimit]}
      />
      <TextField
        id="wallet-due"
        name={WALLET_FIELD.dueDay}
        label="Statement day"
        defaultValue={draft.dueDay}
        placeholder="18"
        inputMode="numeric"
        error={fieldErrors[WALLET_FIELD.dueDay]}
      />
    </FieldGrid>
  );
}

/** The last cell of the wallet grid: the artboard's dashed card, as a button. */
export function AddWalletCard() {
  const { open } = useEditor();

  return (
    <button
      type="button"
      onClick={() => open(null)}
      className="border-divider text-muted hover:border-accent hover:text-accent panel-pad flex min-h-[164px] w-full flex-col items-start justify-end gap-2.5 rounded-[var(--radius-panel)] border border-dashed text-left text-[13px] transition-colors"
    >
      <Icon name="plus" size={22} />
      {ADD_TITLE}
    </button>
  );
}

/** The pencil on a wallet card. Icon-only, so it carries the wallet's name. */
export function EditWalletButton({ wallet }: { readonly wallet: WalletCard }) {
  const { open } = useEditor();

  return (
    <button
      type="button"
      aria-label={`Edit ${wallet.name}`}
      className="btn btn-secondary btn-icon text-muted hover:text-text size-[30px]"
      onClick={() => open(wallet)}
    >
      <Icon name="pencil" size={14} />
    </button>
  );
}
