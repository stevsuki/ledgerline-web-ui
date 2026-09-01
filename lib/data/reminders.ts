import type { Bill, BudgetAlert, Reminder } from "@/types/ledger";

/** The header bell's four items (artboard lines ~2119-2124). */
export const NOTIFICATIONS: readonly Reminder[] = [
  {
    id: "not-subs",
    icon: "warn",
    tone: "expense",
    title: "Subscriptions budget exceeded",
    meta: "Rp1.180.000 of Rp1.000.000 · today",
  },
  {
    id: "not-biznet",
    icon: "calendar",
    tone: "text",
    title: "Biznet Home due in 5 days",
    meta: "Rp425.000 · 1 September",
  },
  {
    id: "not-food",
    icon: "warn",
    tone: "warn",
    title: "Food & drink at 88%",
    meta: "Rp360.000 left · 4 days remaining",
  },
  {
    id: "not-house",
    icon: "flag",
    tone: "text",
    title: "House down payment hit 38%",
    meta: "Rp152.000.000 of Rp400.000.000",
  },
];

const BILLS: readonly Bill[] = [
  { id: "bill-rent", month: "Sep", day: "01", name: "Kost Tebet Barat", meta: "Rent · BCA Payroll · autopay on", state: "In 5 days", amount: "Rp4.500.000", isImminent: true },
  { id: "bill-biznet", month: "Sep", day: "01", name: "Biznet Home", meta: "Internet · BCA Payroll", state: "In 5 days", amount: "Rp425.000", isImminent: true },
  { id: "bill-figma", month: "Sep", day: "03", name: "Figma Professional", meta: "Subscription · BCA Card", state: "In 7 days", amount: "Rp180.000", isImminent: false },
  { id: "bill-adobe", month: "Sep", day: "06", name: "Adobe Creative Cloud", meta: "Subscription · BCA Card", state: "In 10 days", amount: "Rp290.000", isImminent: false },
  { id: "bill-bpjs", month: "Sep", day: "10", name: "BPJS Kesehatan", meta: "Insurance · BCA Payroll", state: "In 14 days", amount: "Rp150.000", isImminent: false },
  { id: "bill-card", month: "Sep", day: "18", name: "BCA Card statement", meta: "Credit card · minimum Rp324.000", state: "In 22 days", amount: "Rp3.240.000", isImminent: false },
];

const ALERTS: readonly BudgetAlert[] = [
  {
    id: "alert-subs",
    icon: "warn",
    tone: "expense",
    title: "Subscriptions is Rp180.000 over its Rp1.000.000 limit",
    meta: "Triggered 26 August",
  },
  {
    id: "alert-food",
    icon: "warn",
    tone: "warn",
    title: "Food & drink crossed 80% of its limit",
    meta: "Triggered 24 August",
  },
  {
    id: "alert-health",
    icon: "check",
    tone: "income",
    title: "Health spending closed the month 38% under",
    meta: "27 August",
  },
];

export const DELIVERY_CHANNELS = [
  { id: "push", label: "Push notifications", enabled: true },
  { id: "email", label: "Email digest, Mondays", enabled: true },
  { id: "whatsapp", label: "WhatsApp bill reminders", enabled: false },
] as const;

export async function getBills(): Promise<readonly Bill[]> {
  return BILLS;
}

export async function getBudgetAlerts(): Promise<readonly BudgetAlert[]> {
  return ALERTS;
}
