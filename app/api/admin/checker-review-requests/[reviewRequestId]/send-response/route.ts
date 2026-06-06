import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_REVIEW_SUBJECT = "Your FrameReady Artwork Review";
const resend = new Resend(process.env.RESEND_API_KEY);

type RouteContext = {
  params: Promise<{ reviewRequestId: string }>;
};

type ReviewRequestRow = {
  id: string;
  checker_submission_id?: string | null;
  status?: string | null;
  checker_submissions?:
    | {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        project_title?: string | null;
        lead_status?: string | null;
      }
    | Array<{
        id?: string | null;
        name?: string | null;
        email?: string | null;
        project_title?: string | null;
        lead_status?: string | null;
      }>
    | null;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSubmissionFromReviewRequest(reviewRequest: ReviewRequestRow) {
  const submission = reviewRequest.checker_submissions;
  return Array.isArray(submission) ? submission[0] : submission;
}

function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function sanitizeSubject(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_REVIEW_SUBJECT;
  const trimmed = value.trim().slice(0, 200);
  return trimmed || DEFAULT_REVIEW_SUBJECT;
}

function sanitizeMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 10000);
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const subject = sanitizeSubject(body?.subject);
    const message = sanitizeMessage(body?.message);

    if (!message) {
      return NextResponse.json(
        { error: "Write a review response before sending." },
        { status: 400 }
      );
    }

    const fromEmail = process.env.DELIVERY_FROM_EMAIL;

    if (!process.env.RESEND_API_KEY || !fromEmail) {
      return NextResponse.json(
        { error: "Resend email is not configured." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: reviewRequest, error: fetchError } = await supabase
      .from("checker_review_requests")
      .select(
        "id,checker_submission_id,status,checker_submissions(id,name,email,project_title,lead_status)"
      )
      .eq("id", reviewRequestId)
      .maybeSingle();

    if (fetchError) {
      console.error("checker review response fetch failed", fetchError);
      return NextResponse.json(
        { error: "Could not load review request." },
        { status: 500 }
      );
    }

    if (!reviewRequest) {
      return NextResponse.json(
        { error: "Review request not found." },
        { status: 404 }
      );
    }

    const submission = getSubmissionFromReviewRequest(
      reviewRequest as ReviewRequestRow
    );
    const email = String(submission?.email || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Checker lead does not have an email address." },
        { status: 400 }
      );
    }

    const html = `
      <div style="font-family:Arial,sans-serif;background:#020617;color:#e2e8f0;padding:28px;">
        <div style="max-width:680px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:18px;padding:28px;">
          <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(subject)}</h1>
          <div style="font-size:16px;line-height:1.7;color:#e2e8f0;">${plainTextToHtml(message)}</div>
        </div>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject,
      text: message,
      html,
    });

    const resendError = (emailResult as { error?: { message?: string } | null })
      .error;

    if (resendError) {
      throw new Error(resendError.message || "Email send failed.");
    }

    const sentAt = new Date().toISOString();
    const { data: updatedReviewRequest, error: updateError } = await supabase
      .from("checker_review_requests")
      .update({
        status: "response_sent",
        review_response_sent_at: sentAt,
        review_response_subject: subject,
      })
      .eq("id", reviewRequestId)
      .select(
        "id,checker_submission_id,uploaded_files,status,created_at,review_response_sent_at,review_response_subject"
      )
      .maybeSingle();

    if (updateError) {
      console.error("checker review response tracking failed", updateError);
      return NextResponse.json(
        { error: "Email sent, but review response status could not be saved." },
        { status: 500 }
      );
    }

    if (submission?.id && submission.lead_status === "new") {
      const { error: leadStatusError } = await supabase
        .from("checker_submissions")
        .update({
          lead_status: "contacted",
          lead_status_updated_at: sentAt,
        })
        .eq("id", submission.id);

      if (leadStatusError) {
        console.error(
          "checker review response lead status update failed",
          leadStatusError
        );
      }
    }

    return NextResponse.json(
      { success: true, reviewRequest: updatedReviewRequest },
      { status: 200 }
    );
  } catch (error) {
    console.error("checker review response send failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send review response.",
      },
      { status: 500 }
    );
  }
}
