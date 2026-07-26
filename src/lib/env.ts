import "server-only";

/**
 * Minimal, typed access to server environment variables.
 *
 * We validate lazily (on first access) rather than pulling in a schema library
 * so that build-time tooling that doesn't need every secret still works. Values
 * that must exist for the app to run at all are asserted here.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get AUTH_SECRET() {
    return required("AUTH_SECRET");
  },
  get CRON_SECRET() {
    return required("CRON_SECRET");
  },
  get APP_URL() {
    return optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },

  // Billing defaults (a shop can override these on its Subscription row).
  billing: {
    get trialDays() {
      return int("TRIAL_DAYS", 14);
    },
    get gracePeriodDays() {
      return int("GRACE_PERIOD_DAYS", 7);
    },
    get billingCycleDays() {
      return int("BILLING_CYCLE_DAYS", 30);
    },
    get starterPriceUgx() {
      return int("STARTER_PRICE_UGX", 25000);
    },
    get cancelledRetentionDays() {
      return int("CANCELLED_RETENTION_DAYS", 90);
    },
  },
};
