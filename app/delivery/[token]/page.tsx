import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UploadedFileRecord } from "@/types/order";
import DeliveryRevisionForm from "@/components/DeliveryRevisionForm";
import DeliveryArtworkGrid from "@/components/DeliveryArtworkGrid";

type DeliveryPageProps = {
  params: Promise<{ token: string }>;
};

type DeliveryFileWithUrl = UploadedFileRecord & {
  signedUrl: string | null;
};

function labelFromFile(file: UploadedFileRecord): string {
  return file.fileName || file.path || "Download file";
}

export default async function DeliveryPage({ params }: DeliveryPageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("delivery_token", token)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ minHeight: "100vh", background: "#020617", color: "white", padding: "40px" }}>
        <h1>Delivery page error</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  if (!order) {
    notFound();
  }

  const deliveryFiles =
  Array.isArray(order.revision_delivery_files) &&
  order.revision_delivery_files.length > 0
    ? order.revision_delivery_files
    : Array.isArray(order.delivery_files)
    ? order.delivery_files
    : [];

  const deliveryFilesWithUrls: DeliveryFileWithUrl[] = await Promise.all(
  deliveryFiles.map(async (file: UploadedFileRecord) => {
    if (!file.bucket || !file.path) {
      return { ...file, signedUrl: null };
    }

      const { data, error: signedUrlError } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 60 * 60);

      if (signedUrlError || !data?.signedUrl) {
        return { ...file, signedUrl: null };
      }

      return {
        ...file,
        signedUrl: data.signedUrl,
      };
    })
  );

  const imageFiles = deliveryFiles.filter(
  (file: UploadedFileRecord) => file.mimeType?.startsWith("image/")
);

const otherFiles = deliveryFiles.filter(
  (file: UploadedFileRecord) => !file.mimeType?.startsWith("image/")
);

  const orderLabel = order.public_order_id || order.id;
  const clientName = order.client_name || "Client";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
  <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="border-b border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-4">
            <div className="mb-6 flex items-center justify-between">

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
            
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              FrameReady Delivery
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Your artwork is ready
            </h1>
            
            <p className="mt-2 text-xs text-slate-300">
              {clientName} · Order {orderLabel}
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="mb-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Package</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {order.package_name || "FrameReady Delivery"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Delivered</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {order.delivered_at
                    ? new Date(order.delivered_at).toLocaleString()
                    : "Ready now"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Files</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {deliveryFilesWithUrls.length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-white">Delivered files</h2>

                <a
                  href={`/api/delivery/${token}/download-all`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Download all
                </a>
              </div>

              {deliveryFilesWithUrls.length > 0 ? (
  <div className="mt-4 space-y-6">

    {/* 🖼 Image Grid */}
{deliveryFilesWithUrls.some((file) => file.mimeType?.startsWith("image/")) && (
  <DeliveryArtworkGrid
    files={deliveryFilesWithUrls.filter((file) =>
      file.mimeType?.startsWith("image/")
    )}
  />
)}

    {/* 📁 Other Files */}
    {deliveryFilesWithUrls.some(file => !file.mimeType?.startsWith("image/")) && (
      <div>
        <h2 className="mb-2 text-sm font-medium text-white">
          Other files
        </h2>

        <div className="space-y-2">
          {deliveryFilesWithUrls
            .filter(file => !file.mimeType?.startsWith("image/"))
            .map((file: UploadedFileRecord) => (
              <div
                key={file.path}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2"
              >
                <p className="truncate text-sm text-white">
                  {labelFromFile(file)}
                </p>

                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    className="text-xs text-emerald-300 hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">
                    Unavailable
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    )}

  </div>
) : (
  <p className="text-sm text-slate-400">
    No delivery files are available yet.
  </p>
)}

              <p className="mt-3 text-xs text-slate-500">
                Download links refresh automatically if they expire.
              </p>
            </div>

return (

            <DeliveryRevisionForm
  token={token}
  revisionCount={Number(order.revision_count ?? 0)}
  revisionLimit={
  order.revision_limit != null
    ? Number(order.revision_limit)
    : order.package_id === "essential"
    ? 1
    : 2
}
  orderId={order.public_order_id || order.id}
  clientName={order.client_name || "Client"}
  clientEmail={order.client_email || ""}
/>

<div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
  You can also reply to the delivery email if you prefer.
</div>
          </div>
        </div>
      </div>
    </main>
  );
}