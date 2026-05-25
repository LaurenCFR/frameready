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
      .select("id, package_id, revision_count, revision_limit, revision_history")
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
const revisionLimit =
  order.revision_limit != null
    ? Number(order.revision_limit)
    : order.package_id === "essential"
    ? 1
    : 2;

const { error: updateError } = await supabase
  .from("orders")
  .update({
    order_status:
  revisionCount + 1 > revisionLimit
    ? "paid_revision_quote_requested"
    : "revision_requested",
    revision_history: [
      ...(Array.isArray(order.revision_history)
        ? order.revision_history
        : []),

      {
        type:
  revisionCount + 1 > revisionLimit
    ? "paid_revision_quote_requested"
    : "revision_requested",
        message: message || "",
        createdAt: now,
      },
    ],    
    revision_requested_at: now,
    revision_request_message: message || null,
    revision_count: revisionCount + 1,
    updated_at: now,
  })
  .eq("id", order.id);

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