"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppChrome } from "@/components/shell/app-chrome";
import { FormBanner } from "@/components/auth/form-feedback";
import { Field, TextField } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SlideOver } from "@/components/ui/slide-over";
import { ACCESS_FIELD } from "@/lib/access/fields";
import { deleteUserAction, saveUserAction } from "@/lib/access/actions";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/lib/auth/form-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/fields";
import type { RoleOption, UserRow } from "@/lib/data/access";

/** The user editor: one slide-over shared by the toolbar's "Add new user" and every. */

type EditorApi = {
  readonly open: (user: UserRow | null) => void;
};

const EditorContext = createContext<EditorApi | null>(null);

/** Unwound rather than nested, so the pending state reads at a glance. */
function saveLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return "Saving…";
  }
  return isEdit ? "Save changes" : "Create user";
}

function useEditor(): EditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("User editor buttons must be inside <UserEditorProvider>");
  }
  return context;
}

export function UserEditorProvider({
  children,
  roles,
}: {
  readonly children: ReactNode;
  readonly roles: readonly RoleOption[];
}) {
  const { showToast } = useAppChrome();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [isOpen, setOpen] = useState(false);
  // The action is wrapped rather than watched from an effect.
  const [state, formAction, isPending] = useActionState(
    async (previousState: AuthFormState, formData: FormData) => {
      const next = await saveUserAction(previousState, formData);
      if (next.notice) {
        setOpen(false);
        showToast(next.notice);
      }
      return next;
    },
    IDLE_AUTH_STATE,
  );
  const formId = useId();

  const open = useCallback((user: UserRow | null) => {
    setEditing(user);
    setOpen(true);
  }, []);

  const api = useMemo(() => ({ open }), [open]);

  const close = useCallback(() => setOpen(false), []);

  const isEdit = editing !== null;
  const selectedRole = editing?.roleId ?? roles[0]?.id ?? "";

  return (
    <EditorContext.Provider value={api}>
      {children}

      <SlideOver
        open={isOpen}
        onClose={close}
        title={isEdit ? "Edit user" : "Add new user"}
        subtitle={
          isEdit
            ? "Changes apply at the next sign-in"
            : "They can sign in as soon as this is saved"
        }
        footer={
          <>
            <button
              type="submit"
              form={formId}
              disabled={isPending}
              className="btn btn-primary flex-1"
            >
              {saveLabel(isEdit, isPending)}
            </button>
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
          </>
        }
      >
        {/* `key` remounts the fields when the row changes. */}
        <form
          id={formId}
          key={editing?.id ?? "new"}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {state.error ? (
            <FormBanner tone="error" message={state.error} />
          ) : null}

          <input
            type="hidden"
            name={ACCESS_FIELD.id}
            value={editing?.id ?? ""}
          />

          <TextField
            id="user-name"
            name={ACCESS_FIELD.fullName}
            label="Full name"
            required
            defaultValue={editing?.name ?? ""}
            error={state.fieldErrors[ACCESS_FIELD.fullName]}
          />

          <TextField
            id="user-email"
            name={ACCESS_FIELD.email}
            label="Email"
            type="email"
            required={!isEdit}
            defaultValue={editing?.email ?? ""}
            autoComplete="email"
            error={state.fieldErrors[ACCESS_FIELD.email]}
            inputClassName={isEdit ? "opacity-60" : undefined}
          />
          {isEdit ? (
            <p className="text-meta text-muted -mt-2.5">
              The email is the sign-in name and cannot be changed here.
            </p>
          ) : null}

          {isEdit ? null : (
            <TextField
              id="user-password"
              name={ACCESS_FIELD.password}
              label="Temporary password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              error={state.fieldErrors[ACCESS_FIELD.password]}
            />
          )}

          <RoleField
            roles={roles}
            defaultValue={selectedRole}
            error={state.fieldErrors[ACCESS_FIELD.roleId]}
          />
        </form>
      </SlideOver>
    </EditorContext.Provider>
  );
}

/** The role select plus a line about the role chosen. */
function RoleField({
  roles,
  defaultValue,
  error,
}: {
  readonly roles: readonly RoleOption[];
  readonly defaultValue: string;
  readonly error?: string;
}) {
  const [roleId, setRoleId] = useState(defaultValue);
  const selected = roles.find((role) => role.id === roleId);

  return (
    <>
      <Field id="user-role" label="Role" error={error}>
        <select
          id="user-role"
          name={ACCESS_FIELD.roleId}
          className="input"
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>

      {/* The artboard tags each menu the role grants. */}
      <div className="inset p-3.5">
        <p className="panel-kicker">
          Inherited from {selected?.name ?? "this role"}
        </p>
        <p className="text-row mt-2">
          {selected?.description || "This role has no description yet."}
        </p>
        <p className="text-meta text-muted mt-2.5">
          Change permissions on the role itself.
        </p>
      </div>
    </>
  );
}

export function NewUserButton() {
  const { open } = useEditor();

  return (
    <button
      type="button"
      className="btn btn-primary h-[38px]"
      onClick={() => open(null)}
    >
      <Icon name="plus" size={15} />
      Add new user
    </button>
  );
}

export function EditUserButton({ user }: { readonly user: UserRow }) {
  const { open } = useEditor();

  return (
    <button
      type="button"
      className="btn btn-secondary text-note"
      onClick={() => open(user)}
    >
      Edit
    </button>
  );
}

/** Removal is a form, not a handler. */
export function RemoveUserButton({ user }: { readonly user: UserRow }) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${user.name} from the workspace?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name={ACCESS_FIELD.id} value={user.id} />
      <button
        type="submit"
        className="btn btn-ghost"
        aria-label={`Remove ${user.name}`}
      >
        <Icon name="x" size={14} />
      </button>
    </form>
  );
}
