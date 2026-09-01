import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";

import { IconSprite } from "@/components/ui/icon-sprite";
import { THEME_COOKIE, parseTheme } from "@/lib/preferences";

import "./globals.css";

/** The artboard's `--font-heading` and `--font-body` are the same family. */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ledgerline",
    template: "%s · Ledgerline",
  },
  description:
    "Every rupiah, in one ledger — budgets, wallets, goals and shared spending for a Jakarta studio.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so the first frame is already in the right theme.
  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme} className={plusJakarta.variable}>
      <body className="bg-bg text-text min-h-dvh">
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
