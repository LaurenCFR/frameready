export const INITIAL_ORDER_PAYMENT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
] as const;

export type InitialOrderPaymentEvent =
  (typeof INITIAL_ORDER_PAYMENT_EVENTS)[number];

export type InitialOrderPaymentValidation =
  | { kind: "paid" }
  | { kind: "pending" }
  | { kind: "rejected"; error: string };

export function isInitialOrderPaymentEvent(
  eventType: string
): eventType is InitialOrderPaymentEvent {
  return INITIAL_ORDER_PAYMENT_EVENTS.includes(
    eventType as InitialOrderPaymentEvent
  );
}

export function validateInitialOrderPayment(params: {
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
