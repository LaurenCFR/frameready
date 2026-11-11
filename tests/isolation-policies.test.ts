import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveEmailPolicy } from "../lib/email-policy.ts";
import {
  assertStripeAccountId,
  assertStripeKeyMode,
} from "../lib/stripe-policy.ts";

test("Preview email is always redirected", () => {
  const result = resolveEmailPolicy({
    environment: "preview",
    deliveryMode: "redirect",
    intendedRecipients: "customer@example.com",
    subject: "Delivery ready",
    testRecipient: "developer@example.com",
  });

  assert.equal(result.to, "developer@example.com");
  assert.equal(result.subject, "[FrameReady preview] Delivery ready");
  assert.equal(result.isRedirected, true);
});

test("Preview rejects live email mode", () => {
  assert.throws(
    () =>
      resolveEmailPolicy({
        environment: "preview",
        deliveryMode: "live",
        intendedRecipients: "customer@example.com",
        subject: "Delivery ready",
      }),
    /Non-production email/
  );
});

test("Preview requires a test recipient", () => {
  assert.throws(
    () =>
      resolveEmailPolicy({
        environment: "preview",
        deliveryMode: "redirect",
        intendedRecipients: "customer@example.com",
        subject: "Delivery ready",
      }),
    /EMAIL_TEST_RECIPIENT/
  );
});

test("Production email preserves the intended recipient", () => {
  const result = resolveEmailPolicy({
    environment: "production",
    deliveryMode: "live",
    intendedRecipients: "customer@example.com",
    subject: "Delivery ready",
  });

  assert.equal(result.to, "customer@example.com");
  assert.equal(result.subject, "Delivery ready");
  assert.equal(result.isRedirected, false);
});

test("Preview rejects Stripe live keys and Production rejects test keys", () => {
  assert.throws(() => assertStripeKeyMode("preview", "sk_live_example"));
  assert.throws(() => assertStripeKeyMode("production", "sk_test_example"));
  assert.doesNotThrow(() => assertStripeKeyMode("preview", "sk_test_example"));
  assert.doesNotThrow(() => assertStripeKeyMode("production", "sk_live_example"));
});

test("Stripe account IDs must match", () => {
  assert.throws(() => assertStripeAccountId("acct_expected", "acct_other"));
  assert.doesNotThrow(() =>
    assertStripeAccountId("acct_expected", "acct_expected")
  );
});
