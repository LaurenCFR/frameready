import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculatePricing } from "@/lib/pricing";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import type { AddOnId, OrderRow, PackageId } from "@/types/order";

type CheckoutBody = {
  orderId?: string;
};

function isPackageId(value: unknown): value is PackageId {
  return value === "essential" || value === "pro" || value === "studio";
}

function isAddOnIdArray(value: unknown): value is AddOnId[] {
  return (
    Array.isArray(value) &&
    value.every((item) =>
      ["variation", "localized", "logo_pack", "express"].includes(String(item))
    )
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const orderId = body.orderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const order = data as OrderRow;

    if (!isPackageId(order.package_id) || !isAddOnIdArray(order.add_on_ids)) {
      return NextResponse.json(
        { error: "Order contains invalid pricing data." },
        { status: 400 }
      );
    }

    const localizedCount = order.add_on_ids.includes("localized")
  ? Math.max(1, order.localized_languages?.length ?? 1)
  : 1;

    const trustedPricing = calculatePricing({
      packageId: order.package_id,
      addOnIds: order.add_on_ids,
      localizedLanguageCount: localizedCount,
    });

    if (trustedPricing.totalCents !== order.total_cents) {
      return NextResponse.json(
        { error: "Order total mismatch. Please recreate the order." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/?checkout=success&order=${order.id}`,
      cancel_url: `${siteUrl}/upload?checkout=cancelled&order=${order.id}`,
      customer_email: order.client_email ?? undefined,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        publicOrderId: order.public_order_id ?? "",
        packageId: order.package_id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: trustedPricing.currency,
            unit_amount: trustedPricing.packagePriceCents,
            product_data: {
              name: trustedPricing.packageName,
              description: "Artwork QC & delivery package",
            },
          },
        },
        ...trustedPricing.addOns.map((addOn) => ({
          quantity: addOn.quantity,
          price_data: {
            currency: trustedPricing.currency,
            unit_amount: addOn.unitPriceCents,
            product_data: {
              name: addOn.label,
            },
          },
        })),
      ],
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        order_status: "awaiting_payment",
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("orders.update stripe session failed", updateError);
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("checkout session creation failed", error);
    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}