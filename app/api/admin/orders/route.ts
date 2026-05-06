import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import type { OrderRow, OrderStatus } from "@/types/order";

export const runtime = "nodejs";

function formatSubmittedAt(iso?: string | null): string {
  if (!iso) return "";

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
    case "priority_revision_requested":
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

export async function GET() {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.log("RAW ADMIN ORDER:", data?.[0]);

    const orders = await Promise.all(
      ((data ?? []) as OrderRow[]).map(async (order) => {
        const sourceFiles = await Promise.all(
          ((order.uploaded_files || []) as any[]).map(async (file) => {
            if (!file?.bucket || !file?.path) {
              return {
                ...file,
                signedUrl: null,
              };
            }

            try {
              const { data } = await supabase.storage
                .from(file.bucket)
                .createSignedUrl(file.path, 60 * 60);

              return {
                ...file,
                signedUrl: data?.signedUrl || null,
              };
            } catch (error) {
              console.error("Failed to sign source file", file.path, error);

              return {
                ...file,
                signedUrl: null,
              };
            }
          })
        );

        return {
          id: order.public_order_id || order.id,
          dbId: order.id,
          clientName: order.client_name || "Unknown Client",
          clientEmail: order.client_email || "",
          packageName: order.package_name,
          total: (order.total_cents ?? 0) / 100,
          status: order.order_status,
          paid: order.payment_status === "paid",
          turnaround: getTurnaround(order.order_status),
          submittedAt: formatSubmittedAt(order.created_at),
          languages: order.localized_languages || [],
          addOns: order.add_on_labels || [],
          sourceFiles,
          deliveryFiles: await Promise.all(
  ((order.delivery_files || []) as any[]).map(async (file) => {
    if (!file?.bucket || !file?.path) {
      return {
        ...file,
        signedUrl: null,
      };
    }

    try {
      const { data } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60);

      return {
        ...file,
        signedUrl: data?.signedUrl || null,
      };
    } catch (error) {
      console.error("Failed to sign delivery file", file.path, error);

      return {
        ...file,
        signedUrl: null,
      };
    }
  })
),

revisionDeliveryFiles: await Promise.all(
  (order.revision_delivery_files || []).map(async (file) => {
    try {
      const { data } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60);

      return {
        ...file,
        signedUrl: data?.signedUrl || null,
      };
    } catch {
      return {
        ...file,
        signedUrl: null,
      };
    }
  })
),

          localizedLanguages: order.localized_languages || [],
          localizedTitles: order.localized_titles || {},
          regionGuidelines: order.localized_region_guidelines || "",
          packageFontInfo: order.package_font_info || "",
          fontFiles: await Promise.all(
  (order.uploaded_font_files || []).map(async (file) => {
    try {
      const { data } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60);

      return {
        ...file,
        signedUrl: data?.signedUrl || null,
      };
    } catch (error) {
      console.error("Failed to sign font file", file.path, error);

      return {
        ...file,
        signedUrl: null,
      };
    }
  })
),
          notes: order.notes || "",
          paymentStatus: order.payment_status,
          orderStatus: order.order_status,
          deliveredAt: order.delivered_at || "",
          deliveredBy: order.delivered_by || "",
          deliveryEmailSentAt: order.delivery_email_sent_at || "",
          deliveryStatus: order.delivery_status || "not_sent",
          revisionRequestedAt: order.revision_requested_at || "",
          revisionRequestMessage: order.revision_request_message || "",
          revisionCount: order.revision_count ?? 0,
          revisionLimit: order.revision_limit ?? 1,
          revisionEmailSentAt: order.revision_email_sent_at || "",
        };
      })
    );

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("admin orders route failed", error);
    return NextResponse.json(
      { error: "Unable to load admin orders." },
      { status: 500 }
    );
  }
}