import { canReadMenu } from "@/lib/access/menus";
import { streamAuditExport } from "@/lib/api/audit";
import { getProfile, readAccessToken } from "@/lib/auth/session";
import {
  AUDIT_MODULE_VALUES,
  AUDIT_SEVERITY_VALUES,
  AUDIT_STATUS_VALUES,
  NO_FILTER,
  isActorId,
} from "@/lib/data/audit";
import {
  readIsoDate,
  readOption,
  readText,
  type RawSearchParams,
} from "@/lib/search-params";

/** The audit log as a file. The CSV itself is the backend's. */

/** The menu code the backend gates this screen behind (migration 000008). */
const AUDIT_MENU = "audit";

const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
const FALLBACK_FILENAME = 'attachment; filename="audit-log.csv"';

function forbidden(): Response {
  // No redirect: a download is not a navigation.
  return new Response("Not authorised", { status: 403 });
}

export async function GET(request: Request): Promise<Response> {
  const [profile, accessToken] = await Promise.all([
    getProfile(),
    readAccessToken(),
  ]);

  if (!profile || !accessToken || !canReadMenu(profile.menus, AUDIT_MENU)) {
    return forbidden();
  }

  const { searchParams } = new URL(request.url);
  const params: RawSearchParams = Object.fromEntries(searchParams);
  const actor = readText(params, "actor");

  const upstream = await streamAuditExport(accessToken, {
    search: readText(params, "q"),
    userId: isActorId(actor) ? actor : NO_FILTER,
    status: readOption(params, "status", AUDIT_STATUS_VALUES),
    severity: readOption(params, "severity", AUDIT_SEVERITY_VALUES),
    module: readOption(params, "module", AUDIT_MODULE_VALUES),
    from: readIsoDate(params, "from"),
    to: readIsoDate(params, "to"),
  });

  if (!upstream) {
    console.error("audit export: the API could not be reached");
    return new Response("Cannot reach the audit service.", { status: 502 });
  }

  if (!upstream.ok) {
    // Logged with its status: the sentence the caller sees cannot carry that much.
    console.error(`audit export: the API answered ${upstream.status}`);
    return new Response(
      `The audit service could not produce the export (${upstream.status}).`,
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? CSV_CONTENT_TYPE,
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? FALLBACK_FILENAME,
      // An audit export is per-person and per-moment; nothing may hold onto it.
      "Cache-Control": "no-store",
    },
  });
}
