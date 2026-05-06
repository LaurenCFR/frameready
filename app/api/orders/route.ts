import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADD_ON_CONFIG, calculatePricing, PACKAGE_CONFIG } from "@/lib/pricing";
import type { AddOnId, OrderCreateInput, OrderRow, PackageId } from "@/types/order";

function isPackageId(value: unknown): value is PackageId {
  return typeof value === "string" && value in PACKAGE_CONFIG;
}

function isAddOnIdArray(value: unknown): value is AddOnId[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item in ADD_ON_CONFIG)
  );
}

function sanitizeString(value: unknown, max = 5000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitizeStringArray(value: unknown, maxItems = 25, maxLen = 100): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeLocalizedTitles(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([k, v]) => typeof k === "string" && typeof v === "string")
    .map(([k, v]) => [k.trim().slice(0, 100), (v as string).trim().slice(0, 1000)] as const)
    .filter(([k, v]) => k && v);

  return Object.fromEntries(entries);
}

function sanitizeUploadedFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const file = item as Record<string, unknown>;
      return {
        path: sanitizeString(file.path, 500),
        bucket: sanitizeString(file.bucket, 100),
        fileName: sanitizeString(file.fileName, 255),
        mimeType: sanitizeString(file.mimeType, 100),
        sizeBytes:
          typeof file.sizeBytes === "number" && Number.isFinite(file.sizeBytes)
            ? Math.max(0, Math.floor(file.sizeBytes))
            : 0,
        publicUrl: sanitizeString(file.publicUrl, 1000) || null,
      };
    })
    .filter((file) => file.path && file.bucket && file.fileName);
}

function validatePayload(body: unknown): OrderCreateInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const input = body as Record<string, unknown>;

  const packageId = input.packageId;
  const addOnIds = input.addOnIds;

  if (!isPackageId(packageId)) {
    throw new Error("Invalid package selected.");
  }

  if (!isAddOnIdArray(addOnIds)) {
    throw new Error("Invalid add-ons selected.");
  }

  const clientName = sanitizeString(input.clientName, 200);
  const clientEmail = sanitizeString(input.clientEmail, 320).toLowerCase();

  if (!clientName) {
    throw new Error("Client name is required.");
  }

  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    throw new Error("A valid client email is required.");
  }

  const localizedLanguages = sanitizeStringArray(input.localizedLanguages);
  const localizedTitles = sanitizeLocalizedTitles(input.localizedTitles);

  const uploadedFiles = sanitizeUploadedFiles(input.uploadedFiles);
  const uploadedFontFiles = sanitizeUploadedFiles(input.uploadedFontFiles);

  return {
    clientName,
    clientEmail,
    notes: sanitizeString(input.notes, 5000) || null,
    packageId,
    addOnIds,
    localizedLanguages,
    localizedTitles,
    localizedRegionGuidelines:
      sanitizeString(input.localizedRegionGuidelines, 5000) || null,
    packageFontInfo: sanitizeString(input.packageFontInfo, 5000) || null,
    uploadedFiles,
    uploadedFontFiles,
  };
}

function makePublicOrderId(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FR-${random}`;
}



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validatePayload(body);

    const localizedCount = input.addOnIds.includes("localized")
      ? Math.max(1, input.localizedLanguages.length || 1)
      : 1;

    const pricing = calculatePricing({
      packageId: input.packageId,
      addOnIds: input.addOnIds,
      localizedLanguageCount: localizedCount,
    });

    const supabase = createSupabaseAdminClient();

    const rowToInsert = {
      public_order_id: makePublicOrderId(),
      client_name: input.clientName,
      client_email: input.clientEmail,
      notes: input.notes,

      package_id: input.packageId,
      package_name: pricing.packageName,

      add_on_ids: input.addOnIds,
      add_on_labels: input.addOnIds.map((id) => ADD_ON_CONFIG[id].label),

      localized_languages: input.localizedLanguages,
      localized_titles: input.localizedTitles,
      localized_region_guidelines: input.localizedRegionGuidelines,

      package_font_info: input.packageFontInfo,

      uploaded_files: input.uploadedFiles,
      uploaded_font_files: input.uploadedFontFiles,

      subtotal_cents: pricing.subtotalCents,
      total_cents: pricing.totalCents,
      currency: pricing.currency,

      payment_status: "unpaid",
      order_status: "awaiting_payment",
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(rowToInsert)
      .select("*")
      .single();

    if (error) {
      console.error("orders.insert failed", error);
      return NextResponse.json(
        { error: "Failed to create order." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        order: data as OrderRow,
        pricing,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const supabase = createSupabaseAdminClient();

    if (!body.orderId) {
      return NextResponse.json(
        { error: "orderId is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("orders")
      .update({
        client_name: body.clientName,
        client_email: body.clientEmail,
        notes: body.notes,

        localized_languages: body.localizedLanguages,
        localized_titles: body.localizedTitles,
        localized_region_guidelines: body.localizedRegionGuidelines,
        package_font_info: body.packageFontInfo,

        uploaded_files: body.uploadedFiles || [],
        uploaded_font_files: body.uploadedFontFiles || [],

        order_status: "awaiting_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.orderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update order." },
      { status: 500 }
    );
  }
}