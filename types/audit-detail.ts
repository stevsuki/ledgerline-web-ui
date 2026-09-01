/** The structured payload behind an audit entry. */

export const AUDIT_KINDS = [
  "session",
  "session_failed",
  "money_entry",
  "limit_change",
  "record",
  "membership",
  "permission_change",
  "data_job",
  "setting_change",
  "report_viewed",
  "alert_sent",
] as const;

export type AuditKind = (typeof AUDIT_KINDS)[number];

/** `domain.Money`: minor units plus its currency, never a formatted string. */
export type AuditMoney = {
  readonly amount: number;
  readonly currency: string;
};

export type SessionMethod = "password" | "oauth" | "biometric" | "invite";

export type SessionFailedReason = "wrong_password" | "locked";

export type AuditRecordType =
  | "wallet"
  | "goal"
  | "role"
  | "budget"
  | "institution";

export type AuditDataJob = "export" | "sync";

export type AuditDataFormat = "CSV" | "PDF";

export type AuditDetail =
  | {
      readonly kind: "session";
      readonly method: SessionMethod;
      readonly user_agent?: string;
    }
  | {
      readonly kind: "session_failed";
      readonly reason: SessionFailedReason;
      readonly attempts: number;
      readonly max_attempts?: number;
      readonly email: string;
    }
  | {
      readonly kind: "money_entry";
      readonly amount: AuditMoney;
      readonly label: string;
      readonly wallet?: string;
      readonly reason?: string;
    }
  | {
      readonly kind: "limit_change";
      readonly target: string;
      readonly from: AuditMoney;
      readonly to: AuditMoney;
    }
  | {
      readonly kind: "record";
      readonly record_type: AuditRecordType;
      readonly name: string;
      readonly note?: string;
      readonly amount?: AuditMoney;
    }
  | {
      readonly kind: "membership";
      readonly subject: string;
      readonly email?: string;
      readonly role?: string;
      readonly reason?: string;
    }
  | {
      readonly kind: "permission_change";
      readonly role: string;
      /** The backend spells the fifth one `approve`; the role matrix says `approval`. */
      readonly permission:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "approve";
      readonly module: string;
      readonly granted: boolean;
    }
  | {
      readonly kind: "data_job";
      readonly job: AuditDataJob;
      readonly format?: AuditDataFormat;
      readonly source?: string;
      readonly rows?: number;
      readonly period?: string;
    }
  | {
      readonly kind: "setting_change";
      readonly setting: string;
      readonly enabled?: boolean;
      readonly from?: string;
      readonly to?: string;
    }
  | {
      readonly kind: "report_viewed";
      readonly report: string;
      readonly period: string;
    }
  | {
      readonly kind: "alert_sent";
      readonly subject: string;
      readonly threshold_percent: number;
    };
