import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UploadedFileRecord } from "@/types/order";

type PaymentSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes) return "";
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const { order: orderId } = await searchParams;

  const supabase = createSupabaseAdminClient();

  const { data: order } = orderId
    ? await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle()
    : { data: null };

  const orderNumber = order?.public_order_id || order?.id || "Your order";
  const uploadedFiles: UploadedFileRecord[] = Array.isArray(order?.uploaded_files)
  ? (order.uploaded_files as UploadedFileRecord[])
  : [];

const uploadedFilesWithUrls = await Promise.all(
  uploadedFiles.map(async (file) => {
    if (!file.bucket || !file.path) {
      return { ...file, signedUrl: null };
    }

    const { data } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 60 * 60);

    return {
      ...file,
      signedUrl: data?.signedUrl || null,
    };
  })
);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-2">
        </div>

        <div className="rounded-3xl border border-emerald-400/20 bg-slate-900 p-5 shadow-2xl">
          
          <div className="mb-4 flex items-center justify-between">
  {/* Left: Checkmark */}
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300">
    ✓
  </div>

  {/* Right: Logo + Text */}
  <div className="flex items-center gap-3">
    <img
      src="/frameready-logo.png"
      alt="FrameReady logo"
      className="h-7 w-auto opacity-95"
    />
    <span className="text-base font-semibold tracking-tight text-white">
      FrameReady
    </span>
  </div>
</div>

          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">
            Payment successful
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Your order has been received
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Thanks — your payment was successful and your artwork order is now
            in the FrameReady queue.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Order number
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {orderNumber}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Package
              </p>
              <p className="mt-2 text-base font-medium text-white">
                {order?.package_name || "FrameReady package"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-base font-medium text-emerald-300">
                Paid / In queue
              </p>
            </div>
          </div>
          {order.add_on_labels?.length > 0 && (
  <div className="mt-6 rounded-2xl border border-white/6 bg-black/20 p-6">
    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">
      Add-ons ordered
    </p>

    <div className="flex flex-wrap gap-3">
      {order.add_on_labels.map((addOn: string) => (
        <span
          key={addOn}
          className="rounded-full border border-white/6 bg-white/[0.03] px-4 py-2 text-sm text-slate-200"
        >
          {addOn}
        </span>
      ))}
    </div>
  </div>
)}

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-base font-medium text-white">
                  What happens next?
                </h2>

                <div className="mt-3 space-y-3 text-[13px] text-slate-300">
                  <div>
                    <p className="font-medium text-white">
                      1. We review your files
                    </p>
                    <p className="mt-1">
                      Your artwork will be checked for resolution, formatting,
                      safe zones, and platform QC issues.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      2. We prepare your artwork package
                    </p>
                    <p className="mt-1">
                      We’ll format your approved assets into the required
                      platform-ready delivery sizes.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      3. You’ll receive a delivery link
                    </p>
                    <p className="mt-1">
                      Once complete, we’ll email you a secure delivery page with
                      your final files and download options.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-base font-medium text-white">
                  Uploaded files
                </h2>

                {uploadedFilesWithUrls.length > 0 ? (
  <div className="mt-3 space-y-2">
    {uploadedFilesWithUrls.map((file) => (
      <div
        key={file.path || file.fileName || "uploaded-file"}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3"
      >
        {file.signedUrl && file.mimeType?.startsWith("image/") ? (
          <img
            src={file.signedUrl}
            alt={file.fileName || file.path || "Uploaded file"}
            className="h-12 w-12 rounded-lg border border-white/10 bg-slate-800 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-xs text-slate-400">
            File
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {file.fileName || file.path}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {file.mimeType || "File"}
            {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ""}
          </p>
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="mt-3 text-sm text-slate-400">
    No uploaded files were found on this order.
  </p>
)}

              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-xs text-slate-400">
            Save this order number for reference. If we need anything else,
            we’ll contact you using the email provided with your order.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/"
              className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Back to FrameReady
            </a>

            <a
              href={`mailto:admin@framereadystudio.com?subject=Order%20question%20-%20${encodeURIComponent(
                orderNumber
              )}`}
              className="inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}