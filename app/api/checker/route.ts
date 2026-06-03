import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_TEXT_LENGTH = 500;
const MAX_RESULTS = 25;
const MAX_ASSETS = 25;

function sanitizeString(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeEmail(value: unknown): string {
  return sanitizeString(value, 320).toLowerCase();
}

function sanitizeStringArray(value: unknown, maxItems = 20, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeJsonArray(value: unknown, maxItems: number): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems);
}

function sanitizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getObjectText(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  return typeof item === "string" ? item : "";
}

function renderListItems(items: unknown[], renderItem: (item: Record<string, unknown>) => string) {
  if (items.length === 0) {
    return `<li style="margin:8px 0;color:#94a3b8;">None captured in this report.</li>`;
  }

  return items
    .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? item : {}))
    .map((item) => renderItem(item as Record<string, unknown>))
    .join("");
}

async function sendCheckerReportEmail(params: {
  email: string;
  name: string | null;
  projectTitle: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  selectedPlatforms: string[];
  checkerResults: unknown[];
  recommendedAssets: unknown[];
}) {
  const fromEmail = process.env.DELIVERY_FROM_EMAIL;

  if (!process.env.RESEND_API_KEY || !fromEmail) {
    console.warn("Checker report email skipped: Resend is not configured.");
    return;
  }

  const dimensions =
    params.width && params.height ? `${params.width} x ${params.height}px` : "Not available";
  const platforms =
    params.selectedPlatforms.length > 0
      ? params.selectedPlatforms.map(escapeHtml).join(", ")
      : "None selected";
  const orderUrl = getSiteUrl();

  const resultItems = renderListItems(params.checkerResults, (item) => {
    const label = getObjectText(item, "label") || "Checker item";
    const severity = getObjectText(item, "severity") || "info";
    const message = getObjectText(item, "message");

    return `
      <li style="margin:12px 0;padding:12px;border:1px solid #334155;border-radius:12px;background:#020617;">
        <div style="font-weight:700;color:#f8fafc;">${escapeHtml(label)} <span style="color:#94a3b8;font-weight:400;">(${escapeHtml(severity)})</span></div>
        <div style="margin-top:6px;color:#cbd5e1;line-height:1.6;">${escapeHtml(message)}</div>
      </li>
    `;
  });

  const assetItems = renderListItems(params.recommendedAssets, (item) => {
    const label = getObjectText(item, "label") || "Recommended asset";
    const status = getObjectText(item, "status") || "recommended";
    const message = getObjectText(item, "message");

    return `
      <li style="margin:12px 0;padding:12px;border:1px solid #334155;border-radius:12px;background:#020617;">
        <div style="font-weight:700;color:#f8fafc;">${escapeHtml(label)} <span style="color:#94a3b8;font-weight:400;">(${escapeHtml(status)})</span></div>
        <div style="margin-top:6px;color:#cbd5e1;line-height:1.6;">${escapeHtml(message)}</div>
      </li>
    `;
  });

  const html = `
    <div style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;color:#e2e8f0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid #1e293b;">
                  <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">
                    FrameReady Checker
                  </div>
                  <div style="font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">
                    Your artwork checker report
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e2e8f0;">
                    Hi ${escapeHtml(params.name || "there")},
                  </p>

                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#cbd5e1;">
                    Here is a copy of your FrameReady artwork checker report. This automated checker did not store your artwork file, and FrameReady has not visually reviewed the artwork yet.
                  </p>

                  <div style="margin:24px 0;padding:18px;border:1px solid #334155;border-radius:12px;background:#020617;">
                    ${
                      params.projectTitle
                        ? `<p style="margin:0 0 10px;color:#cbd5e1;"><strong style="color:#f8fafc;">Project/title:</strong> ${escapeHtml(params.projectTitle)}</p>`
                        : ""
                    }
                    <p style="margin:0 0 10px;color:#cbd5e1;"><strong style="color:#f8fafc;">File:</strong> ${escapeHtml(params.fileName || "Not available")}</p>
                    <p style="margin:0 0 10px;color:#cbd5e1;"><strong style="color:#f8fafc;">Dimensions:</strong> ${escapeHtml(dimensions)}</p>
                    <p style="margin:0;color:#cbd5e1;"><strong style="color:#f8fafc;">Selected platforms:</strong> ${platforms}</p>
                  </div>

                  <h2 style="margin:28px 0 12px;font-size:18px;color:#f8fafc;">Checker result items</h2>
                  <ul style="margin:0;padding:0;list-style:none;">
                    ${resultItems}
                  </ul>

                  <h2 style="margin:28px 0 12px;font-size:18px;color:#f8fafc;">Recommended and missing assets</h2>
                  <ul style="margin:0;padding:0;list-style:none;">
                    ${assetItems}
                  </ul>

                  <p style="margin:28px 0 20px;font-size:15px;line-height:1.7;color:#cbd5e1;">
                    To have FrameReady visually review and fix the artwork, start an order and upload your artwork file.
                  </p>

                  <p style="margin:0 0 24px;">
                    <a href="${orderUrl}" style="display:inline-block;background:#f8fafc;color:#020617;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;">
                      Start a FrameReady order
                    </a>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:13px;">
                  FrameReady &middot; Professional artwork QC & formatting for streaming platforms
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const emailResult = await resend.emails.send({
    from: fromEmail,
    to: params.email,
    subject: "Your FrameReady artwork checker report",
    html,
  });

  if ((emailResult as { error?: { message?: string } | null }).error) {
    throw new Error(
      (emailResult as { error?: { message?: string } | null }).error?.message ||
        "Email send failed."
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const email = sanitizeEmail(body.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email before saving the report." },
        { status: 400 }
      );
    }

    const file = sanitizeObject(body.file);
    const dimensions = sanitizeObject(file.dimensions);

    const selectedPlatforms = sanitizeStringArray(body.selectedPlatforms);
    const checkerResults = sanitizeJsonArray(body.checkerResults, MAX_RESULTS);
    const recommendedAssets = sanitizeJsonArray(body.recommendedAssets, MAX_ASSETS);

    const row = {
      name: sanitizeString(body.name, 200) || null,
      email,
      project_title: sanitizeString(body.projectTitle, 300) || null,

      file_name: sanitizeString(file.fileName, 300) || null,
      file_type: sanitizeString(file.fileType, 160) || null,
      file_size_bytes: sanitizeNumber(file.fileSizeBytes),
      width: sanitizeNumber(dimensions.width),
      height: sanitizeNumber(dimensions.height),

      selected_platforms: selectedPlatforms,
      checker_results: checkerResults,
      recommended_assets: recommendedAssets,
      summary: sanitizeObject(body.summary),
    };

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("checker_submissions").insert(row);

    if (error) {
      console.error("checker_submissions insert failed", error);
      return NextResponse.json(
        { error: "Could not save the checker report right now." },
        { status: 500 }
      );
    }

    try {
      await sendCheckerReportEmail({
        email,
        name: row.name,
        projectTitle: row.project_title,
        fileName: row.file_name,
        width: row.width,
        height: row.height,
        selectedPlatforms,
        checkerResults,
        recommendedAssets,
      });
    } catch (emailError) {
      console.error("checker report email failed", emailError);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("checker report save failed", error);
    return NextResponse.json(
      { error: "Could not save the checker report right now." },
      { status: 500 }
    );
  }
}
