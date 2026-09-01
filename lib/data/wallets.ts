import type { Integration, Wallet } from "@/types/ledger";

/** The artboard's `wallets` list (Finance App.dc.html, lines ~2146-2152). */
const WALLETS: readonly Wallet[] = [
  {
    id: "wal-bca-payroll",
    name: "BCA Payroll",
    meta: "Bank account · ••4192",
    icon: "bank",
    currency: "IDR",
    balance: "Rp41.200.000",
    sub: "Synced 12 minutes ago",
    isNegative: false,
  },
  {
    id: "wal-wise",
    name: "Wise USD",
    meta: "Multi-currency · ••8830",
    icon: "globe",
    currency: "USD",
    balance: "$1.480,00",
    sub: "≈ Rp24.100.000 at 16.284",
    isNegative: false,
  },
  {
    id: "wal-gopay",
    name: "GoPay",
    meta: "E-wallet · 0812••4471",
    icon: "phone",
    currency: "IDR",
    balance: "Rp1.860.000",
    sub: "Synced 3 hours ago",
    isNegative: false,
  },
  {
    id: "wal-bca-card",
    name: "BCA Card",
    meta: "Credit card · ••7702",
    icon: "card",
    currency: "IDR",
    balance: "−Rp3.240.000",
    sub: "Rp21.760.000 of limit free · due 18 Sep",
    isNegative: true,
  },
  {
    id: "wal-cash",
    name: "Cash",
    meta: "Manual entry",
    icon: "cash",
    currency: "IDR",
    balance: "Rp620.000",
    sub: "Last counted 25 August",
    isNegative: false,
  },
];

const INTEGRATIONS: readonly Integration[] = [
  { id: "int-bca", name: "BCA", meta: "Payroll + credit card", icon: "bank", status: "Synced", needsAttention: false },
  { id: "int-gopay", name: "GoPay", meta: "E-wallet", icon: "phone", status: "Synced", needsAttention: false },
  { id: "int-wise", name: "Wise", meta: "USD balance", icon: "globe", status: "Synced", needsAttention: false },
  { id: "int-mandiri", name: "Mandiri", meta: "Consent expired 21 August", icon: "bank", status: "Reconnect", needsAttention: true },
];

export const WALLET_TYPES = [
  "Bank account",
  "E-wallet",
  "Credit card",
  "Cash",
] as const;

export const WALLET_CURRENCIES = [
  "IDR — Rupiah",
  "USD — US Dollar",
  "SGD — Singapore Dollar",
] as const;

export async function getWallets(): Promise<readonly Wallet[]> {
  return WALLETS;
}

export async function getIntegrations(): Promise<readonly Integration[]> {
  return INTEGRATIONS;
}
