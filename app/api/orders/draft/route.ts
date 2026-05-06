import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculatePricing } from "@/lib/pricing";

function generatePublicOrderId() {
  return `FR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = createSupabaseAdminClient();

    const publicOrderId = generatePublicOrderId();

    const localizedLanguageCount =
  body.addOnIds?.includes("localized") && Array.isArray(body.localizedLanguages)
    ? Math.max(1, body.localizedLanguages.length)
    : 1;

const pricing = calculatePricing({
  packageId: body.packageId,
  addOnIds: body.addOnIds || [],
  localizedLanguageCount,
});

    const { data, error } = await supabase
      .from("orders")
      .insert({
        public_order_id: publicOrderId,
        package_id: body.packageId,
        package_name: body.packageName,
        add_on_ids: body.addOnIds || [],
        add_on_labels: body.addOnLabels || [],
        subtotal_cents: pricing.subtotalCents,
        total_cents: pricing.totalCents,
        currency: pricing.currency,
        order_status: "draft",
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      publicOrderId: data.public_order_id,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create draft order" }, { status: 500 });
  }
}