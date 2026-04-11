import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  stripeInstance = new Stripe(getEnv("STRIPE_SECRET_KEY"));

  return stripeInstance;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function getSiteUrl(): string {
  return getEnv("NEXT_PUBLIC_SITE_URL");
}