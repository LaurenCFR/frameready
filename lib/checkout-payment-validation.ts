export const CHECKOUT_PAYMENT_SUCCESS_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
] as const;

export type CheckoutPaymentSuccessEvent =
  (typeof CHECKOUT_PAYMENT_SUCCESS_EVENTS)[number];

export type InitialOrderPaymentValidation =
  | { kind: "paid" }
  | { kind: "pending" }
  | { kind: "rejected"; error: string };

export function isCheckoutPaymentSuccessEvent(
  eventType: string
): eventType is CheckoutPaymentSuccessEvent {
  return CHECKOUT_PAYMENT_SUCCESS_EVENTS.includes(
    eventType as CheckoutPaymentSuccessEvent
  );
}

export function validateCheckoutPayment(params: {
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  storedTotalCents: number;
  storedCurrency: string;
}): InitialOrderPaymentValidation {
  if (params.paymentStatus !== "paid") {
    return { kind: "pending" };
  }

  if (params.amountTotal !== params.storedTotalCents) {
    return {
      kind: "rejected",
      error: "Checkout amount does not match the stored order total.",
    };
  }

  if (
    !params.currency ||
    params.currency.toLowerCase() !== params.storedCurrency.toLowerCase()
  ) {
    return {
      kind: "rejected",
      error: "Checkout currency does not match the stored order currency.",
    };
  }

  return { kind: "paid" };
}

export const validateInitialOrderPayment = validateCheckoutPayment;
export const validatePriorityRevisionPayment = validateCheckoutPayment;

export function getStoredPriorityRevisionQuote(
  revisionHistory: unknown
): { amountCents: number; currency: string } | null {
  if (!Array.isArray(revisionHistory)) return null;

  const quote = revisionHistory.findLast(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { type?: unknown }).type === "awaiting_paid_revision_payment"
  ) as
    | {
        amountCents?: unknown;
        amountUsd?: unknown;
        currency?: unknown;
      }
    | undefined;

  if (!quote) return null;

  const amountCents = Number.isInteger(quote.amountCents)
    ? Number(quote.amountCents)
    : typeof quote.amountUsd === "number" && Number.isFinite(quote.amountUsd)
      ? Math.round(quote.amountUsd * 100)
      : NaN;
  const currency =
    typeof quote.currency === "string" && quote.currency.trim()
      ? quote.currency.trim().toLowerCase()
      : "usd";

  if (!Number.isInteger(amountCents) || amountCents < 1) return null;

  return { amountCents, currency };
}
