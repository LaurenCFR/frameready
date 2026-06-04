import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const REVIEW_STATUSES = [
  "pending_review",
  "review_in_progress",
  "response_sent",
  "converted",
  "closed",
] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];

type RouteContext = {
  params: Promise<{ reviewRequestId: string }>;
};

function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus)
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reviewRequestId } = await context.params;

  if (!reviewRequestId) {
    return NextResponse.json(
      { error: "Review request id is required." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const reviewStatus = body?.reviewStatus;

    if (!isReviewStatus(reviewStatus)) {
      return NextResponse.json(
        { error: "Select a valid review status." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("checker_review_requests")
      .update({ status: reviewStatus })
      .eq("id", reviewRequestId)
      .select(
        "id,checker_submission_id,uploaded_files,status,created_at,review_response_sent_at,review_response_subject"
      )
      .maybeSingle();

    if (error) {
      console.error("checker review status update failed", error);
      return NextResponse.json(
        { error: "Could not update review status." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Review request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ reviewRequest: data }, { status: 200 });
  } catch (error) {
    console.error("checker review status route failed", error);
    return NextResponse.json(
      { error: "Could not update review status." },
      { status: 500 }
    );
  }
}
