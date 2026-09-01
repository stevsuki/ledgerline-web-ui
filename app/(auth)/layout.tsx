import Link from "next/link";
import type { ReactNode } from "react";

import { AppChromeProvider } from "@/components/shell/app-chrome";

/**
 * The auth routes sit outside the app shell — no rail, no header. The artboard
 * shows the three cards side by side on one canvas; here each is its own page,
 * with the shared frame lifted into this layout.
 */
export default function AuthLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <AppChromeProvider>
      <div className="bg-bg flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
        <main className="animate-fade w-full max-w-[400px]">{children}</main>

        <nav className="text-muted flex flex-wrap justify-center gap-4 text-note">
          <Link href="/sign-in" className="hover:text-accent">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-accent">
            Create account
          </Link>
          <Link href="/reset-password" className="hover:text-accent">
            Reset password
          </Link>
        </nav>
      </div>
    </AppChromeProvider>
  );
}
