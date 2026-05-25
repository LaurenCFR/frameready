import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const webhookSecret = getStripeWebhookSecret();

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Missing STRIPE_WEBHOOK_SECRET." },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header." },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Webhook signature verification failed: ${error.message}`
              : "Webhook signature verification failed.",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId || session.client_reference_id;
      const paymentType = session.metadata?.paymentType;

      if (!orderId) {
        return NextResponse.json(
          { error: "No orderId found in checkout session metadata." },
          { status: 400 }
        );
      }

      console.log("CHECKOUT COMPLETED", {
        orderId,
        paymentType,
        sessionId: session.id,
      });

      console.log("ENTERED PAYMENT BRANCH", {
  paymentType,
  orderStatusBefore: null,
});

      if (paymentType === "priority_revision") {
        console.log("PAID REVISION BRANCH ONLY");

        const now = new Date().toISOString();

        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (fetchError || !order) {
          return NextResponse.json(
            { error: "Paid revision order not found." },
            { status: 404 }
          );
        }

        const existingRevisionHistory = Array.isArray(order.revision_history)
          ? order.revision_history
          : [];

        const latestPaidQuoteIndex = existingRevisionHistory.findLastIndex(
          (item: any) =>
            item.type === "awaiting_paid_revision_payment" ||
            item.type === "paid_revision_quote_requested"
        );

        const updatedRevisionHistory =
          latestPaidQuoteIndex >= 0
            ? existingRevisionHistory.map((item: any, index: number) =>
                index === latestPaidQuoteIndex
                  ? {
                      ...item,
                      type: "paid_revision_paid",
                      status: "paid",
                      paidAt: now,
                      amountUsd: Number(session.amount_total || 0) / 100,
                    }
                  : item
              )
            : [
                ...existingRevisionHistory,
                {
                  type: "paid_revision_paid",
                  status: "paid",
                  createdAt: now,
                  amountUsd: Number(session.amount_total || 0) / 100,
                },
              ];

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            order_status: "paid_revision_paid",
            paid_revision_paid_at: now,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            revision_request_message:
              "Paid revision payment received. Revision work can begin.",
            revision_history: updatedRevisionHistory,
            updated_at: now,
          })
          .eq("id", orderId);

        if (updateError) {
          console.error("Paid revision update failed", updateError);

          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }

        console.log("PAID REVISION UPDATE SUCCESS");

        if (order.client_email && process.env.RESEND_API_KEY) {
          await resend.emails.send({
            from:
              process.env.DELIVERY_FROM_EMAIL ||
              "FrameReady <deliveries@framereadystudio.com>",
            to: order.client_email,
            subject: `Paid revision payment received – ${
              order.public_order_id ?? order.id
            }`,
            html: `
              <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 16px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
                        <tr>
                          <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid #1e293b;">
                            <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">
                              FrameReady Receipt
                            </div>
                            <div style="font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">
                              Paid revision payment received
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e2e8f0;">
                              Hi ${order.client_name || "there"},
                            </p>

                            <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                              Thanks — your paid revision payment has been received.
                            </p>

                            <div style="margin:24px 0;padding:18px;border:1px solid #334155;border-radius:12px;background:#020617;">
                              <p style="margin:0 0 10px;"><strong>Order:</strong> ${
                                order.public_order_id ?? order.id
                              }</p>
                              <p style="margin:0;"><strong>Total:</strong> $${(
                                Number(session.amount_total || 0) / 100
                              ).toFixed(2)} USD</p>
                            </div>

                            <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;">
                              We’ll begin the revision work and email you once the updated files are ready.
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:20px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:13px;">
                            FrameReady · Professional artwork QC & formatting for streaming platforms
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
        }

        return NextResponse.json({ received: true });
      }

      if (paymentType === "initial_order") {
        console.log("RUNNING INITIAL ORDER UPDATE");
  const { data: existingOrder, error: existingOrderError } = await supabase
  .from("orders")
  .select("order_status")
  .eq("id", orderId)
  .single();

if (existingOrderError || !existingOrder) {
  console.error("Could not fetch existing order before initial payment update", {
    orderId,
    existingOrderError,
  });

  return NextResponse.json({ received: true });
}

if (existingOrder.order_status !== "awaiting_payment") {
  console.log("Blocked initial-order branch because order is not awaiting payment", {
    orderId,
    currentStatus: existingOrder.order_status,
  });

  return NextResponse.json({ received: true });
}

const { data: updatedOrder, error: updateError } = await supabase
  .from("orders")
  .update({
    payment_status: "paid",
    order_status: "paid",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
  })
  .eq("id", orderId)
  .select("*")
  .maybeSingle();

if (updateError) {
  console.error("Initial order payment update failed", updateError);

  return NextResponse.json(
    { error: updateError.message },
    { status: 500 }
  );
}

if (!updatedOrder) {
  console.log("Skipped initial-order update because no order was updated", {
    orderId,
    paymentType,
  });

  return NextResponse.json({ received: true });
}

const order = updatedOrder;

if (
  !order.payment_receipt_sent_at &&
  order.client_email &&
  process.env.RESEND_API_KEY
) {
  const orderLabel = order.public_order_id || order.id;
  const totalUsd = `$${((order.total_cents || 0) / 100).toFixed(2)} USD`;

  await resend.emails.send({
    from:
      process.env.DELIVERY_FROM_EMAIL ||
      "FrameReady <deliveries@framereadystudio.com>",
    to: order.client_email,
    subject: `Payment received – ${orderLabel}`,
    html: `
      <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
        <p>Payment received for order ${orderLabel}</p>
        <p>Total: ${totalUsd}</p>
      </div>
    `,
  });

  await supabase
    .from("orders")
    .update({
      payment_receipt_sent_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

return NextResponse.json({ received: true });
      }

      console.log("UNKNOWN PAYMENT TYPE - NO STATUS UPDATE", {
        orderId,
        paymentType,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId || session.client_reference_id;

      if (orderId) {
        await supabase
          .from("orders")
          .update({
            payment_status: "unpaid",
            order_status: "awaiting_payment",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", orderId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error", error);

    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}