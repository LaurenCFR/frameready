import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow } from "@/types/order";

export const runtime = "nodejs";

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getTurnaround(orderStatus: string): string {
  switch (orderStatus) {
    case "paid":
      return "Ready to begin";
    case "files_received":
      return "Queued";
    case "in_progress":
      return "In progress";
    case "ready_for_delivery":
      return "Ready to deliver";
    case "revision_requested":
      return "Client revision needed";
    case "completed":
      return "Completed";
    case "awaiting_payment":
      return "Awaiting payment";
    default:
      return "Pending";
  }
}

function mapOrderStatus(order: OrderRow): string {
  switch (order.order_status) {
    case "awaiting_payment":
      return "Awaiting Payment";
    case "paid":
      return "Paid";
    case "files_received":
      return "Files Received";
    case "in_progress":
      return "In Progress";
    case "ready_for_delivery":
      return "Ready for Delivery";
    case "revision_requested":
      return "Revision Requested";
    case "completed":
      return "Completed";
    default:
      return order.order_status;
  }
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
      total: order.total_cents / 100,
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