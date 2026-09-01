"use client";

import { deleteRoleAction } from "@/lib/access/actions";
import { ACCESS_FIELD } from "@/lib/access/fields";
import { Icon } from "@/components/ui/icon";

/**
 * Deleting a role is a form posting to a Server Action, not a handler — the
 * row goes on the server and the list revalidates itself.
 *
 * The only thing the client adds is the confirm: a role with members attached
 * is refused by the backend, but one without them goes quietly, and that is
 * worth a question first.
 */
export function RemoveRoleButton({
  id,
  name,
}: {
  readonly id: string;
  readonly name: string;
}) {
  return (
    <form
      action={deleteRoleAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the ${name} role?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name={ACCESS_FIELD.id} value={id} />
      <button
        type="submit"
        className="btn btn-ghost"
        aria-label={`Delete ${name}`}
      >
        <Icon name="x" size={14} />
      </button>
    </form>
  );
}
