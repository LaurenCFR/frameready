import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("system_events")
    .select("*")
    .eq("id", "orders_cleanup_last_run")
    .single();

  if (error || !data) {
    return NextResponse.json({ lastRun: null });
  }

  return NextResponse.json({
    lastRun: data.value?.ranAt || data.updated_at || null,
  });
}