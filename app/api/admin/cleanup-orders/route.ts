import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function cleanupOrders() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();

  const draftCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const completedCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { error: deleteDraftsError } = await supabase
    .from("orders")
    .delete()
    .eq("order_status", "draft")
    .lt("created_at", draftCutoff.toISOString());

  if (deleteDraftsError) {
    throw new Error(`Draft cleanup failed: ${deleteDraftsError.message}`);
  }

  const { error: archiveCompletedError } = await supabase
    .from("orders")
    .update({
      order_status: "archived",
      updated_at: now.toISOString(),
    })
    .eq("order_status", "completed")
    .lt("updated_at", completedCutoff.toISOString());

  if (archiveCompletedError) {
    throw new Error(`Archive cleanup failed: ${archiveCompletedError.message}`);
  }

await supabase
  .from("system_events")
  .upsert({
    id: "orders_cleanup_last_run",
    value: {
      ranAt: now.toISOString(),
    },
    updated_at: now.toISOString(),
  });

  return { success: true };
}

export async function POST() {
  try {
    const result = await cleanupOrders();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}

// Optional: lets you test locally in browser.
export async function GET() {
  try {
    const result = await cleanupOrders();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}