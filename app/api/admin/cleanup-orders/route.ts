import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { createAdminCleanupHandlers } from "@/lib/admin-cleanup-policy";

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

  return { success: true as const };
}

async function readCleanupStatus() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_events")
    .select("*")
    .eq("id", "orders_cleanup_last_run")
    .single();

  if (error || !data) {
    return { lastRun: null };
  }

  return { lastRun: data.value?.ranAt || data.updated_at || null };
}

const handlers = createAdminCleanupHandlers({
  authenticate: requireAdminSession,
  cleanup: cleanupOrders,
  readStatus: readCleanupStatus,
});

async function respond(action: () => Promise<{ body: unknown; status: number }>) {
  try {
    const result = await action();
    return NextResponse.json(result.body, { status: result.status });
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

export async function POST() {
  return respond(handlers.post);
}

export async function GET() {
  return respond(handlers.get);
}
