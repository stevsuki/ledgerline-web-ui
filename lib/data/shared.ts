import type { RampStep, SharedCategory, SharedMember } from "@/types/ledger";

type SharedSplit = {
  readonly id: string;
  readonly label: string;
  readonly width: string;
  readonly step: RampStep;
};

type SharedBudget = {
  readonly title: string;
  readonly meta: string;
  readonly role: string;
  readonly spent: string;
  readonly spentNote: string;
  readonly splits: readonly SharedSplit[];
};

/** The household budget shared with Sari (artboard lines ~2196-2206). */
export const SHARED_BUDGET: SharedBudget = {
  title: "Household — August",
  meta: "2 members · shared limit Rp9.000.000",
  role: "Owner",
  spent: "Rp7.240.000",
  spentNote: "spent · 80% of shared limit",
  splits: [
    { id: "split-rangga", label: "Rangga Rp4.350.000", width: "48%", step: "c1" },
    { id: "split-sari", label: "Sari Rp2.890.000", width: "32%", step: "c3" },
  ],
};

const SHARED_CATEGORIES: readonly SharedCategory[] = [
  { id: "shr-rent", label: "Rent & utilities", spent: "Rp4.925.000", limit: "Rp5.000.000", width: "99%", tone: "expense" },
  { id: "shr-groceries", label: "Groceries", spent: "Rp1.640.000", limit: "Rp2.500.000", width: "66%", tone: "text" },
  { id: "shr-eating", label: "Eating out", spent: "Rp485.000", limit: "Rp1.000.000", width: "49%", tone: "text" },
  { id: "shr-goods", label: "Household goods", spent: "Rp190.000", limit: "Rp500.000", width: "38%", tone: "text" },
];

const SHARED_MEMBERS: readonly SharedMember[] = [
  {
    id: "mem-rangga",
    name: "Rangga Aditama",
    contribution: "Contributed Rp5.000.000 · spent Rp4.350.000",
    role: "Owner",
    isOwner: true,
  },
  {
    id: "mem-sari",
    name: "Sari Puspita",
    contribution: "Contributed Rp4.000.000 · spent Rp2.890.000",
    role: "Member",
    isOwner: false,
  },
];

export async function getSharedCategories(): Promise<readonly SharedCategory[]> {
  return SHARED_CATEGORIES;
}

export async function getSharedMembers(): Promise<readonly SharedMember[]> {
  return SHARED_MEMBERS;
}
