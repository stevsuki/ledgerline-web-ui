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

/**
 * The audit log as a file.
 *
 * The CSV itself is the backend's — `GET /audit-logs/export` streams it row by
 * row, under the same filters as the list, so the file can never hold a
 * different set of rows than the table it was asked for from. This route
 * exists because the browser cannot call that endpoint: the access token is in
 * an http-only cookie that only the server can read.
 *
 * So it is a pipe, not a generator. The upstream body is passed straight
 * through without being buffered, and the filename the backend chose is passed
 * through with it — an export of any size crosses this app without ever
 * sitting in its memory.
 *
 * A failure answers as a status and a sentence, never as a file. The popover
 * reads both and says so on screen: a browser told to download will save
 * whatever arrives, so an error handed back as a body becomes a text file full
 * of error rather than a message anyone sees.
 *
 * It also has to guard itself. `proxy.ts` only checks that a session cookie
 * exists, and a route handler has no layout above it to run the real check.
 */

/** The menu code the backend gates this screen behind (migration 000008). */
const AUDIT_MENU = "audit";

const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
const FALLBACK_FILENAME = 'attachment; filename="audit-log.csv"';

function forbidden(): Response {
  // No redirect: a download is not a navigation, and returning the sign-in
  // page would save an HTML file under a .csv name.
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
    // Logged with its status, because the sentence the caller shows cannot
    // carry enough to tell a missing route from an expired token.
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
