"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { FormBanner } from "@/components/auth/form-feedback";
import { Icon } from "@/components/ui/icon";
import { TableScroll } from "@/components/ui/layout";
import { Panel } from "@/components/ui/panel";
import { saveRoleAction } from "@/lib/access/actions";
import {
  ACCESS_FIELD,
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_NAME_MAX_LENGTH,
  ROLE_NAME_MIN_LENGTH,
  grantValue,
} from "@/lib/access/fields";
import type { PermissionModule } from "@/lib/access/menus";
import { IDLE_AUTH_STATE } from "@/lib/auth/form-state";
import type { GrantMap } from "@/lib/data/access";
import { cx } from "@/lib/tone";
import {
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "@/types/access";

/**
 * The role editor.
 *
 * It is a client component because the matrix is live: granting create implies
 * read, revoking read clears the row, and the summary line keeps up. What it
 * posts is a plain form to a Server Action — every ticked cell rides along as
 * one hidden `grant` value of `<menu id>:<action>`, so the backend receives the
 * permission rows it stores and no JSON is parsed anywhere.
 *
 * The rows are the menus table, keyed by menu id. The module list, the grants
 * a role already holds and its member count all arrive as props from the
 * server.
 */

type Grants = Record<string, Partial<Record<PermissionAction, boolean>>>;

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_78px_66px_66px_66px_66px_76px] items-center gap-2";

const NEW_ROLE_IMPACT =
  "Read is granted automatically whenever you allow create, update or delete on a module.";

function toGrants(initial: GrantMap): Grants {
  const grants: Grants = {};
  for (const [menuId, row] of Object.entries(initial)) {
    grants[menuId] = { ...row };
  }
  return grants;
}

function saveLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return "Saving…";
  }
  return isEdit ? "Save role" : "Create role";
}

