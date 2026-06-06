import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
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
    const { data, error } = await supabase
      .from("checker_submissions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", submissionId)
      .select("id,archived_at,deleted_at")
      .maybeSingle();

    if (error) {
      console.error("checker submission archive failed", error);
      return NextResponse.json(
        { error: "Could not archive checker lead." },
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
    console.error("checker submission archive route failed", error);
    return NextResponse.json(
      { error: "Could not archive checker lead." },
      { status: 500 }
    );
  }
}
