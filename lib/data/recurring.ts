import { paginate, type Paged } from "@/lib/pagination";
import type { MiniStat, RecurringItem } from "@/types/ledger";

/** The artboard's `RECURRING` fixture (Finance App.dc.html, lines ~1609-1617). */
const RECURRING: readonly RecurringItem[] = [
  { id: "rec-rent", name: "Kost Tebet Barat", wallet: "BCA Payroll", icon: "home", frequency: "Monthly", due: "1 Sep", amount: "Rp4.500.000", isDueSoon: true, isPaused: false },
  { id: "rec-biznet", name: "Biznet Home", wallet: "BCA Payroll", icon: "wifi", frequency: "Monthly", due: "1 Sep", amount: "Rp425.000", isDueSoon: true, isPaused: false },
  { id: "rec-figma", name: "Figma Professional", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", due: "3 Sep", amount: "Rp180.000", isDueSoon: false, isPaused: false },
  { id: "rec-adobe", name: "Adobe Creative Cloud", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", due: "6 Sep", amount: "Rp290.000", isDueSoon: false, isPaused: false },
  { id: "rec-copilot", name: "GitHub Copilot", wallet: "BCA Card", icon: "monitor", frequency: "Monthly", due: "9 Sep", amount: "Rp160.000", isDueSoon: false, isPaused: false },
  { id: "rec-bpjs", name: "BPJS Kesehatan", wallet: "BCA Payroll", icon: "heart", frequency: "Monthly", due: "10 Sep", amount: "Rp150.000", isDueSoon: false, isPaused: false },
  { id: "rec-netflix", name: "Netflix", wallet: "GoPay", icon: "monitor", frequency: "Monthly", due: "Paused", amount: "Rp186.000", isDueSoon: false, isPaused: true },
];

export const RECURRING_PAGE_SIZES = [5, 10, 25] as const;

export const RECURRING_STATS: readonly MiniStat[] = [
  { id: "commitment", label: "Monthly commitment", value: "Rp5.891.000", tone: "text", note: "27% of average income" },
  { id: "due-soon", label: "Due in 7 days", value: "Rp5.111.000", tone: "expense", note: "Rent, internet, two subscriptions" },
  { id: "active", label: "Active items", value: "7", tone: "text", note: "1 paused since July" },
];

export const RECURRING_FREQUENCIES = [
  "Monthly",
  "Weekly",
  "Quarterly",
  "Annual",
] as const;

export const RECURRING_WALLETS = ["BCA Card", "GoPay", "BCA Payroll"] as const;

export async function getRecurring(
  page: number,
  size: number,
): Promise<Paged<RecurringItem>> {
  return paginate(RECURRING, page, size);
}
