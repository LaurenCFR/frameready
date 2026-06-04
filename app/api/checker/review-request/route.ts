import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const REVIEW_BUCKET = "review-requests";
const MAX_REVIEW_FILES = 5;
const MAX_REVIEW_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "tif", "tiff", "psd", "zip"]);

type UploadedReviewFile = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeEmail(value: unknown): string {
  return sanitizeString(value, 320).toLowerCase();
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function makeUniqueSafeFileName(fileName: string, index: number): string {
  const safeName = sanitizeSegment(fileName) || `file-${index + 1}`;
  const extension = getExtension(safeName);
  const baseName = extension ? safeName.slice(0, -(extension.length + 1)) : safeName;
  const suffix = `${index + 1}`.padStart(2, "0");

  return extension
    ? `${baseName || "file"}-${suffix}.${extension}`
    : `${safeName}-${suffix}`;
}

function validateReviewFile(file: File): string | null {
  const extension = getExtension(file.name);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `${file.name} is not an accepted review file type.`;
  }

  if (file.size > MAX_REVIEW_FILE_SIZE_BYTES) {
    return `${file.name} is over the 25 MB review upload limit.`;
  }

  return null;
}

export async function POST(request: Request) {
  let reviewRequestId = "";

  try {
    const formData = await request.formData();
    const submissionId = sanitizeString(formData.get("submissionId"), 100);
    const email = sanitizeEmail(formData.get("email"));
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!submissionId || !email) {
      return NextResponse.json(
        { error: "Save the checker report before requesting a review." },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Upload at least one artwork file for review." },
        { status: 400 }
      );
    }

    if (files.length > MAX_REVIEW_FILES) {
      return NextResponse.json(
        { error: `Upload up to ${MAX_REVIEW_FILES} files for a free review.` },
        { status: 400 }
      );
    }

    const invalidFile = files
      .map((file) => validateReviewFile(file))
      .find((message): message is string => Boolean(message));

    if (invalidFile) {
      return NextResponse.json({ error: invalidFile }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: submission, error: fetchError } = await supabase
      .from("checker_submissions")
      .select("id,email,lead_status")
      .eq("id", submissionId)
      .maybeSingle();

    if (fetchError) {
      console.error("checker review request fetch failed", fetchError);
      return NextResponse.json(
        { error: "Could not request a review right now." },
        { status: 500 }
      );
    }

    if (!submission || String(submission.email || "").toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Save the checker report before requesting a review." },
        { status: 404 }
      );
    }

    const { data: reviewRequest, error: insertError } = await supabase
      .from("checker_review_requests")
      .insert({
        checker_submission_id: submissionId,
        uploaded_files: [],
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !reviewRequest?.id) {
      console.error("checker review request insert failed", insertError);
      return NextResponse.json(
        { error: "Could not create a review request right now." },
        { status: 500 }
      );
    }

    reviewRequestId = reviewRequest.id;
    const uploadedFiles: UploadedReviewFile[] = [];

    for (const [index, file] of files.entries()) {
      const safeFileName = makeUniqueSafeFileName(file.name, index);
      const path = `${submissionId}/${reviewRequest.id}/${safeFileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(REVIEW_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("checker review request upload failed", {
          reviewRequestId,
          fileName: file.name,
          error: uploadError,
        });
        return NextResponse.json(
          { error: `Could not upload ${file.name}. Please try again.` },
          { status: 500 }
        );
      }

      uploadedFiles.push({
        bucket: REVIEW_BUCKET,
        path,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    }

    const { error: requestUpdateError } = await supabase
      .from("checker_review_requests")
      .update({ uploaded_files: uploadedFiles })
      .eq("id", reviewRequest.id);

    if (requestUpdateError) {
      console.error("checker review request file metadata update failed", {
        reviewRequestId,
        error: requestUpdateError,
      });
      return NextResponse.json(
        { error: "Files uploaded, but the review request could not be finalized." },
        { status: 500 }
      );
    }

    const requestedAt = new Date().toISOString();
    const shouldMarkInterested = ["new", "contacted"].includes(
      String(submission.lead_status || "new")
    );

    const { error: submissionUpdateError } = await supabase
      .from("checker_submissions")
      .update({
        review_requested_at: requestedAt,
        ...(shouldMarkInterested
          ? {
              lead_status: "interested",
              lead_status_updated_at: requestedAt,
            }
          : {}),
      })
      .eq("id", submissionId);

    if (submissionUpdateError) {
      console.error("checker review request submission update failed", {
        reviewRequestId,
        error: submissionUpdateError,
      });
      return NextResponse.json(
        { error: "Files uploaded, but the checker lead could not be updated." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reviewRequestId: reviewRequest.id,
        reviewRequestedAt: requestedAt,
        files: uploadedFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("checker review request route failed", {
      reviewRequestId,
      error,
    });
    return NextResponse.json(
      { error: "Could not request a review right now." },
      { status: 500 }
    );
  }
}
