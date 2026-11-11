export type PaymentState = {
  paymentStatus: string;
  orderStatus: string;
  checkoutSessionId: string | null;
};

export function saveInitialCheckoutSession(
  state: PaymentState,
  sessionId: string
): PaymentState {
  if (state.paymentStatus !== "unpaid") return state;

  return {
    ...state,
    orderStatus: "awaiting_payment",
    checkoutSessionId: sessionId,
  };
}

export function completeInitialCheckoutSession(
  state: PaymentState,
  sessionId: string
): PaymentState {
  const sessionMatches =
    state.checkoutSessionId === null || state.checkoutSessionId === sessionId;

  if (
    state.paymentStatus !== "unpaid" ||
    state.orderStatus !== "awaiting_payment" ||
    !sessionMatches
  ) {
    return state;
  }

  return {
    ...state,
    paymentStatus: "paid",
    orderStatus: "paid",
    checkoutSessionId: sessionId,
  };
}

export function expireCheckoutSession(
  state: PaymentState,
  sessionId: string
): PaymentState {
  if (
    state.paymentStatus !== "unpaid" ||
    state.checkoutSessionId !== sessionId
  ) {
    return state;
  }

  return {
    ...state,
    orderStatus: "awaiting_payment",
  };
}
