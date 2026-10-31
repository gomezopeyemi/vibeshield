import type { DatabaseTable, StripeEndpoint } from "@/lib/types";

/* ⚠️ DEMO DATA — Supabase metadata & Stripe integrity fixtures. */

const now = Date.now();
const inspectedAt = new Date(now - 2 * 3600_000).toISOString();

export const DEMO_TABLES: DatabaseTable[] = [
  {
    id: "tbl_profiles",
    schema: "public",
    name: "profiles",
    rlsEnabled: false,
    rowEstimate: 1284,
    inspection: "inspected",
    lastInspectedAt: inspectedAt,
    findingIds: ["find_rls_profiles"],
    relations: [{ to: "users", column: "user_id" }],
    policies: [],
  },
  {
    id: "tbl_users",
    schema: "auth",
    name: "users",
    rlsEnabled: true,
    rowEstimate: 1284,
    inspection: "inspected",
    lastInspectedAt: inspectedAt,
    findingIds: [],
    relations: [],
    policies: [
      {
        id: "p_users_self",
        name: "Users read own record",
        command: "SELECT",
        roles: ["authenticated"],
        using: "auth.uid() = id",
        permissive: false,
      },
    ],
  },
  {
    id: "tbl_orders",
    schema: "public",
    name: "orders",
    rlsEnabled: true,
    rowEstimate: 4820,
    inspection: "inspected",
    lastInspectedAt: inspectedAt,
    findingIds: ["find_permissive_orders"],
    relations: [
      { to: "users", column: "user_id" },
      { to: "payments", column: "order_id" },
    ],
    policies: [
      {
        id: "p_orders_select",
        name: "orders_select",
        command: "SELECT",
        roles: ["authenticated"],
        using: "true",
        permissive: true,
      },
    ],
  },
  {
    id: "tbl_payments",
    schema: "public",
    name: "payments",
    rlsEnabled: true,
    rowEstimate: 4120,
    inspection: "inspected",
    lastInspectedAt: inspectedAt,
    findingIds: [],
    relations: [{ to: "orders", column: "order_id" }],
    policies: [
      {
        id: "p_pay_select",
        name: "payments_owner_select",
        command: "SELECT",
        roles: ["authenticated"],
        using: "auth.uid() = user_id",
        permissive: false,
      },
      {
        id: "p_pay_insert",
        name: "payments_service_insert",
        command: "INSERT",
        roles: ["service_role"],
        withCheck: "true",
        permissive: false,
      },
    ],
  },
  {
    id: "tbl_subscriptions",
    schema: "public",
    name: "subscriptions",
    rlsEnabled: true,
    inspection: "inspected",
    lastInspectedAt: inspectedAt,
    findingIds: [],
    relations: [{ to: "users", column: "user_id" }],
    policies: [
      {
        id: "p_sub_select",
        name: "subscriptions_owner_select",
        command: "SELECT",
        roles: ["authenticated"],
        using: "auth.uid() = user_id",
        permissive: false,
      },
    ],
  },
];

export const DEMO_STRIPE_ENDPOINT: StripeEndpoint = {
  id: "stripe_webhook",
  path: "src/app/api/webhooks/stripe/route.ts",
  verifiesSignature: false,
  idempotent: false,
  handledEvents: ["checkout.session.completed"],
  handlesCancellation: false,
  handlesDowngrade: false,
  syncsDatabase: true,
  findingIds: ["find_stripe_sig"],
};

export interface StripeFlowStep {
  id: string;
  label: string;
  state: "ok" | "warn" | "fail" | "unknown";
  detail: string;
}

export const DEMO_STRIPE_FLOW: StripeFlowStep[] = [
  { id: "checkout", label: "Checkout", state: "ok", detail: "Session created client-side" },
  { id: "webhook", label: "Webhook endpoint", state: "ok", detail: "Receives POST /api/webhooks/stripe" },
  { id: "signature", label: "Signature verification", state: "fail", detail: "constructEvent() not called" },
  { id: "idempotency", label: "Idempotency", state: "warn", detail: "No event de-duplication" },
  { id: "db", label: "Database sync", state: "ok", detail: "grantSubscription() updates subscriptions" },
  { id: "lifecycle", label: "Subscription lifecycle", state: "fail", detail: "cancellation & downgrade unhandled" },
];
