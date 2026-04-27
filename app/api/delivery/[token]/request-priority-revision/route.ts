import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id")
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
        order_status: "priority_revision_requested",
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
      { error: "Failed to request priority revision." },
      { status: 500 }
    );
  }
}