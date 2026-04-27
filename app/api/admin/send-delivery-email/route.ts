import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { generateDeliveryToken } from "@/lib/delivery-token";
import type { UploadedFileRecord } from "@/types/order";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    if (!process.env.DELIVERY_FROM_EMAIL) {
      return NextResponse.json(
        { error: "DELIVERY_FROM_EMAIL is not configured." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (!order.client_email) {
      return NextResponse.json(
        { error: "This order does not have a client email address." },
        { status: 400 }
      );
    }

    const deliveryFiles: UploadedFileRecord[] = Array.isArray(order.delivery_files)
      ? order.delivery_files
      : [];

    if (deliveryFiles.length === 0) {
      return NextResponse.json(
        { error: "No delivery files found for this order." },
        { status: 400 }
      );
    }

    let deliveryToken = order.delivery_token as string | null;

    if (!deliveryToken) {
      deliveryToken = generateDeliveryToken(16);

      const { error: tokenUpdateError } = await supabase
        .from("orders")
        .update({
          delivery_token: deliveryToken,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (tokenUpdateError) {
        return NextResponse.json(
          { error: tokenUpdateError.message },
          { status: 500 }
        );
      }
    }

    const orderLabel = order.public_order_id || order.id;
    const clientName = order.client_name || "there";
    const deliveryUrl = `${getSiteUrl()}/delivery/${deliveryToken}`;

    const emailHtml = `
      <div style="margin:0;padding:0;background:#020617;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid #1e293b;">
                    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">
                      FrameReady Delivery
                    </div>
                    <div style="font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">
                      Your artwork is ready
                    </div>
                    <div style="margin-top:8px;font-size:15px;color:#cbd5e1;">
                      Order ${orderLabel}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e2e8f0;">
                      Hi ${clientName},
                    </p>

                    <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                      Your FrameReady delivery package is complete and ready for download.
                    </p>

                    <p style="margin:0 0 24px;">
                      <a
                        href="${deliveryUrl}"
                        style="display:inline-block;background:#f8fafc;color:#020617;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;"
                      >
                        View Delivery
                      </a>
                    </p>

                    <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;">
                      If you need revisions or have any questions, just reply to this email.
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
    `;

    const emailResult = await resend.emails.send({
  from:
    process.env.DELIVERY_FROM_EMAIL ||
    "FrameReady <deliveries@framereadystudio.com>",
  to: order.client_email,
  subject: `Your FrameReady delivery is ready – ${orderLabel}`,
  html: emailHtml,
});

    if ((emailResult as { error?: { message?: string } | null }).error) {
      return NextResponse.json(
        {
          error:
            (emailResult as { error?: { message?: string } | null }).error
              ?.message || "Email send failed.",
        },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        order_status: "completed",
        delivered_at: now,
        delivered_by: session.email,
        delivery_status: "sent",
        delivery_email_sent_at: now,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deliveryUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send delivery email.",
      },
      { status: 500 }
    );
  }
}