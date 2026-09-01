import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/auth/routes";

/**
 * The root path carries no screen of its own. It hands over to the dashboard;
 * `proxy.ts` is what turns that into the sign-in card for a visitor who has
 * no session yet, so the gate lives in exactly one place.
 */
export default function RootPage() {
  redirect(HOME_PATH);
}
