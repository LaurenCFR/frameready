import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("checker_submissions")
      .select(
        "id,name,email,project_title,file_name,file_type,file_size_bytes,width,height,selected_platforms,checker_results,recommended_assets,summary,created_at,followup_email_sent_at,followup_email_subject,followup_email_error,lead_status,lead_status_updated_at,lead_notes,review_requested_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("admin checker submissions fetch failed", error);
      return NextResponse.json(
        { error: "Failed to load checker leads." },
        { status: 500 }
      );
    }

    const submissions = data ?? [];
    const submissionIds = submissions.map((submission) => submission.id);

    const { data: reviewRequests, error: reviewRequestsError } =
      submissionIds.length > 0
        ? await supabase
            .from("checker_review_requests")
            .select(
              "id,checker_submission_id,uploaded_files,status,created_at,review_response_sent_at,review_response_subject"
            )
            .in("checker_submission_id", submissionIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };

    if (reviewRequestsError) {
      console.error("admin checker review requests fetch failed", reviewRequestsError);
      return NextResponse.json(
        { error: "Failed to load checker review requests." },
        { status: 500 }
      );
    }

    const signedReviewRequests = await Promise.all(
      (reviewRequests ?? []).map(async (request) => {
        const uploadedFiles = Array.isArray(request.uploaded_files)
          ? request.uploaded_files
          : [];

        const signedFiles = await Promise.all(
          uploadedFiles.map(async (file) => {
            if (!file?.bucket || !file?.path) {
              return { ...file, signedUrl: null };
            }

            try {
              const { data, error } = await supabase.storage
                .from(file.bucket)
                .createSignedUrl(file.path, 60 * 30);

              return {
                ...file,
                signedUrl: error ? null : data?.signedUrl || null,
              };
            } catch (error) {
              console.error("checker review file signing failed", error);
              return { ...file, signedUrl: null };
            }
          })
        );

        return {
          ...request,
          uploaded_files: signedFiles,
        };
      })
    );

    const reviewRequestsBySubmission = new Map<string, typeof signedReviewRequests>();

    for (const request of signedReviewRequests) {
      const key = request.checker_submission_id;
      const existing = reviewRequestsBySubmission.get(key) ?? [];
      reviewRequestsBySubmission.set(key, [...existing, request]);
    }

    return NextResponse.json(
      {
        submissions: submissions.map((submission) => ({
          ...submission,
          reviewRequests: reviewRequestsBySubmission.get(submission.id) ?? [],
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("admin checker submissions route failed", error);
    return NextResponse.json(
      { error: "Unable to load checker leads." },
      { status: 500 }
    );
  }
}
