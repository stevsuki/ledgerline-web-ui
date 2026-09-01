import { isRecord, readBoolean, readNumber, readString } from "@/lib/api/parse";
import { AUDIT_KINDS } from "@/types/audit-detail";
import type {
  AuditDataFormat,
  AuditDataJob,
  AuditDetail,
  AuditKind,
  AuditMoney,
  AuditRecordType,
  SessionFailedReason,
  SessionMethod,
} from "@/types/audit-detail";

/**
 * Narrows an audit entry's `details` into one member of the union.
 *
 * There is one builder per kind and no cast anywhere: each reads the fields
 * its own shape requires and returns `null` when one is missing, so a payload
 * this build does not understand becomes an absent detail rather than an
 * object claiming a type it does not have.
 *
 * Nothing breaks when it returns `null`. The row renders `detail_text`, which
 * the backend wrote at the same moment as the payload; this is for the parts
 * rather than the sentence.
 */

/* ── field readers ─────────────────────────────────────────────────────── */

type Raw = Record<string, unknown>;

/** A required string: present, a string, and not empty. */
function required(raw: Raw, key: string): string | null {
  return readString(raw, key) || null;
}

/** An absent optional field stays absent rather than becoming an empty string. */
function optional(raw: Raw, key: string): string | undefined {
  return readString(raw, key) || undefined;
}

function optionalCount(raw: Raw, key: string): number | undefined {
  return readNumber(raw, key) ?? undefined;
}

function oneOf<T extends string>(
  raw: Raw,
  key: string,
  allowed: readonly T[],
): T | null {
  const value = readString(raw, key);
  return allowed.find((option) => option === value) ?? null;
}

/** `domain.Money`: minor units and a currency, both required. */
function money(raw: Raw, key: string): AuditMoney | null {
  const value = raw[key];
  if (!isRecord(value)) {
    return null;
  }

  const amount = readNumber(value, "amount");
  const currency = required(value, "currency");
  return amount === null || !currency ? null : { amount, currency };
}

function optionalMoney(raw: Raw, key: string): AuditMoney | undefined {
  return money(raw, key) ?? undefined;
}

/* ── the vocabularies each builder accepts ─────────────────────────────── */

const SESSION_METHODS: readonly SessionMethod[] = [
  "password",
  "oauth",
  "biometric",
  "invite",
];

const FAILED_REASONS: readonly SessionFailedReason[] = [
  "wrong_password",
  "locked",
];

const RECORD_TYPES: readonly AuditRecordType[] = [
  "wallet",
  "goal",
  "role",
  "budget",
  "institution",
];

const PERMISSIONS = ["create", "read", "update", "delete", "approve"] as const;

const DATA_JOBS: readonly AuditDataJob[] = ["export", "sync"];

const DATA_FORMATS: readonly AuditDataFormat[] = ["CSV", "PDF"];

/* ── one builder per kind ──────────────────────────────────────────────── */

const BUILDERS: Readonly<Record<AuditKind, (raw: Raw) => AuditDetail | null>> =
  {
    session(raw) {
      const method = oneOf(raw, "method", SESSION_METHODS);
      if (!method) {
        return null;
      }
      return { kind: "session", method, user_agent: optional(raw, "user_agent") };
    },

    session_failed(raw) {
      const reason = oneOf(raw, "reason", FAILED_REASONS);
      const attempts = readNumber(raw, "attempts");
      const email = required(raw, "email");
      if (!reason || attempts === null || !email) {
        return null;
      }
      return {
        kind: "session_failed",
        reason,
        attempts,
        max_attempts: optionalCount(raw, "max_attempts"),
        email,
      };
    },

    money_entry(raw) {
      const amount = money(raw, "amount");
      const label = required(raw, "label");
      if (!amount || !label) {
        return null;
      }
      return {
        kind: "money_entry",
        amount,
        label,
        wallet: optional(raw, "wallet"),
        reason: optional(raw, "reason"),
      };
    },

    limit_change(raw) {
      const target = required(raw, "target");
      const from = money(raw, "from");
      const to = money(raw, "to");
      if (!target || !from || !to) {
        return null;
      }
      return { kind: "limit_change", target, from, to };
    },

    record(raw) {
      const recordType = oneOf(raw, "record_type", RECORD_TYPES);
      const name = required(raw, "name");
      if (!recordType || !name) {
        return null;
      }
      return {
        kind: "record",
        record_type: recordType,
        name,
        note: optional(raw, "note"),
        amount: optionalMoney(raw, "amount"),
      };
    },

    membership(raw) {
      const subject = required(raw, "subject");
      if (!subject) {
        return null;
      }
      return {
        kind: "membership",
        subject,
        email: optional(raw, "email"),
        role: optional(raw, "role"),
        reason: optional(raw, "reason"),
      };
    },

    permission_change(raw) {
      const role = required(raw, "role");
      const permission = oneOf(raw, "permission", PERMISSIONS);
      const moduleName = required(raw, "module");
      if (!role || !permission || !moduleName) {
        return null;
      }
      return {
        kind: "permission_change",
        role,
        permission,
        module: moduleName,
        granted: readBoolean(raw, "granted"),
      };
    },

    data_job(raw) {
      const job = oneOf(raw, "job", DATA_JOBS);
      if (!job) {
        return null;
      }
      return {
        kind: "data_job",
        job,
        format: oneOf(raw, "format", DATA_FORMATS) ?? undefined,
        source: optional(raw, "source"),
        rows: optionalCount(raw, "rows"),
        period: optional(raw, "period"),
      };
    },

    setting_change(raw) {
      const setting = required(raw, "setting");
      if (!setting) {
        return null;
      }
      return {
        kind: "setting_change",
        setting,
        enabled: typeof raw.enabled === "boolean" ? raw.enabled : undefined,
        from: optional(raw, "from"),
        to: optional(raw, "to"),
      };
    },

    report_viewed(raw) {
      const report = required(raw, "report");
      const period = required(raw, "period");
      if (!report || !period) {
        return null;
      }
      return { kind: "report_viewed", report, period };
    },

    alert_sent(raw) {
      const subject = required(raw, "subject");
      const threshold = readNumber(raw, "threshold_percent");
      if (!subject || threshold === null) {
        return null;
      }
      return {
        kind: "alert_sent",
        subject,
        threshold_percent: threshold,
      };
    },
  };

/** `null` for anything absent, untagged, or tagged with a kind we do not know. */
export function parseAuditDetail(raw: unknown): AuditDetail | null {
  if (!isRecord(raw)) {
    return null;
  }

  const tag = readString(raw, "kind");
  const kind = AUDIT_KINDS.find((known) => known === tag);
  return kind ? BUILDERS[kind](raw) : null;
}
