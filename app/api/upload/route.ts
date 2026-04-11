import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UploadedFileRecord } from "@/types/order";

const BUCKET = "order-uploads";

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeStoragePath(kind: "artwork" | "font", fileName: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 10);
  const safeName = sanitizeSegment(fileName) || "file";

  return `${kind}/${yyyy}/${mm}/${dd}/${random}-${safeName}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    const kindValue = formData.get("kind");
    const kind = kindValue === "font" ? "font" : "artwork";

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const uploaded: UploadedFileRecord[] = [];

    for (const entry of files) {
      if (!(entry instanceof File)) continue;

      const arrayBuffer = await entry.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const path = makeStoragePath(kind, entry.name);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: entry.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        console.error("storage.upload failed", error);
        return NextResponse.json(
          { error: `Failed to upload ${entry.name}.` },
          { status: 500 }
        );
      }

      uploaded.push({
        path,
        bucket: BUCKET,
        fileName: entry.name,
        mimeType: entry.type || "application/octet-stream",
        sizeBytes: entry.size,
        publicUrl: null,
      });
    }

    return NextResponse.json({ files: uploaded }, { status: 200 });
  } catch (error) {
    console.error("upload route failed", error);
    return NextResponse.json(
      { error: "Unable to upload files." },
      { status: 500 }
    );
  }
}