import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export async function recordInitialCheckoutSession(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string
) {
  return supabase
    .from("orders")
    .update({
      stripe_checkout_session_id: sessionId,
      order_status: "awaiting_payment",
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();
}

export function requireRecordedCheckoutSession(result: {
  data: unknown;
  error: { message?: string } | null;
}) {
  if (result.error) {
    throw new Error(
      `Could not record the checkout session: ${result.error.message ?? "database write failed"}`
    );
  }

  if (!result.data) {
    throw new Error("The order is no longer awaiting payment.");
  }
}

export async function markInitialCheckoutCompleted(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string,
  paymentIntentId: string | null
) {
  return supabase
    .from("orders")
    .update({
      payment_status: "paid",
      order_status: "paid",
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .eq("order_status", "awaiting_payment")
    .or(
      `stripe_checkout_session_id.is.null,stripe_checkout_session_id.eq.${sessionId}`
    )
    .select("*")
    .maybeSingle();
}

export async function markCheckoutExpired(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string
) {
  return supabase
    .from("orders")
    .update({
      payment_status: "unpaid",
      order_status: "awaiting_payment",
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .eq("stripe_checkout_session_id", sessionId);
}

export async function markPriorityRevisionCheckoutCompleted(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string,
  paymentIntentId: string | null,
  revisionHistory: unknown,
  paidAt: string
) {
  return supabase
    .from("orders")
    .update({
      order_status: "paid_revision_paid",
      paid_revision_paid_at: paidAt,
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      revision_request_message:
        "Paid revision payment received. Revision work can begin.",
      revision_history: revisionHistory,
      updated_at: paidAt,
    })
    .eq("id", orderId)
    .eq("order_status", "awaiting_priority_revision_payment")
    .eq("stripe_checkout_session_id", sessionId)
    .select("id")
    .maybeSingle();
}

export async function markPriorityRevisionCheckoutExpired(
  supabase: SupabaseClient,
  orderId: string,
  sessionId: string
) {
  return supabase
    .from("orders")
    .update({ order_status: "paid_revision_quote_requested" })
    .eq("id", orderId)
    .eq("order_status", "awaiting_priority_revision_payment")
    .eq("stripe_checkout_session_id", sessionId);
}

export async function createOrReuseInitialCheckoutSession({
  stripe,
  recordedSessionId,
  orderId,
  totalCents,
  params,
}: {
  stripe: Stripe;
  recordedSessionId: string | null;
  orderId: string;
  totalCents: number;
  params: Stripe.Checkout.SessionCreateParams;
}): Promise<Stripe.Checkout.Session> {
  if (recordedSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(recordedSessionId);

    if (existing.status !== "expired") return existing;
  }

  const attempt = recordedSessionId ?? "first";

  return stripe.checkout.sessions.create(params, {
    idempotencyKey: `initial-order-${orderId}-${totalCents}-after-${attempt}`,
  });
}
