/** The Settings screen's fixed option lists (artboard lines ~871-932). */

export const PREFERENCE_FIELDS = [
  {
    id: "pref-currency",
    label: "Primary currency",
    options: ["IDR — Rupiah", "USD — US Dollar"],
  },
  {
    id: "pref-language",
    label: "Language",
    options: ["Bahasa Indonesia", "English"],
  },
  {
    id: "pref-week-start",
    label: "Week starts",
    options: ["Monday", "Sunday"],
  },
  {
    id: "pref-number-format",
    label: "Number format",
    options: ["1.234.567", "1,234,567"],
  },
] as const;

export const SECURITY_TOGGLES = [
  { id: "biometric", label: "Biometric lock on mobile", enabled: true },
  { id: "two-factor", label: "Two-factor authentication", enabled: true },
  { id: "export-pin", label: "Require PIN for exports", enabled: false },
] as const;

export const EXPORT_FORMATS = ["CSV", "Excel", "PDF"] as const;

export const PASSWORD_ROW = {
  label: "Password",
  meta: "Changed 4 months ago",
} as const;

export const PROFILE = {
  location: "Jakarta",
} as const;
