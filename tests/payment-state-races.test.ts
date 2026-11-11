import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completeInitialCheckoutSession,
  expireCheckoutSession,
  saveInitialCheckoutSession,
  type PaymentState,
} from "../lib/payment-state-policy.ts";

const unpaid = (sessionId: string | null): PaymentState => ({
  paymentStatus: "unpaid",
  orderStatus: "awaiting_payment",
  checkoutSessionId: sessionId,
});

test("completed then expired never downgrades a paid order", () => {
  const completed = completeInitialCheckoutSession(unpaid("cs_current"), "cs_current");
  const expired = expireCheckoutSession(completed, "cs_current");

  assert.deepEqual(expired, {
    paymentStatus: "paid",
    orderStatus: "paid",
    checkoutSessionId: "cs_current",
  });
});

test("an old expired event never overwrites a newer Checkout Session", () => {
  const withNewSession = saveInitialCheckoutSession(unpaid("cs_old"), "cs_new");
  const expiredOldSession = expireCheckoutSession(withNewSession, "cs_old");

  assert.deepEqual(expiredOldSession, {
    paymentStatus: "unpaid",
    orderStatus: "awaiting_payment",
    checkoutSessionId: "cs_new",
  });
});

test("a late checkout update never overwrites a completed webhook", () => {
  const completed = completeInitialCheckoutSession(unpaid("cs_current"), "cs_current");
  const lateCheckoutUpdate = saveInitialCheckoutSession(completed, "cs_current");

  assert.deepEqual(lateCheckoutUpdate, {
    paymentStatus: "paid",
    orderStatus: "paid",
    checkoutSessionId: "cs_current",
  });
});

test("completion can win before the first Checkout Session ID is saved", () => {
  const completed = completeInitialCheckoutSession(unpaid(null), "cs_current");

  assert.deepEqual(completed, {
    paymentStatus: "paid",
    orderStatus: "paid",
    checkoutSessionId: "cs_current",
  });
});

test("completion from an old session never pays a newer session", () => {
  const result = completeInitialCheckoutSession(unpaid("cs_new"), "cs_old");

  assert.deepEqual(result, unpaid("cs_new"));
});

test("duplicate paid delivery is idempotent", () => {
  const first = completeInitialCheckoutSession(unpaid("cs_current"), "cs_current");
  const duplicate = completeInitialCheckoutSession(first, "cs_current");

  assert.deepEqual(duplicate, first);
});

test("an expired-session race cannot undo a later successful payment", () => {
  const expired = expireCheckoutSession(unpaid("cs_current"), "cs_current");
  const paid = completeInitialCheckoutSession(expired, "cs_current");
  const lateExpiration = expireCheckoutSession(paid, "cs_current");

  assert.deepEqual(lateExpiration, paid);
});
