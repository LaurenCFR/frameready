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

      if (!orderId) {
        return NextResponse.json(
          { error: "No orderId found in checkout session metadata." },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "files_received",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .eq("id", orderId);

      if (error) {
        console.error("Failed to update paid order", error);
        return NextResponse.json(
          { error: "Failed to update order after payment." },
          { status: 500 }
        );
      }
      const { data: order, error: orderFetchError } = await supabase
  .from("orders")
  .select("*")
  .eq("id", orderId)
  .single();

if (orderFetchError || !order) {
  console.error("Failed to fetch paid order for receipt email", orderFetchError);
} else if (order.client_email && process.env.RESEND_API_KEY) {
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
                      Payment received
                    </div>
                    <div style="margin-top:8px;font-size:15px;color:#cbd5e1;">
                      Order ${orderLabel}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e2e8f0;">
                      Hi ${order.client_name || "there"},
                    </p>

                    <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                      Thanks — your FrameReady order has been received and payment is complete.
                    </p>

                    <div style="margin:24px 0;padding:18px;border:1px solid #334155;border-radius:12px;background:#020617;">
                      <p style="margin:0 0 10px;"><strong>Order:</strong> ${orderLabel}</p>
                      <p style="margin:0 0 10px;"><strong>Package:</strong> ${order.package_name || "FrameReady package"}</p>
                      <p style="margin:0 0 10px;"><strong>Total:</strong> ${totalUsd}</p>
                      ${
                        Array.isArray(order.add_on_labels) &&
                        order.add_on_labels.length > 0
                          ? `<p style="margin:0;"><strong>Add-ons:</strong> ${order.add_on_labels.join(", ")}</p>`
                          : ""
                      }
                    </div>

                    <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;">
                      We’ll review your uploaded artwork and begin preparing your platform-ready files.
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