import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/auth/routes";

/** The root path carries no screen of its own. */
export default function RootPage() {
  redirect(HOME_PATH);
}
