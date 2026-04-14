import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type UpdateOrderBody = {
  id: string;
  updates: {
    status?: string;
    notes?: string;
  };
};

function mapUiStatusToDbStatus(status: string): string {
  switch (status) {
    case "Awaiting Payment":
      return "awaiting_payment";
    case "Paid":
      return "paid";
    case "Files Received":
      return "files_received";
    case "In Progress":
      return "in_progress";
    case "Ready for Delivery":
      return "ready_for_delivery";
    case "Revision Requested":
      return "revision_requested";
    case "Completed":
      return "completed";
    default:
      return "files_received";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateOrderBody;
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing order id." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // admin UI uses public_order_id like FR-XXXXXX, so update by that
    const dbUpdates: Record<string, unknown> = {};

    if (typeof updates.status === "string") {
  dbUpdates.order_status = mapUiStatusToDbStatus(updates.status);

  if (
    [
      "Paid",
      "Files Received",
      "In Progress",
      "Ready for Delivery",
      "Completed",
      "Revision Requested",
    ].includes(updates.status)
  ) {
    dbUpdates.payment_status = "paid";
  }

  if (updates.status === "Awaiting Payment") {
    dbUpdates.payment_status = "unpaid";
  }
}

    if (typeof updates.notes === "string") {
      dbUpdates.notes = updates.notes;
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update(dbUpdates)
      .eq("public_order_id", id)
      .select("id, public_order_id, order_status, payment_status, notes")
      .single();

    if (error) {
      console.error("update-order failed", error);
      return NextResponse.json(
        { error: "Failed to update order." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: data }, { status: 200 });
  } catch (error) {
    console.error("update-order route error", error);
    return NextResponse.json(
      { error: "Unable to update order." },
      { status: 500 }
    );
  }
}