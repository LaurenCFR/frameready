import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { createAdminCleanupHandlers } from "@/lib/admin-cleanup-policy";
import { cleanupOrders } from "@/lib/order-cleanup";

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
