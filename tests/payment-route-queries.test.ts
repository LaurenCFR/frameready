import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  createOrReuseInitialCheckoutSession,
  markCheckoutExpired,
  markInitialCheckoutCompleted,
  markPriorityRevisionCheckoutCompleted,
  markPriorityRevisionCheckoutExpired,
  recordInitialCheckoutSession,
  requireRecordedCheckoutSession,
} from "../lib/payment-queries.ts";

type Call = [string, ...unknown[]];

function fakeSupabase(result: { data?: unknown; error?: { message: string } | null }) {
  const calls: Call[] = [];
  const builder = {
    update(value: unknown) {
      calls.push(["update", value]);
      return this;
    },
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return this;
    },
    or(value: string) {
      calls.push(["or", value]);
      return this;
    },
    select(value: string) {
      calls.push(["select", value]);
      return this;
    },
    maybeSingle() {
      calls.push(["maybeSingle"]);
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null,
      });
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null,
      }).then(resolve);
    },
  };
  const supabase = {
    from(table: string) {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

function session(id: string, status: "open" | "complete" | "expired") {
  return {
    id,
    status,
    url: status === "open" ? `https://checkout.stripe.test/${id}` : null,
  } as Stripe.Checkout.Session;
}

function fakeStripe(existing: Record<string, Stripe.Checkout.Session>) {
  const createdByKey = new Map<string, Stripe.Checkout.Session>();
  let createCalls = 0;
  const stripe = {
    checkout: {
      sessions: {
        async retrieve(id: string) {
          return existing[id];
        },
        async create(
          _params: Stripe.Checkout.SessionCreateParams,
          options: { idempotencyKey: string }
        ) {
          createCalls += 1;
          const prior = createdByKey.get(options.idempotencyKey);
          if (prior) return prior;
          const created = session(`cs_retry_${createdByKey.size + 1}`, "open");
          createdByKey.set(options.idempotencyKey, created);
          return created;
        },
      },
    },
  } as unknown as Stripe;

  return { stripe, createdByKey, getCreateCalls: () => createCalls };
}

const createParams = { mode: "payment" as const, line_items: [] };

test("an expired recorded session creates one usable retry session", async () => {
  const { stripe, createdByKey } = fakeStripe({
    cs_expired: session("cs_expired", "expired"),
  });

  const retry = await createOrReuseInitialCheckoutSession({
    stripe,
    recordedSessionId: "cs_expired",
    orderId: "order_1",
    totalCents: 9900,
    params: createParams,
  });

  assert.equal(retry.status, "open");
  assert.ok(retry.url);
  assert.equal(createdByKey.size, 1);
  assert.ok(
    createdByKey.has("initial-order-order_1-9900-after-cs_expired")
  );
});

test("concurrent retries share Stripe's idempotent replacement session", async () => {
  const { stripe, createdByKey } = fakeStripe({
    cs_expired: session("cs_expired", "expired"),
  });
  const request = () =>
    createOrReuseInitialCheckoutSession({
      stripe,
      recordedSessionId: "cs_expired",
      orderId: "order_1",
      totalCents: 9900,
      params: createParams,
    });

  const [first, second] = await Promise.all([request(), request()]);

  assert.equal(first.id, second.id);
  assert.equal(createdByKey.size, 1);
});

test("a repeated click reuses the recorded open session", async () => {
  const open = session("cs_retry", "open");
  const { stripe, getCreateCalls } = fakeStripe({ cs_retry: open });

  const result = await createOrReuseInitialCheckoutSession({
    stripe,
    recordedSessionId: "cs_retry",
    orderId: "order_1",
    totalCents: 9900,
    params: createParams,
  });

  assert.equal(result.id, "cs_retry");
  assert.equal(getCreateCalls(), 0);
});

test("checkout persistence uses the unpaid guard and must return a row", async () => {
  const { supabase, calls } = fakeSupabase({ data: { id: "order_1" } });
  const result = await recordInitialCheckoutSession(
    supabase,
    "order_1",
    "cs_retry"
  );
  requireRecordedCheckoutSession(result);

  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "id" && call[2] === "order_1"));
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "payment_status" && call[2] === "unpaid"));
  assert.ok(calls.some((call) => call[0] === "select" && call[1] === "id"));
});

test("a failed or unmatched database write cannot authorize returning the URL", () => {
  assert.throws(
    () => requireRecordedCheckoutSession({ data: null, error: { message: "write failed" } }),
    /Could not record/
  );
  assert.throws(
    () => requireRecordedCheckoutSession({ data: null, error: null }),
    /no longer awaiting payment/
  );
});

test("completed webhook query is atomic and session-scoped", async () => {
  const { supabase, calls } = fakeSupabase({ data: { id: "order_1" } });
  await markInitialCheckoutCompleted(
    supabase,
    "order_1",
    "cs_retry",
    "pi_1"
  );

  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "payment_status" && call[2] === "unpaid"));
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "order_status" && call[2] === "awaiting_payment"));
  assert.ok(calls.some((call) => call[0] === "or" && String(call[1]).includes("stripe_checkout_session_id.eq.cs_retry")));
});

test("expired webhook query requires unpaid and exact session identity", async () => {
  const { supabase, calls } = fakeSupabase({});
  await markCheckoutExpired(supabase, "order_1", "cs_expired");

  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "payment_status" && call[2] === "unpaid"));
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "stripe_checkout_session_id" && call[2] === "cs_expired"));
});

test("paid-revision completion is atomic and session-scoped", async () => {
  const { supabase, calls } = fakeSupabase({ data: { id: "order_1" } });
  await markPriorityRevisionCheckoutCompleted(
    supabase,
    "order_1",
    "cs_revision",
    "pi_revision",
    [],
    "2026-11-11T00:00:00.000Z"
  );

  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" &&
        call[1] === "order_status" &&
        call[2] === "awaiting_priority_revision_payment"
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" &&
        call[1] === "stripe_checkout_session_id" &&
        call[2] === "cs_revision"
    )
  );
});

test("duplicate paid-revision delivery cannot update an already-paid row", async () => {
  const { supabase, calls } = fakeSupabase({ data: null });
  const result = await markPriorityRevisionCheckoutCompleted(
    supabase,
    "order_1",
    "cs_revision",
    "pi_revision",
    [],
    "2026-11-11T00:00:00.000Z"
  );

  assert.equal(result.data, null);
  assert.ok(calls.some((call) => call[0] === "maybeSingle"));
});

test("paid-revision expiration requires awaiting status and exact session", async () => {
  const { supabase, calls } = fakeSupabase({});
  await markPriorityRevisionCheckoutExpired(
    supabase,
    "order_1",
    "cs_expired_revision"
  );

  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" &&
        call[1] === "order_status" &&
        call[2] === "awaiting_priority_revision_payment"
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" &&
        call[1] === "stripe_checkout_session_id" &&
        call[2] === "cs_expired_revision"
    )
  );
});
