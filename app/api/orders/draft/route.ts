import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculatePricing } from "@/lib/pricing";
import {
  DESTINATION_MIGRATION_REQUIRED_MESSAGE,
  destinationMigrationIsRequired,
  isDestinationSchemaMissing,
} from "@/lib/destination-persistence";
import { DELIVERY_DESTINATIONS } from "@/types/order";

function sanitizeDestinations(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(DELIVERY_DESTINATIONS);
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string"))
  ).filter((item) => allowed.has(item));
}

function withoutDestinationFields(value: Record<string, unknown>) {
  const legacyValue = { ...value };
  delete legacyValue.delivery_destinations;
  delete legacyValue.delivery_destination_other;
  return legacyValue;
}

function generatePublicOrderId() {
  return `FR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = createSupabaseAdminClient();
    const deliveryDestinations = sanitizeDestinations(body.deliveryDestinations);
    const deliveryDestinationOther = deliveryDestinations.includes("Other")
      ? String(body.deliveryDestinationOther || "").trim().slice(0, 200) || null
      : null;

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

    const rowToInsert = {
        public_order_id: publicOrderId,
        package_id: body.packageId,
        package_name: body.packageName,
        revision_limit: body.packageId === "essential" ? 1 : 2,
        add_on_ids: body.addOnIds || [],
        add_on_labels: body.addOnLabels || [],
        subtotal_cents: pricing.subtotalCents,
        total_cents: pricing.totalCents,
        currency: pricing.currency,
        order_status: "draft",
        payment_status: "unpaid",
        delivery_destinations: deliveryDestinations,
        delivery_destination_other: deliveryDestinationOther,
      };

    let { data, error } = await supabase
      .from("orders")
      .insert(rowToInsert)
      .select()
      .single();

    if (destinationMigrationIsRequired(error, deliveryDestinations)) {
      return NextResponse.json(
        {
          error: DESTINATION_MIGRATION_REQUIRED_MESSAGE,
          code: "DESTINATION_MIGRATION_REQUIRED",
        },
        { status: 503 }
      );
    }

    if (isDestinationSchemaMissing(error)) {
      const legacyRow = withoutDestinationFields(rowToInsert);
      ({ data, error } = await supabase
        .from("orders")
        .insert(legacyRow)
        .select()
        .single());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      publicOrderId: data.public_order_id,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create draft order" }, { status: 500 });
  }
}
