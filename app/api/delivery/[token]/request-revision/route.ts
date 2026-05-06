import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    const supabase = createSupabaseAdminClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, revision_count, revision_limit")
      .eq("delivery_token", token)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Delivery not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const revisionCount = Number(order.revision_count ?? 0);
const revisionLimit = Number(order.revision_limit ?? 1);

if (revisionCount >= revisionLimit) {
  return NextResponse.json(
    {
      error:
        "This order has reached its included revision limit. Please reply to the delivery email for additional revision options.",
    },
    { status: 403 }
  );
}

    const { error: updateError } = await supabase
  .from("orders")
  .update({
    order_status: "revision_requested",
    revision_requested_at: now,
    revision_request_message: message || null,
    revision_count: revisionCount + 1,

    // ✅ optional but recommended
    delivered_at: null,
    delivery_status: "not_sent",

    updated_at: now,
  })
  .eq("id", order.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to request revision.",
      },
      { status: 500 }
    );
  }
}