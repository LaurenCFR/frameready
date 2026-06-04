import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const LEAD_STATUSES = ["new", "contacted", "interested", "converted", "closed"] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus);
}

function sanitizeNotes(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 5000);
  return trimmed || null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const body = await request.json();
    const leadStatus = body?.leadStatus;

    if (!isLeadStatus(leadStatus)) {
      return NextResponse.json(
        { error: "Select a valid lead status." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("checker_submissions")
      .update({
        lead_status: leadStatus,
        lead_status_updated_at: updatedAt,
        lead_notes: sanitizeNotes(body?.leadNotes),
      })
      .eq("id", submissionId)
      .select("id,lead_status,lead_status_updated_at,lead_notes")
      .maybeSingle();

    if (error) {
      console.error("checker lead status update failed", error);
      return NextResponse.json(
        { error: "Could not update lead status." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Checker lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ submission: data }, { status: 200 });
  } catch (error) {
    console.error("checker lead status route failed", error);
    return NextResponse.json(
      { error: "Could not update lead status." },
      { status: 500 }
    );
  }
}
