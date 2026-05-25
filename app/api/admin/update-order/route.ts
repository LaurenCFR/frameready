import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ORDER_STATUSES, type OrderStatus } from "@/types/order";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "nodejs";

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

type UpdateOrderBody = {
  orderId?: string;
  status?: OrderStatus;
  notes?: string | null;
  deliveryFiles?: import("@/types/order").UploadedFileRecord[];
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  deliveryEmailSentAt?: string | null;
  deliveryStatus?: "not_sent" | "ready_to_send" | "sent" | null;
  revisionRequestMessage?: string | null;
  revisionRequestedAt?: string | null;
  revisionDeliveryFiles?: import("@/types/order").UploadedFileRecord[];
  deliverySets?: {
  type: string;
  label: string;
  files: import("@/types/order").UploadedFileRecord[];
  sentAt?: string | null;
}[];
  revisionDeliverySets?: {
  type: string;
  label: string;
  files: import("@/types/order").UploadedFileRecord[];
  emailSentAt?: string | null;
}[];
  revisionEmailSentAt?: string | null;
  revisionHistory?: import("@/types/order").RevisionHistoryItem[];
};

import { requireAdminSession } from "@/lib/admin-auth";
export async function POST(request: NextRequest) {
  const session = await requireAdminSession();

if (!session.authenticated) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
  try {
    const body = (await request.json()) as UpdateOrderBody;

    if (!body.orderId) {
      return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
  if (!isOrderStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const isTryingToDowngradePaidRevisionToFilesReceived =
    body.status === "files_received";

  if (isTryingToDowngradePaidRevisionToFilesReceived) {
    const supabase = createSupabaseAdminClient();

    const { data: existingOrder } = body.orderId.startsWith("FR-")
      ? await supabase
          .from("orders")
          .select("order_status, revision_history")
          .eq("public_order_id", body.orderId)
          .single()
      : await supabase
          .from("orders")
          .select("order_status, revision_history")
          .eq("id", body.orderId)
          .single();

    const hasPaidRevisionHistory =
      Array.isArray(existingOrder?.revision_history) &&
      existingOrder.revision_history.some(
        (item: any) => item.type === "paid_revision_paid"
      );

    if (
      existingOrder?.order_status?.startsWith("paid_revision") ||
      existingOrder?.order_status === "awaiting_priority_revision_payment" ||
      hasPaidRevisionHistory
    ) {
      updates.order_status = "paid_revision_paid";
    } else {
      updates.order_status = body.status;
    }
  } else {
    updates.order_status = body.status;
  }
}

    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    if (body.deliveryFiles !== undefined) {
  updates.delivery_files = body.deliveryFiles;
}

if (body.deliverySets !== undefined) {
  updates.delivery_sets = body.deliverySets;
}

if (body.revisionDeliverySets !== undefined) {
  updates.revision_delivery_sets = body.revisionDeliverySets;
}

if (body.deliveredAt !== undefined) {
  updates.delivered_at = body.deliveredAt;
}

if (body.deliveredBy !== undefined) {
  updates.delivered_by = body.deliveredBy;
}

if (body.deliveryEmailSentAt !== undefined) {
  updates.delivery_email_sent_at = body.deliveryEmailSentAt;
}

if (body.deliveryStatus !== undefined) {
  updates.delivery_status = body.deliveryStatus;
}

if (body.revisionRequestMessage !== undefined) {
  updates.revision_request_message = body.revisionRequestMessage;
}

if (body.revisionRequestedAt !== undefined) {
  updates.revision_requested_at = body.revisionRequestedAt;
}

if (body.revisionDeliveryFiles !== undefined) {
  updates.revision_delivery_files = body.revisionDeliveryFiles;
}

if (body.revisionEmailSentAt !== undefined) {
  updates.revision_email_sent_at = body.revisionEmailSentAt || null;
}

if (body.revisionHistory !== undefined) {
  updates.revision_history = body.revisionHistory;
}

    const supabase = createSupabaseAdminClient();

    console.log("Update order payload:", {
  orderId: body.orderId,
  revisionDeliverySets: body.revisionDeliverySets,
  updates,
});

const query = supabase
  .from("orders")
  .update(updates)
  .select(`
  id,
  public_order_id,
  client_email,
  client_name,
  package_name,
  revision_request_message,
  revision_delivery_sets,
  revision_history,
  order_status,
updated_at
`);

const { data, error } = body.orderId.startsWith("FR-")
  ? await query.eq("public_order_id", body.orderId).single()
  : await query.eq("id", body.orderId).single();

    if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

const isRevisionStatus =
  data.order_status === "revision_requested" ||
  data.order_status === "paid_revision_quote_requested";

if (
  isRevisionStatus &&
  data.client_email &&
  process.env.RESEND_API_KEY &&
  process.env.DELIVERY_FROM_EMAIL
) {
  const isPriority = data.order_status === "paid_revision_quote_requested";
  const orderLabel = data.public_order_id || data.id;

  try {
  const emailResult = await resend.emails.send({
    from: process.env.DELIVERY_FROM_EMAIL,
    to: data.client_email,
    subject: isPriority
      ? `Priority revision requested – ${orderLabel}`
      : `Revision requested – ${orderLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#020617;color:#e2e8f0;padding:32px;">
        <div style="max-width:620px;margin:auto;background:#0f172a;border:1px solid #1e293b;border-radius:18px;padding:28px;">
          <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;">
            FrameReady Revision
          </p>

          <h1 style="color:#fff;margin:8px 0 16px;">
            ${isPriority ? "Priority revision requested" : "Revision requested"}
          </h1>

          <p>Hi ${data.client_name || "there"},</p>

          <p>
            ${
              isPriority
                ? "A paid priority revision has been requested for your artwork order."
                : "A revision has been requested for your artwork order."
            }
          </p>

          <div style="margin:22px 0;padding:16px;border:1px solid #334155;border-radius:12px;background:#020617;">
            <p><strong>Order:</strong> ${orderLabel}</p>
            <p><strong>Package:</strong> ${data.package_name || "FrameReady package"}</p>
            <p><strong>Status:</strong> ${
              isPriority ? "Priority revision requested" : "Revision requested"
            }</p>
            ${
              data.revision_request_message
                ? `<p><strong>Revision notes:</strong><br/>${data.revision_request_message}</p>`
                : ""
            }
          </div>

          <p>
            You can reply to this email with any clarification or additional notes.
          </p>

          <p style="color:#94a3b8;font-size:13px;margin-top:28px;">
            FrameReady · Professional artwork QC & formatting for streaming platforms
          </p>
        </div>
      </div>
    `,
  });
  console.log("Revision email result:", emailResult);
} catch (emailError) {
  console.error("Revision email failed:", emailError);
}
}

return NextResponse.json({ success: true, order: data });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}