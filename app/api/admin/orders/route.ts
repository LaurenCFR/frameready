import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ORDER_STATUS_LABELS, type OrderRow } from "@/types/order";

export const runtime = "nodejs";

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getTurnaround(status: OrderStatus): string {
  switch (status) {
    case "draft":
    case "awaiting_payment":
      return "Pending";

    case "paid":
    case "files_received":
      return "Queued";

    case "in_progress":
    case "revision_requested":
      return "In Progress";

    case "ready_for_delivery":
      return "Ready for Delivery";

    case "completed":
      return "Delivered";

    case "cancelled":
      return "Cancelled";

    default:
      return "Pending";
  }
}

function mapOrderStatus(order: OrderRow): string {
  return ORDER_STATUS_LABELS[order.order_status] ?? "Unknown";
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("admin orders fetch failed", error);
      return NextResponse.json(
        { error: "Failed to load admin orders." },
        { status: 500 }
      );
    }

    const orders = ((data ?? []) as OrderRow[]).map((order) => ({
      id: order.public_order_id || order.id,
      dbId: order.id,
      clientName: order.client_name || "Unknown Client",
      clientEmail: order.client_email || "",
      packageName: order.package_name,
      total: (order.total_cents ?? 0) / 100,
      status: mapOrderStatus(order),
      paid: order.payment_status === "paid",
      turnaround: getTurnaround(order.order_status),
      submittedAt: formatSubmittedAt(order.created_at),
      languages: order.localized_languages || [],
      addOns: order.add_on_labels || [],
      sourceFiles: order.uploaded_files || [],
      deliveryFiles: [],
      notes: order.notes || "",
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
    }));

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("admin orders route failed", error);
    return NextResponse.json(
      { error: "Unable to load admin orders." },
      { status: 500 }
    );
  }
}