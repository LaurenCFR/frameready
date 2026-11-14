import { NextResponse } from "next/server";
import { createCronCleanupHandler } from "@/lib/cron-cleanup-policy";
import { cleanupOrders } from "@/lib/order-cleanup";

const handleCronCleanup = createCronCleanupHandler({
  getSecret: () => process.env.CRON_SECRET,
  cleanup: cleanupOrders,
});

export async function GET(request: Request) {
  try {
    const result = await handleCronCleanup(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cleanup failed.",
      },
      { status: 500 }
    );
  }
}
