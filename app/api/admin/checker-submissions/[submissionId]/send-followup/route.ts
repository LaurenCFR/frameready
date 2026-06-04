import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const FOLLOWUP_SUBJECT = "Can FrameReady help fix your artwork?";
const resend = new Resend(process.env.RESEND_API_KEY);

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function trackFollowupError(
  submissionId: string,
  errorMessage: string
) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("checker_submissions")
      .update({ followup_email_error: errorMessage.slice(0, 1000) })
      .eq("id", submissionId);
  } catch (error) {
    console.error("checker followup error tracking failed", error);
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await context.params;

  if (!submissionId) {
    return NextResponse.json(
      { error: "Checker submission id is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: submission, error: fetchError } = await supabase
      .from("checker_submissions")
      .select("id,name,email,project_title,lead_status")
      .eq("id", submissionId)
      .maybeSingle();

    if (fetchError) {
      console.error("checker followup fetch failed", fetchError);
      return NextResponse.json(
        { error: "Could not load checker lead." },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { error: "Checker lead not found." },
        { status: 404 }
      );
    }

    const email = String(submission.email || "").trim();

    if (!email) {
      const message = "Checker lead does not have an email address.";
      await trackFollowupError(submissionId, message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const fromEmail = process.env.DELIVERY_FROM_EMAIL;

    if (!process.env.RESEND_API_KEY || !fromEmail) {
      const message = "Resend email is not configured.";
      await trackFollowupError(submissionId, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const name = String(submission.name || "").trim() || "there";
    const siteUrl = getSiteUrl();
    const text = `Hi ${name},

Thanks for using the FrameReady Artwork Checker.

Your checker report showed a few items that may need review before delivery to platforms such as Filmhub, Amazon, Apple TV, Roku, Tubi, YouTube, and FAST channels.

FrameReady provides professional artwork QC, formatting, safe-zone review, platform-ready exports, and delivery package preparation.

If you'd like us to review and prepare the artwork, you can start an order here:

${siteUrl}

Please note that the checker does not store your artwork file, so you'll need to upload the artwork when placing an order.

Best regards,
FrameReady`;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#020617;color:#e2e8f0;padding:28px;">
        <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:18px;padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Thanks for using the FrameReady Artwork Checker.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Your checker report showed a few items that may need review before delivery to platforms such as Filmhub, Amazon, Apple TV, Roku, Tubi, YouTube, and FAST channels.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">FrameReady provides professional artwork QC, formatting, safe-zone review, platform-ready exports, and delivery package preparation.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">If you'd like us to review and prepare the artwork, you can start an order here:</p>
          <p style="margin:0 0 20px;">
            <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#67e8f9;color:#020617;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">Start a FrameReady order</a>
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#cbd5e1;">Please note that the checker does not store your artwork file, so you'll need to upload the artwork when placing an order.</p>
          <p style="margin:24px 0 0;font-size:16px;line-height:1.7;">Best regards,<br />FrameReady</p>
        </div>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: FOLLOWUP_SUBJECT,
      text,
      html,
    });

    const resendError = (emailResult as { error?: { message?: string } | null })
      .error;

    if (resendError) {
      throw new Error(resendError.message || "Email send failed.");
    }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from("checker_submissions")
      .update({
        followup_email_sent_at: new Date().toISOString(),
        followup_email_subject: FOLLOWUP_SUBJECT,
        followup_email_error: null,
        ...(submission.lead_status === "new"
          ? {
              lead_status: "contacted",
              lead_status_updated_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", submissionId)
      .select(
        "id,followup_email_sent_at,followup_email_subject,followup_email_error,lead_status,lead_status_updated_at,lead_notes"
      )
      .single();

    if (updateError) {
      console.error("checker followup tracking update failed", updateError);
      return NextResponse.json(
        { error: "Email sent, but follow-up status could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, submission: updatedSubmission },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send follow-up email.";
    console.error("checker followup send failed", error);
    await trackFollowupError(submissionId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
