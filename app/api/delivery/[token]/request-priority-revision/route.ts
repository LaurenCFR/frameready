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
    const message = body.message || null;

    const supabase = createSupabaseAdminClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, revision_history")
      .eq("delivery_token", token)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Delivery not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("orders")
      .update({
  order_status: "paid_revision_quote_requested",
  revision_requested_at: now,
  revision_request_message: message,
  revision_history: [
    ...(Array.isArray(order.revision_history) ? order.revision_history : []),
    {
      type: "paid_revision_quote_requested",
      status: "pending",
      message: message || "",
      createdAt: now,
    },
  ],
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
  } catch {
    return NextResponse.json(
      { error: "Failed to request paid revision quote." },
      { status: 500 }
    );
  }
}