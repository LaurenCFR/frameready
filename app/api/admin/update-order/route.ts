import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ORDER_STATUSES, type OrderStatus } from "@/types/order";

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

      updates.order_status = body.status;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    if (body.deliveryFiles !== undefined) {
  updates.delivery_files = body.deliveryFiles;
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

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", body.orderId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}