import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const orderId = formData.get("orderId") as string;

    if (!files?.length || !orderId) {
      return NextResponse.json(
        { error: "Missing files or orderId." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const uploadedFiles = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filePath = `deliveries/${new Date()
        .toISOString()
        .slice(0, 10)}/${crypto.randomUUID()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("order-uploads")
        .upload(filePath, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("order-uploads")
        .getPublicUrl(filePath);

      uploadedFiles.push({
        path: filePath,
        bucket: "order-uploads",
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        publicUrl: publicUrlData.publicUrl,
      });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 }
    );
  }
}