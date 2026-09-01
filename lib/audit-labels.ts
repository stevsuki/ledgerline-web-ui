import type { AuditStatus } from "@/types/access";

/** What to call an audit action. */

const ACTION_LABELS: Readonly<Record<string, string>> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.register": "Registered",
  "auth.password_reset": "Reset password",
  "users.create": "Invited user",
  "users.update": "Updated user",
  "users.delete": "Removed user",
  "roles.create": "Created role",
  "roles.update": "Updated role permissions",
  "roles.delete": "Deleted role",
  "data_export.create": "Exported data",
};

/** Codes whose failed outcome has its own name rather than a "failed" prefix. */
const FAILED_ACTION_LABELS: Readonly<Record<string, string>> = {
  "auth.login": "Failed sign-in",
};

/** `wallets.connect_institution` → `Connect institution`. */
function humanise(action: string): string {
  const separator = action.lastIndexOf(".");
  const tail = separator === -1 ? action : action.slice(separator + 1);
  const words = tail.replaceAll("_", " ").trim();

  if (!words) {
    return action;
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function describeAction(action: string, status: AuditStatus): string {
  if (!action) {
    return "Unknown action";
  }

  if (status === "failed") {
    return FAILED_ACTION_LABELS[action] ?? `${humanise(action)} failed`;
  }
  return ACTION_LABELS[action] ?? humanise(action);
}

/** The module's display name. */
export function moduleLabeller(
  modules: readonly { readonly value: string; readonly label: string }[],
): (code: string) => string {
  const byCode = new Map(modules.map((entry) => [entry.value, entry.label]));
  return (code) => byCode.get(code) ?? humanise(code);
}