export function RoleForm({
  roleId,
  modules,
  initialName,
  initialDescription,
  initialGrants,
  memberCount,
  isSystem,
}: {
  /** Null on the new-role screen; the role's UUID when editing one. */
  readonly roleId: string | null;
  readonly modules: readonly PermissionModule[];
  readonly initialName: string;
  readonly initialDescription: string;
  readonly initialGrants: GrantMap;
  readonly memberCount: number;
  /** A built-in role: the backend refuses to rename it. */
  readonly isSystem: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    saveRoleAction,
    IDLE_AUTH_STATE,
  );
  const [grants, setGrants] = useState<Grants>(() => toGrants(initialGrants));
  const formId = useId();

  const isEdit = roleId !== null;

  /** Read underpins every other action, so the two move together. */
  function toggleCell(menuId: string, action: PermissionAction) {
    setGrants((previous) => {
      const row = { ...(previous[menuId] ?? {}) };
      row[action] = !row[action];

      if (action !== "read" && row[action]) {
        row.read = true;
      }

      if (action === "read" && !row.read) {
        for (const other of PERMISSION_ACTIONS) {
          if (other !== "read") {
            row[other] = false;
          }
        }
      }

      return { ...previous, [menuId]: row };
    });
  }

  function toggleRow(entry: PermissionModule) {
    setGrants((previous) => {
      const current = previous[entry.id] ?? {};
      const allOn = PERMISSION_ACTIONS.every((action) => current[action]);
      const row: Partial<Record<PermissionAction, boolean>> = {};
      for (const action of PERMISSION_ACTIONS) {
        row[action] = !allOn;
      }
      return { ...previous, [entry.id]: row };
    });
  }

  function setAll(on: boolean) {
    const next: Grants = {};
    for (const entry of modules) {
      const row: Partial<Record<PermissionAction, boolean>> = {};
      for (const action of PERMISSION_ACTIONS) {
        row[action] = on;
      }
      next[entry.id] = row;
    }
    setGrants(next);
  }

  const granted = Object.values(grants).reduce(
    (total, row) => total + Object.values(row).filter(Boolean).length,
    0,
  );
  const touched = Object.values(grants).filter((row) =>
    Object.values(row).some(Boolean),
  ).length;

  const impact = isEdit
    ? `${memberCount} member(s) hold this role — saving changes their access immediately.`
    : NEW_ROLE_IMPACT;

  return (
    <form
      id={formId}
      action={formAction}
      className="animate-fade mx-auto flex w-full max-w-[var(--screen-max)] flex-col gap-6"
    >
      <input type="hidden" name={ACCESS_FIELD.id} value={roleId ?? ""} />

      {/* Every ticked cell, as the backend's permission rows. Rendered from
          state so the form carries exactly what the grid shows. */}
      {modules.map((entry) =>
        PERMISSION_ACTIONS.filter((action) => grants[entry.id]?.[action])
          .map((action) => (
            <input
              key={`${entry.id}-${action}`}
              type="hidden"
              name={ACCESS_FIELD.grant}
              value={grantValue(entry.id, action)}
            />
          )),
      )}

      <nav className="text-muted flex items-center gap-2 text-note">
        <Link href="/roles" className="btn btn-ghost text-note">
          Role management
        </Link>
        <span>/</span>
        <span className="text-text">{isEdit ? "Edit role" : "Add new role"}</span>
      </nav>

      {state.error ? <FormBanner tone="error" message={state.error} /> : null}

      <Panel className="flex flex-col gap-3 p-6">
        <div className="field">
          <label htmlFor="role-name">Role name</label>
          <input
            id="role-name"
            name={ACCESS_FIELD.name}
            className={cx(
              "input",
              state.fieldErrors[ACCESS_FIELD.name] && "input-invalid",
            )}
            placeholder="Input role name"
            required
            minLength={ROLE_NAME_MIN_LENGTH}
            maxLength={ROLE_NAME_MAX_LENGTH}
            defaultValue={state.values[ACCESS_FIELD.name] ?? initialName}
            // Disabled, not read-only: a disabled input posts nothing, and the
            // backend refuses a built-in role that carries a name at all.
            disabled={isSystem}
          />
          {state.fieldErrors[ACCESS_FIELD.name] ? (
            <p className="text-expense text-meta mt-1.5">
              {state.fieldErrors[ACCESS_FIELD.name]}
            </p>
          ) : null}
          {isSystem ? (
            <p className="text-meta text-muted mt-1.5">
              Built-in roles keep their name; their permissions can still change.
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="role-description">Description</label>
          <textarea
            id="role-description"
            name={ACCESS_FIELD.description}
            className="input"
            rows={3}
            maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
            placeholder="Input description"
            defaultValue={
              state.values[ACCESS_FIELD.description] ?? initialDescription
            }
          />
        </div>
      </Panel>

      <Panel>
        <div className="panel-head flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="panel-title">Menu permissions</h2>
            <p className="text-meta text-muted mt-0.5">
              {granted} granted across {touched} of {modules.length} modules
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary text-note"
            onClick={() => setAll(true)}
          >
            Select all menus
          </button>
          <button
            type="button"
            className="btn btn-ghost text-note"
            onClick={() => setAll(false)}
          >
            Clear
          </button>
        </div>

        <TableScroll minWidth={760}>
          <div className={cx("column-head-access", ROW_GRID)}>
            <span>Menu name</span>
            <span className="text-center">Select all</span>
            {PERMISSION_ACTIONS.map((action) => (
              <span key={action} className="text-center capitalize">
                {action}
              </span>
            ))}
          </div>

          {modules.map((entry) => {
            const row = grants[entry.id] ?? {};
            const allOn = PERMISSION_ACTIONS.every((action) => row[action]);

            return (
              <div
                key={entry.id}
                className={cx(
                  "border-divider border-b px-6 py-[11px]",
                  ROW_GRID,
                )}
              >
                <div className="flex min-w-0 items-center gap-[11px]">
                  <Icon name={entry.icon} size={15} className="text-muted" />
                  <span className="truncate text-[13px]">{entry.label}</span>
                </div>

                <PermissionCheckbox
                  checked={allOn}
                  label={`${allOn ? "Clear" : "Select"} all on ${entry.label}`}
                  onToggle={() => toggleRow(entry)}
                />

                {/* Every menu offers every action. The table stores all five
                    flags on every row, so the grid hides none of them — the
                    artboard's em dashes described a narrower model than the
                    one the backend actually has. */}
                {PERMISSION_ACTIONS.map((action) => (
                  <PermissionCheckbox
                    key={action}
                    checked={Boolean(row[action])}
                    label={`${action} ${entry.label}`}
                    onToggle={() => toggleCell(entry.id, action)}
                  />
                ))}
              </div>
            );
          })}
        </TableScroll>

        <p className="text-muted flex items-start gap-2.5 px-6 py-4 text-note">
          <Icon name="shield" size={15} className="mt-0.5" />
          {impact}
        </p>
      </Panel>

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {saveLabel(isEdit, isPending)}
        </button>
        <Link href="/roles" className="btn btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function PermissionCheckbox({
  checked,
  label,
  onToggle,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className="perm-cell"
      onClick={onToggle}
    >
      {checked ? <Icon name="check" size={12} /> : null}
    </button>
  );
}
