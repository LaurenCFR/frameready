import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isInitialOrderPaymentEvent,
  validateInitialOrderPayment,
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
  assert.equal(isInitialOrderPaymentEvent("checkout.session.completed"), true);
  assert.equal(
    isInitialOrderPaymentEvent("checkout.session.async_payment_succeeded"),
    true
  );
  assert.equal(
    isInitialOrderPaymentEvent("checkout.session.async_payment_failed"),
    false
  );
});
