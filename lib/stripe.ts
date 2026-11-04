import Stripe from "stripe";
import {
  getFrameReadyEnvironment,
  getRequiredEnvironmentVariable,
  getSiteUrl as getEnvironmentSiteUrl,
} from "@/lib/environment";
import {
  assertStripeAccountId,
  assertStripeKeyMode,
} from "@/lib/stripe-policy";

let stripeInstance: Stripe | null = null;
let stripeAccountVerification: Promise<void> | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const environment = getFrameReadyEnvironment();
  const secretKey = getRequiredEnvironmentVariable("STRIPE_SECRET_KEY");
  assertStripeKeyMode(environment, secretKey);

  stripeInstance = new Stripe(secretKey);

  return stripeInstance;
}

export async function verifyStripeAccount(): Promise<void> {
  if (!stripeAccountVerification) {
    stripeAccountVerification = (async () => {
      const stripe = getStripe();
      const expectedAccountId = getRequiredEnvironmentVariable(
        "STRIPE_EXPECTED_ACCOUNT_ID"
      );
      const account = await stripe.accounts.retrieveCurrent();

      assertStripeAccountId(expectedAccountId, account.id);
    })();
  }

  return stripeAccountVerification;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function getSiteUrl(): string {
  return getEnvironmentSiteUrl();
}
