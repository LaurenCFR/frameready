import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const orderId = body.orderId || body.publicOrderId;
    const amountCents = Number(body.amountCents);

    if (!orderId || !amountCents || amountCents < 100) {
      return NextResponse.json(
        { error: "Missing orderId or valid amount." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    console.log("Paid revision checkout orderId:", orderId);

    const { data: orderById } = await supabase
  .from("orders")
  .select("*")
  .eq("id", orderId)
  .maybeSingle();

const { data: orderByPublicId } = orderById
  ? { data: null }
  : await supabase
      .from("orders")
      .select("*")
      .eq("public_order_id", orderId)
      .maybeSingle();

const order = orderById || orderByPublicId;

if (!order) {
  return NextResponse.json({ error: "Order not found." }, { status: 404 });
}

    const stripe = getStripe();
    const siteUrl = getSiteUrl();

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/paid-revision-success?order=${order.public_order_id ?? order.id}`,
      cancel_url: `${siteUrl}/delivery/${order.delivery_token}?paidRevision=cancelled`,
      customer_email: order.client_email ?? undefined,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        publicOrderId: order.public_order_id ?? "",
        paymentType: "priority_revision",
      },
      
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "FrameReady Paid Revision",
              description: `Paid revision for order ${
                order.public_order_id ?? order.id
              }`,
            },
          },
        },
      ],
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe did not return a payment URL." },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: process.env.DELIVERY_FROM_EMAIL!,
      to: order.client_email,
      subject: `Paid revision quote – ${order.public_order_id ?? order.id}`,
      html: `
  <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid #1e293b;">
                <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">
                  FrameReady Revision Quote
                </div>
                <div style="font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">
                  Paid revision quote
                </div>
                <div style="margin-top:8px;font-size:15px;color:#cbd5e1;">
                  Order ${order.public_order_id ?? order.id}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e2e8f0;">
                  Hi ${order.client_name || "there"},
                </p>

                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                  We reviewed your revision request and prepared a custom paid revision quote.
                </p>

                <div style="margin:24px 0;padding:18px;border:1px solid #334155;border-radius:12px;background:#020617;">
                  <p style="margin:0;font-size:18px;color:#f8fafc;">
                    <strong>Amount:</strong> $${(amountCents / 100).toFixed(2)} USD
                  </p>
                </div>

                <p style="margin:0 0 24px;">
                  <a href="${checkout.url}" style="display:inline-block;background:#f8fafc;color:#020617;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;">
                    Pay revision quote
                  </a>
                </p>

                <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;">
                  Once payment is complete, we’ll begin the revision work.
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

    await supabase
      .from("orders")
      .update({
        order_status: "awaiting_priority_revision_payment",
        updated_at: new Date().toISOString(),
        revision_history: [
  ...(Array.isArray(order.revision_history) ? order.revision_history : []),
  {
    type: "awaiting_paid_revision_payment",
    createdAt: new Date().toISOString(),
    amountUsd: amountCents / 100,
  },
],
      })
      .eq("id", order.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create paid revision checkout.",
      },
      { status: 500 }
    );
  }
}