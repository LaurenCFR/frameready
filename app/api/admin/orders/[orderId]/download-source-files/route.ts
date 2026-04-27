import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const files = order.uploaded_files || [];

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No source files found." },
        { status: 400 }
      );
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    const archiveDone = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    for (const file of files) {
      if (!file.bucket || !file.path) continue;

      const { data, error: downloadError } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (downloadError || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());

      archive.append(buffer, {
        name: file.fileName || file.path.split("/").pop() || "file",
      });
    }

    await archive.finalize();
    const zipBuffer = await archiveDone;

    const orderLabel = order.public_order_id || orderId;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${orderLabel}-source-files.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Download source files failed", error);

    return NextResponse.json(
      { error: "Failed to download source files." },
      { status: 500 }
    );
  }
}