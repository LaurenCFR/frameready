import type { FrameReadyEnvironment } from "./environment";

export function assertStripeKeyMode(
  environment: FrameReadyEnvironment,
  secretKey: string
): void {
  const expectedPrefix = environment === "production" ? "sk_live_" : "sk_test_";

  if (!secretKey.startsWith(expectedPrefix)) {
    throw new Error(
      `${environment} must use a Stripe ${environment === "production" ? "live" : "test"} secret key.`
    );
  }
}

export function assertStripeAccountId(
  expectedAccountId: string,
  actualAccountId: string
): void {
  if (actualAccountId !== expectedAccountId) {
    throw new Error(
      "Stripe credentials do not belong to STRIPE_EXPECTED_ACCOUNT_ID. Refusing to continue."
    );
  }
}
