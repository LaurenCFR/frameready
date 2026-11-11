import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStoredPriorityRevisionQuote,
  isCheckoutPaymentSuccessEvent,
  validateInitialOrderPayment,
  validatePriorityRevisionPayment,
} from "../lib/checkout-payment-validation.ts";

const validPayment = {
  paymentStatus: "paid",
  amountTotal: 9900,
  currency: "usd",
  storedTotalCents: 9900,
  storedCurrency: "usd",
};

test("accepts a paid initial-order Checkout payment", () => {
  assert.deepEqual(validateInitialOrderPayment(validPayment), { kind: "paid" });
});

test("leaves an unpaid completed Checkout Session pending", () => {
  assert.deepEqual(
    validateInitialOrderPayment({ ...validPayment, paymentStatus: "unpaid" }),
    { kind: "pending" }
  );
});

test("rejects a paid Checkout Session with the wrong amount", () => {
  assert.deepEqual(
    validateInitialOrderPayment({ ...validPayment, amountTotal: 9800 }),
    {
      kind: "rejected",
      error: "Checkout amount does not match the stored order total.",
    }
  );
});

test("rejects a paid Checkout Session with the wrong currency", () => {
  assert.deepEqual(
    validateInitialOrderPayment({ ...validPayment, currency: "aud" }),
    {
      kind: "rejected",
      error: "Checkout currency does not match the stored order currency.",
    }
  );
});

test("handles Stripe's later success event for delayed payment methods", () => {
  assert.equal(isCheckoutPaymentSuccessEvent("checkout.session.completed"), true);
  assert.equal(
    isCheckoutPaymentSuccessEvent("checkout.session.async_payment_succeeded"),
    true
  );
  assert.equal(
    isCheckoutPaymentSuccessEvent("checkout.session.async_payment_failed"),
    false
  );
});

test("leaves an unpaid paid-revision completion pending", () => {
  assert.deepEqual(
    validatePriorityRevisionPayment({
      ...validPayment,
      paymentStatus: "unpaid",
    }),
    { kind: "pending" }
  );
});

test("rejects paid-revision amount and currency mismatches", () => {
  assert.equal(
    validatePriorityRevisionPayment({ ...validPayment, amountTotal: 10000 })
      .kind,
    "rejected"
  );
  assert.equal(
    validatePriorityRevisionPayment({ ...validPayment, currency: "aud" })
      .kind,
    "rejected"
  );
});

test("reads the stored paid-revision amount and currency", () => {
  assert.deepEqual(
    getStoredPriorityRevisionQuote([
      { type: "paid_revision_quote_requested" },
      {
        type: "awaiting_paid_revision_payment",
        amountCents: 12500,
        amountUsd: 125,
        currency: "USD",
      },
    ]),
    { amountCents: 12500, currency: "usd" }
  );
});

test("supports legacy USD paid-revision quote records", () => {
  assert.deepEqual(
    getStoredPriorityRevisionQuote([
      { type: "awaiting_paid_revision_payment", amountUsd: 125 },
    ]),
    { amountCents: 12500, currency: "usd" }
  );
});
