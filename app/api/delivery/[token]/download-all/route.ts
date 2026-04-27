import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UploadedFileRecord } from "@/types/order";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("delivery_token", token)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    const deliveryFiles: UploadedFileRecord[] = Array.isArray(order.delivery_files)
      ? (order.delivery_files as UploadedFileRecord[])
      : [];

    if (deliveryFiles.length === 0) {
      return NextResponse.json({ error: "No delivery files found." }, { status: 400 });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    const archiveDone = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    for (const file of deliveryFiles) {
      if (!file.bucket || !file.path) continue;

      const { data, error: downloadError } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (downloadError || !data) {
        continue;
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      archive.append(buffer, {
        name: file.fileName || file.path.split("/").pop() || "file",
      });
    }

    await archive.finalize();
    const zipBuffer = await archiveDone;

    const orderLabel = order.public_order_id || order.id || "delivery";

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${orderLabel}-delivery.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to build ZIP.",
      },
      { status: 500 }
    );
  }
}