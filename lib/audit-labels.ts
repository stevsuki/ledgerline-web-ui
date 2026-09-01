import type { AuditStatus } from "@/types/access";

/**
 * What to call an audit action.
 *
 * The backend stores a dotted code — `auth.login` — and deliberately ships no
 * label with it: the display labels for modules, statuses and severities live
 * in its DTO layer, but an action is written by whichever service recorded it
 * and naming those is this app's job.
 *
 * So a code the UI has a name for gets that name, and anything else is
 * prettified out of the code itself. That second half matters: the backend can
 * start recording `wallets.connect` tomorrow and the table reads "Connect"
 * rather than a raw identifier, without a release here.
 *
 * The same code can mean two things depending on how it went — `auth.login`
 * with `status: failed` is a failed sign-in, not a sign-in — so the outcome is
 * part of the lookup rather than a separate column.
 */

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

/**
 * The module's display name. The list endpoint sends only the code, while
 * `/audit-logs/options` carries the labels — so the screen builds the lookup
 * from the options it already fetched rather than keeping its own copy of
 * names the backend owns.
 */
export function moduleLabeller(
  modules: readonly { readonly value: string; readonly label: string }[],
): (code: string) => string {
  const byCode = new Map(modules.map((entry) => [entry.value, entry.label]));
  return (code) => byCode.get(code) ?? humanise(code);
}
