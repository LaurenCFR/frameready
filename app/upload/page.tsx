import Link from "next/link";
import ResumeCheckoutButton from "@/components/ResumeCheckoutButton";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UploadReturnPageProps = {
  searchParams: Promise<{
    checkout?: string;
    order?: string;
  }>;
};

export default async function UploadReturnPage({
  searchParams,
}: UploadReturnPageProps) {
  const { checkout, order: orderId } = await searchParams;
  const supabase = createSupabaseAdminClient();
  const { data: order } = orderId
    ? await supabase
        .from("orders")
        .select(
          "id, public_order_id, package_name, total_cents, currency, payment_status, order_status"
        )
        .eq("id", orderId)
        .maybeSingle()
    : { data: null };

  const canResume =
    order?.payment_status === "unpaid" &&
    order?.order_status === "awaiting_payment";
  const currency = (order?.currency || "usd").toUpperCase();
  const total = ((order?.total_cents || 0) / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          FrameReady checkout
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {checkout === "cancelled"
            ? "Your checkout was cancelled"
            : "Return to your checkout"}
        </h1>

        {canResume ? (
          <>
            <p className="mt-4 text-slate-300">
              Your existing order is saved. Continue when you are ready; no
              duplicate order will be created.
            </p>
            <dl className="my-6 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Order</dt>
                <dd className="font-medium text-white">
                  {order.public_order_id || order.id}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Package</dt>
                <dd className="text-right font-medium text-white">
                  {order.package_name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Total</dt>
                <dd className="font-medium text-white">
                  {total} {currency}
                </dd>
              </div>
            </dl>
            <ResumeCheckoutButton orderId={order.id} />
          </>
        ) : (
          <>
            <p className="mt-4 text-slate-300">
              This checkout link is unavailable or the order is no longer
              awaiting payment.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl border border-white/15 px-5 py-3 font-medium text-white hover:bg-white/5"
            >
              Return to FrameReady
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
