import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  calculatePricingFromStoredPackagePrice,
  getStoredPackagePriceCents,
} from "@/lib/pricing";
import { getSiteUrl, getStripe, verifyStripeAccount } from "@/lib/stripe";
import {
  createOrReuseInitialCheckoutSession,
  recordInitialCheckoutSession,
  requireRecordedCheckoutSession,
} from "@/lib/payment-queries";
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

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 409 }
      );
    }

    if (order.order_status !== "awaiting_payment") {
      return NextResponse.json(
        { error: "This order is not awaiting payment." },
        { status: 409 }
      );
    }

    if (!isPackageId(order.package_id) || !isAddOnIdArray(order.add_on_ids)) {
      return NextResponse.json(
        { error: "Order contains invalid pricing data." },
        { status: 400 }
      );
    }

    const localizedCount = order.add_on_ids.includes("localized")
  ? Math.max(1, order.localized_languages?.length ?? 1)
  : 1;

    const storedTotalCents = order.total_cents;
    if (!Number.isInteger(storedTotalCents) || (storedTotalCents ?? 0) < 0) {
      return NextResponse.json(
        { error: "Order contains invalid stored pricing." },
        { status: 400 }
      );
    }

    const packagePriceCents = getStoredPackagePriceCents({
      storedTotalCents: storedTotalCents as number,
      packageId: order.package_id,
      addOnIds: order.add_on_ids,
      localizedLanguageCount: localizedCount,
    });
    const trustedPricing = calculatePricingFromStoredPackagePrice({
      packageId: order.package_id,
      packageName: order.package_name || order.package_id,
      packagePriceCents,
      addOnIds: order.add_on_ids,
      localizedLanguageCount: localizedCount,
    });

    const stripe = getStripe();
    await verifyStripeAccount();
    const siteUrl = getSiteUrl();

    const session = await createOrReuseInitialCheckoutSession({
      stripe,
      recordedSessionId: order.stripe_checkout_session_id ?? null,
      orderId: order.id,
      totalCents: trustedPricing.totalCents,
      params: {
        mode: "payment",
      success_url: `${siteUrl}/payment-success?order=${order.id}`,
      cancel_url: `${siteUrl}/upload?checkout=cancelled&order=${order.id}`,
      customer_email: order.client_email ?? undefined,
      client_reference_id: order.id,
      metadata: {
  orderId: order.id,
  publicOrderId: order.public_order_id ?? "",
  packageId: order.package_id,
  paymentType: "initial_order",
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
        ...trustedPricing.addOns.map(
  (addOn: {
    quantity: number;
    label: string;
    unitPriceCents: number;
  }) => ({
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
      },
    });

    if (session.status === "complete") {
      return NextResponse.json(
        { error: "This checkout has already completed." },
        { status: 409 }
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    const recordResult = await recordInitialCheckoutSession(
      supabase,
      order.id,
      session.id
    );
    requireRecordedCheckoutSession(recordResult);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
  console.error("checkout session creation failed", error);

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create checkout session.",
    },
    { status: 500 }
  );
}
}
