import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

type DeleteDeliveryFileBody = {
  orderId?: string;
  filePath?: string;
};

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DeleteDeliveryFileBody;

    if (!body.orderId || !body.filePath) {
      return NextResponse.json(
        { error: "Missing orderId or filePath." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("delivery_files")
      .eq("id", body.orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const currentFiles = Array.isArray(order.delivery_files)
      ? order.delivery_files
      : [];

    const nextFiles = currentFiles.filter(
      (file: { path?: string }) => file.path !== body.filePath
    );

    const { error: storageError } = await supabase.storage
      .from("order-uploads")
      .remove([body.filePath]);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        delivery_files: nextFiles,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deliveryFiles: nextFiles });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete delivery file." },
      { status: 500 }
    );
  }
}