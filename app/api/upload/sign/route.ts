import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "order-uploads";

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeStoragePath(
  kind: "artwork" | "font",
  fileName: string,
  orderNumber: string
): string {
  const random = Math.random().toString(36).slice(2, 10);
  const safeName = sanitizeSegment(fileName) || "file";
  const safeOrderNumber = sanitizeSegment(orderNumber) || "unknown-order";
  const folder = kind === "font" ? "fonts" : "source";

  return `orders/${safeOrderNumber}/${folder}/${random}-${safeName}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabase = createSupabaseAdminClient();

    const kind = body.kind as "artwork" | "font";
    const orderNumber = String(body.orderNumber || "unknown-order");
    const files = Array.isArray(body.files) ? body.files : [];

    if (!kind || !["artwork", "font"].includes(kind)) {
      return NextResponse.json({ error: "Invalid upload kind." }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const signedUploads = await Promise.all(
      files.map(async (file: { fileName: string; mimeType?: string; sizeBytes?: number }) => {
        const path = makeStoragePath(kind, file.fileName, orderNumber);

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUploadUrl(path);

        if (error || !data) {
          throw new Error(error?.message || "Could not create signed upload URL.");
        }

        return {
          bucket: BUCKET,
          path,
          token: data.token,
          signedUrl: data.signedUrl,
          fileName: file.fileName,
          mimeType: file.mimeType || null,
          sizeBytes: file.sizeBytes || 0,
          publicUrl: null,
        };
      })
    );

    return NextResponse.json({ files: signedUploads });
  } catch (error) {
    console.error("signed upload creation failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create signed upload URLs.",
      },
      { status: 500 }
    );
  }
}