"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { useAppChrome } from "@/components/shell/app-chrome";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { FieldGrid } from "@/components/ui/layout";
import { SlideOver } from "@/components/ui/slide-over";
import type { SelectChoice, WalletCard, WalletDraft } from "@/types/ledger";

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
 * The wallets screen is still fixture-backed, so saving confirms and closes
 * rather than posting. When a mutation exists it replaces `onSubmit` with a
 * `<form action={saveWalletAction}>`, exactly as the user editor does.
 */

type EditorApi = {
  /** `null` opens the sheet blank, for a wallet that does not exist yet. */
  readonly open: (wallet: WalletCard | null) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

/** Cards are the only kind with a ceiling and a statement day to edit. */
const CARD_KIND = "card";

/** The name field, read back on submit so the toast says what was saved. */
const NAME_FIELD = "wallet-name";

const ADD_TITLE = "Add wallet";

const NEGATIVE_NOTE = "Money owed on a card is written as a negative.";

/** A wallet that does not exist yet: rupiah, counted in, nothing filled in. */
const BLANK_DRAFT: WalletDraft = {
  id: "new",
  name: "",
  kind: "bank",
  currency: "IDR",
  reference: "",
  balance: "",
  creditLimit: "",
  dueDay: "",
  includeInTotal: true,
  updatedSince: "",
};

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
  const formId = useId();

  const open = useCallback((wallet: WalletCard | null) => {
    setEditing(wallet);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open }), [open]);

  const isEdit = editing !== null;
  const draft = editing?.draft ?? BLANK_DRAFT;

  function save(name: string) {
    setOpen(false);
    showToast(`${name} ${isEdit ? "updated" : "added"}`);
  }

  function remove() {
    if (!editing) {
      return;
    }
    if (!window.confirm(`Remove ${editing.name} from this workspace?`)) {
      return;
    }
    setOpen(false);
    showToast(`${editing.name} removed`);
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
              className="btn btn-primary flex-1"
            >
              {isEdit ? "Save changes" : ADD_TITLE}
            </button>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            {isEdit ? (
              <button
                type="button"
                className="btn btn-ghost text-expense ml-auto"
                onClick={remove}
              >
                Remove wallet
              </button>
            ) : null}
          </>
        }
      >
        {/* Keyed on the wallet so the fields and the kind reset per card. */}
        <WalletFields
          key={draft.id}
          formId={formId}
          draft={draft}
          isEdit={isEdit}
          kinds={kinds}
          currencies={currencies}
          onSave={save}
        />
      </SlideOver>
    </EditorContext.Provider>
  );
}

/** What the toast falls back to if the browser lets an empty name through. */
const UNNAMED = "Wallet";

function typedName(form: HTMLFormElement): string {
  const value = new FormData(form).get(NAME_FIELD);
  if (typeof value !== "string" || value.trim() === "") {
    return UNNAMED;
  }
  return value.trim();
}

function WalletFields({
  formId,
  draft,
  isEdit,
  kinds,
  currencies,
  onSave,
}: {
  readonly formId: string;
  readonly draft: WalletDraft;
  readonly isEdit: boolean;
  readonly kinds: readonly SelectChoice[];
  readonly currencies: readonly SelectChoice[];
  readonly onSave: (name: string) => void;
}) {
  const [kind, setKind] = useState<string>(draft.kind);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(typedName(event.currentTarget));
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        id={NAME_FIELD}
        label="Wallet name"
        defaultValue={draft.name}
        placeholder="Jenius savings"
        required
      />

      <FieldGrid>
        <SelectField
          id="wallet-kind"
          label="Type"
          options={kinds}
          value={kind}
          onChange={setKind}
        />
        <SelectField
          id="wallet-currency"
          label="Currency"
          options={currencies}
          defaultValue={draft.currency}
        />
      </FieldGrid>

      <TextField
        id="wallet-reference"
        label="Account reference"
        defaultValue={draft.reference}
        placeholder="••4192"
      />

      <div>
        <TextField
          id="wallet-balance"
          label={isEdit ? "Current balance" : "Opening balance"}
          defaultValue={draft.balance}
          placeholder="0"
          inputMode="numeric"
        />
        <p className="text-meta text-muted mt-1.5">
          {balanceNote(draft, isEdit)}
        </p>
      </div>

      {kind === CARD_KIND ? <CardFields draft={draft} /> : null}

      <ToggleRow
        id="wallet-in-total"
        label="Include in total balance"
        defaultChecked={draft.includeInTotal}
      />
    </form>
  );
}

/** A card is drawn against a ceiling and falls due on a day; nothing else is. */
function CardFields({ draft }: { readonly draft: WalletDraft }) {
  return (
    <FieldGrid>
      <TextField
        id="wallet-limit"
        label="Credit limit"
        defaultValue={draft.creditLimit}
        placeholder="25.000.000"
        inputMode="numeric"
      />
      <TextField
        id="wallet-due"
        label="Statement day"
        defaultValue={draft.dueDay}
        placeholder="18"
        inputMode="numeric"
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
