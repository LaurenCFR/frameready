import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { executeOrderCleanup } from "@/lib/order-cleanup-policy";

export async function cleanupOrders(now = new Date()) {
  const supabase = createSupabaseAdminClient();

  return executeOrderCleanup(
    {
      async deleteDraftsBefore(cutoff) {
        const { error } = await supabase
          .from("orders")
          .delete()
          .eq("order_status", "draft")
          .lt("created_at", cutoff.toISOString());

        if (error) {
          throw new Error(`Draft cleanup failed: ${error.message}`);
        }
      },

      async archiveCompletedBefore(cutoff, archivedAt) {
        const { error } = await supabase
          .from("orders")
          .update({
            order_status: "archived",
            updated_at: archivedAt.toISOString(),
          })
          .eq("order_status", "completed")
          .lt("updated_at", cutoff.toISOString());

        if (error) {
          throw new Error(`Archive cleanup failed: ${error.message}`);
        }
      },

      async recordRun(ranAt) {
        const { error } = await supabase.from("system_events").upsert({
          id: "orders_cleanup_last_run",
          value: {
            ranAt: ranAt.toISOString(),
          },
          updated_at: ranAt.toISOString(),
        });

        if (error) {
          throw new Error(`Cleanup status update failed: ${error.message}`);
        }
      },
    },
    now
  );
}
