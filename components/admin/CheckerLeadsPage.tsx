"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CheckerLeadFileSummary = {
  fileName?: string;
  dimensions?: { width?: number; height?: number } | null;
  outcome?: { title?: string; message?: string };
  orientation?: string | null;
  smartQc?: {
    safeZoneRisk?: string;
    thumbnailReadability?: string;
    contrast?: string;
    edgeActivity?: string;
  } | null;
};

type CheckerLeadPackageAsset = {
  id?: string;
  label?: string;
  status?: "present" | "missing" | string;
  matchedFileNames?: string[];
};

type CheckerLeadResult = {
  id?: string;
  label?: string;
  severity?: "pass" | "warning" | "fail" | "info" | string;
  message?: string;
  fileName?: string;
};

type CheckerReviewFile = {
  bucket?: string;
  path?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  signedUrl?: string | null;
};

type CheckerReviewRequest = {
  id: string;
  checker_submission_id?: string;
  uploaded_files?: CheckerReviewFile[] | null;
  status?: ReviewStatus | "pending" | "reviewed" | "responded" | string;
  created_at?: string | null;
  review_response_sent_at?: string | null;
  review_response_subject?: string | null;
};

type CheckerLead = {
  id: string;
  name?: string | null;
  email?: string | null;
  project_title?: string | null;
  file_name?: string | null;
  width?: number | null;
  height?: number | null;
  selected_platforms?: string[] | null;
  checker_results?: CheckerLeadResult[] | null;
  recommended_assets?: CheckerLeadPackageAsset[] | null;
  summary?: {
    files?: CheckerLeadFileSummary[];
    packageSummary?: CheckerLeadPackageAsset[];
  } | null;
  created_at?: string | null;
  followup_email_sent_at?: string | null;
  followup_email_subject?: string | null;
  followup_email_error?: string | null;
  lead_status?: LeadStatus | null;
  lead_status_updated_at?: string | null;
  lead_notes?: string | null;
  review_requested_at?: string | null;
  reviewRequests?: CheckerReviewRequest[];
};

type LeadStatus = "new" | "contacted" | "interested" | "converted" | "closed";
type ReviewStatus =
  | "pending_review"
  | "review_in_progress"
  | "response_sent"
  | "converted"
  | "closed";

const leadStatusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

const REVIEW_RESPONSE_SUBJECT = "Your FrameReady Artwork Review";

const theme = {
  page:
    "bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,_#06070a_0%,_#0b0d14_45%,_#050608_100%)] text-white",
  panel: "border border-white/8 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.35)]",
  panelStrong:
    "border border-indigo-400/20 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))] backdrop-blur-xl shadow-[0_28px_80px_rgba(79,70,229,0.18)]",
  mutedText: "text-slate-400",
  softText: "text-slate-300",
  accentLine: "text-indigo-300",
  buttonSecondary:
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white",
  card: "border-white/8 bg-white/[0.03]",
  pill: "border border-white/10 bg-white/[0.04] text-slate-300",
  errorPanel: "border border-rose-400/20 bg-rose-500/10",
  warnPanel: "border border-amber-400/20 bg-amber-500/10 text-amber-100",
  input:
    "rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50",
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBytes(value?: number | null) {
  if (!value || !Number.isFinite(value)) return "Size unavailable";

  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function getLeadFiles(lead: CheckerLead): CheckerLeadFileSummary[] {
  if (Array.isArray(lead.summary?.files) && lead.summary.files.length > 0) {
    return lead.summary.files;
  }

  if (lead.file_name) {
    return [
      {
        fileName: lead.file_name,
        dimensions:
          lead.width && lead.height ? { width: lead.width, height: lead.height } : null,
      },
    ];
  }

  return [];
}

function getPackageSummary(lead: CheckerLead): CheckerLeadPackageAsset[] {
  if (
    Array.isArray(lead.summary?.packageSummary) &&
    lead.summary.packageSummary.length > 0
  ) {
    return lead.summary.packageSummary;
  }

  return Array.isArray(lead.recommended_assets) ? lead.recommended_assets : [];
}

function getLeadIssues(lead: CheckerLead): CheckerLeadResult[] {
  return (lead.checker_results || []).filter((result) =>
    ["warning", "fail"].includes(String(result.severity))
  );
}

function formatDimensions(file: CheckerLeadFileSummary) {
  const width = file.dimensions?.width;
  const height = file.dimensions?.height;

  return width && height ? `${width} x ${height}px` : "Dimensions unavailable";
}

function formatSmartQcValue(label: string, value?: string) {
  if (!value) return "n/a";

  if (label === "safe") {
    return value === "Review recommended" ? "Review Recommended" : "Looks OK";
  }

  if (label === "thumbnail") {
    return value === "Review recommended" ? "Review Recommended" : "Good";
  }

  if (label === "contrast") {
    if (value === "Low") return "Low Contrast";
    if (value === "Moderate") return "Acceptable";
    return value;
  }

  if (label === "edge") {
    return value === "Low" ? "Minimal" : value;
  }

  return value;
}

function getFollowupStatus(lead: CheckerLead) {
  if (lead.followup_email_error) {
    return {
      label: "Follow-up failed:",
      detail: lead.followup_email_error,
      className: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    };
  }

  if (lead.followup_email_sent_at) {
    return {
      label: "Follow-up sent:",
      detail: formatDate(lead.followup_email_sent_at),
      className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    };
  }

  return {
    label: "No follow-up sent",
    detail: "",
    className: theme.pill,
  };
}

function getLeadStatusOption(status?: string | null) {
  return (
    leadStatusOptions.find((option) => option.value === status) ||
    leadStatusOptions[0]
  );
}

function getLeadStatusClass(status?: string | null) {
  switch (status) {
    case "contacted":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
    case "interested":
      return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    case "converted":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "closed":
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    default:
      return theme.pill;
  }
}

function getReviewStatusLabel(status?: string | null) {
  switch (status) {
    case "review_in_progress":
      return "Review in progress";
    case "response_sent":
    case "responded":
      return "Response sent";
    case "converted":
      return "Converted";
    case "closed":
      return "Closed";
    case "pending":
    case "reviewed":
    case "pending_review":
    default:
      return "Pending review";
  }
}

function getReviewStatusClass(status?: string | null) {
  switch (status) {
    case "review_in_progress":
      return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
    case "response_sent":
    case "responded":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
    case "converted":
      return "border-indigo-400/25 bg-indigo-500/10 text-indigo-100";
    case "closed":
      return "border-slate-400/25 bg-slate-500/10 text-slate-200";
    default:
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  }
}

function getReviewResponseTemplate(lead: CheckerLead) {
  const name = lead.name?.trim() || "there";
  const project = lead.project_title?.trim();
  const siteUrl =
    typeof window === "undefined" ? "/" : window.location.origin || "/";

  return `Hi ${name},

Thanks for sending your artwork for a free FrameReady review.${
    project ? `\n\nProject: ${project}` : ""
  }

I reviewed the uploaded artwork and noticed:

- [Add review notes here]

Recommended next step:

- [Add recommendation here]

If you'd like FrameReady to prepare corrected, platform-ready artwork files, you can start an order here:

${siteUrl}

Best regards,
FrameReady`;
}

export default function CheckerLeadsPage() {
  const [checkerLeads, setCheckerLeads] = useState<CheckerLead[]>([]);
  const [checkerLeadsLoading, setCheckerLeadsLoading] = useState(false);
  const [checkerLeadsError, setCheckerLeadsError] = useState("");
  const [expandedCheckerLeadId, setExpandedCheckerLeadId] = useState<string>("");
  const [sendingFollowupId, setSendingFollowupId] = useState<string>("");
  const [savingLeadStatusId, setSavingLeadStatusId] = useState<string>("");
  const [leadStatusDrafts, setLeadStatusDrafts] = useState<Record<string, LeadStatus>>({});
  const [leadNotesDrafts, setLeadNotesDrafts] = useState<Record<string, string>>({});
  const [updatingReviewStatusId, setUpdatingReviewStatusId] = useState<string>("");
  const [sendingReviewResponseId, setSendingReviewResponseId] = useState<string>("");
  const [reviewResponseError, setReviewResponseError] = useState("");
  const [reviewResponseModal, setReviewResponseModal] = useState<{
    requestId: string;
    subject: string;
    message: string;
  } | null>(null);

  const loadCheckerLeads = async () => {
    try {
      setCheckerLeadsLoading(true);
      setCheckerLeadsError("");

      const response = await fetch("/api/admin/checker-submissions", {
        method: "GET",
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Failed to load checker leads.");
      }

      const submissions = (json.submissions || []) as CheckerLead[];
      setCheckerLeads(submissions);
      setLeadStatusDrafts(
        Object.fromEntries(
          submissions.map((lead) => [
            lead.id,
            getLeadStatusOption(lead.lead_status).value,
          ])
        )
      );
      setLeadNotesDrafts(
        Object.fromEntries(
          submissions.map((lead) => [lead.id, lead.lead_notes || ""])
        )
      );
      setExpandedCheckerLeadId((current) =>
        current && submissions.some((lead) => lead.id === current)
          ? current
          : submissions[0]?.id || ""
      );
    } catch (error) {
      setCheckerLeadsError(
        error instanceof Error ? error.message : "Unable to load checker leads."
      );
    } finally {
      setCheckerLeadsLoading(false);
    }
  };

  useEffect(() => {
    void loadCheckerLeads();
  }, []);

  const sendFollowupEmail = async (leadId: string) => {
    try {
      setSendingFollowupId(leadId);
      setCheckerLeadsError("");

      const response = await fetch(
        `/api/admin/checker-submissions/${leadId}/send-followup`,
        { method: "POST" }
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to send follow-up email.");
      }

      await loadCheckerLeads();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send follow-up email.";
      setCheckerLeadsError(message);
      setCheckerLeads((current) =>
        current.map((lead) =>
          lead.id === leadId ? { ...lead, followup_email_error: message } : lead
        )
      );
    } finally {
      setSendingFollowupId("");
    }
  };

  const saveLeadStatus = async (leadId: string) => {
    try {
      setSavingLeadStatusId(leadId);
      setCheckerLeadsError("");

      const response = await fetch(
        `/api/admin/checker-submissions/${leadId}/lead-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadStatus: leadStatusDrafts[leadId] || "new",
            leadNotes: leadNotesDrafts[leadId] || "",
          }),
        }
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to save lead status.");
      }

      await loadCheckerLeads();
    } catch (error) {
      setCheckerLeadsError(
        error instanceof Error ? error.message : "Unable to save lead status."
      );
    } finally {
      setSavingLeadStatusId("");
    }
  };

  const markReviewInProgress = async (reviewRequestId: string) => {
    try {
      setUpdatingReviewStatusId(reviewRequestId);
      setCheckerLeadsError("");

      const response = await fetch(
        `/api/admin/checker-review-requests/${reviewRequestId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewStatus: "review_in_progress" }),
        }
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to update review status.");
      }

      await loadCheckerLeads();
    } catch (error) {
      setCheckerLeadsError(
        error instanceof Error
          ? error.message
          : "Unable to update review status."
      );
    } finally {
      setUpdatingReviewStatusId("");
    }
  };

  const openReviewResponseModal = (
    lead: CheckerLead,
    request: CheckerReviewRequest
  ) => {
    setReviewResponseError("");
    setReviewResponseModal({
      requestId: request.id,
      subject: REVIEW_RESPONSE_SUBJECT,
      message: getReviewResponseTemplate(lead),
    });
  };

  const sendReviewResponse = async () => {
    if (!reviewResponseModal) return;

    try {
      setSendingReviewResponseId(reviewResponseModal.requestId);
      setReviewResponseError("");
      setCheckerLeadsError("");

      const response = await fetch(
        `/api/admin/checker-review-requests/${reviewResponseModal.requestId}/send-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: reviewResponseModal.subject,
            message: reviewResponseModal.message,
          }),
        }
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to send review response.");
      }

      await loadCheckerLeads();
      setReviewResponseModal(null);
    } catch (error) {
      setReviewResponseError(
        error instanceof Error
          ? error.message
          : "Unable to send review response."
      );
    } finally {
      setSendingReviewResponseId("");
    }
  };

  return (
    <main className={`min-h-screen p-6 ${theme.page}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
              Operations
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Checker Leads</h1>
            <p className={`mt-2 text-sm ${theme.mutedText}`}>
              Saved artwork checker submissions from the standalone checker.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className={theme.buttonSecondary}>
              Back to Admin Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void loadCheckerLeads()}
              className={theme.buttonSecondary}
            >
              {checkerLeadsLoading ? "Refreshing..." : "Refresh Checker Leads"}
            </button>
          </div>
        </div>

        <section className={`rounded-2xl p-4 ${theme.panelStrong}`}>
          {checkerLeadsError && (
            <div className={`mb-4 rounded-xl p-3 text-sm ${theme.errorPanel}`}>
              {checkerLeadsError}
            </div>
          )}

          {checkerLeadsLoading && checkerLeads.length === 0 && (
            <div className={`rounded-xl p-4 text-sm ${theme.panel}`}>
              Loading checker leads...
            </div>
          )}

          {!checkerLeadsLoading && checkerLeads.length === 0 && !checkerLeadsError && (
            <div className={`rounded-xl p-4 text-sm ${theme.panel}`}>
              No checker leads saved yet.
            </div>
          )}

          {checkerLeads.length > 0 && (
            <div className="space-y-3">
              {checkerLeads.map((lead) => {
                const isExpanded = expandedCheckerLeadId === lead.id;
                const files = getLeadFiles(lead);
                const packageSummary = getPackageSummary(lead);
                const issues = getLeadIssues(lead);
                const platforms = lead.selected_platforms || [];
                const primaryFile = files[0];
                const followupStatus = getFollowupStatus(lead);
                const leadStatusOption = getLeadStatusOption(lead.lead_status);
                const reviewRequests = lead.reviewRequests || [];

                return (
                  <div key={lead.id} className={`rounded-2xl border p-4 ${theme.card}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCheckerLeadId(isExpanded ? "" : lead.id)
                      }
                      className="w-full text-left"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">
                              {lead.name || "Unnamed lead"}
                            </p>
                            <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                              {issues.length} issue{issues.length === 1 ? "" : "s"}
                            </span>
                            <span className={`rounded-full border px-2 py-1 text-[10px] ${getLeadStatusClass(lead.lead_status)}`}>
                              {leadStatusOption.label}
                            </span>
                            {lead.review_requested_at && (
                              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-100">
                                Free Review Requested
                              </span>
                            )}
                            {reviewRequests.length > 0 && (
                              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-100">
                                {reviewRequests.length} review request
                                {reviewRequests.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 text-sm ${theme.softText}`}>
                            {lead.email || "No email"}
                          </p>
                          <p className={`text-xs ${theme.mutedText}`}>
                            {lead.project_title || "No project/title provided"}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className={`text-xs ${theme.mutedText}`}>
                            {formatDate(lead.created_at)}
                          </p>
                          <p className={`mt-1 text-xs ${theme.mutedText}`}>
                            {files.length} uploaded file{files.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {platforms.length > 0 ? (
                          platforms.map((platform) => (
                            <span key={platform} className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
                              {platform}
                            </span>
                          ))
                        ) : (
                          <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
                            No platforms selected
                          </span>
                        )}
                        {primaryFile && (
                          <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
                            {primaryFile.fileName || "Uploaded file"} - {formatDimensions(primaryFile)}
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-2">
                            <div className={`rounded-xl border px-3 py-2 text-sm ${followupStatus.className}`}>
                              <span className="font-semibold">{followupStatus.label}</span>
                              {followupStatus.detail && (
                                <span className="ml-2 break-all">{followupStatus.detail}</span>
                              )}
                            </div>
                            {lead.lead_status_updated_at && (
                              <p className={`text-xs ${theme.mutedText}`}>
                                Status updated: {formatDate(lead.lead_status_updated_at)}
                              </p>
                            )}
                            {lead.review_requested_at && (
                              <p className="text-xs text-cyan-100">
                                Free Review Requested: {formatDate(lead.review_requested_at)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void sendFollowupEmail(lead.id)}
                            disabled={!lead.email || sendingFollowupId === lead.id}
                            className={`${theme.buttonSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {sendingFollowupId === lead.id ? "Sending..." : "Email Lead"}
                          </button>
                        </div>

                        <div className={`rounded-xl p-4 ${theme.panel}`}>
                          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                            <label className="block">
                              <span className={`mb-2 block text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                                Lead status
                              </span>
                              <select
                                value={leadStatusDrafts[lead.id] || "new"}
                                onChange={(event) =>
                                  setLeadStatusDrafts((current) => ({
                                    ...current,
                                    [lead.id]: event.target.value as LeadStatus,
                                  }))
                                }
                                className={`${theme.input} w-full`}
                              >
                                {leadStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className={`mb-2 block text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                                Lead notes
                              </span>
                              <textarea
                                value={leadNotesDrafts[lead.id] || ""}
                                onChange={(event) =>
                                  setLeadNotesDrafts((current) => ({
                                    ...current,
                                    [lead.id]: event.target.value,
                                  }))
                                }
                                rows={3}
                                className={`${theme.input} min-h-[84px] w-full resize-y`}
                                placeholder="Add follow-up notes, next steps, or context."
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void saveLeadStatus(lead.id)}
                              disabled={savingLeadStatusId === lead.id}
                              className={`${theme.buttonSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {savingLeadStatusId === lead.id
                                ? "Saving..."
                                : "Save Status"}
                            </button>
                          </div>
                        </div>

                        {lead.review_requested_at && (
                          <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.06] p-4 shadow-[0_18px_55px_rgba(34,211,238,0.08)]">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
                                  Review request
                                </p>
                                <h2 className="mt-2 text-lg font-semibold text-white">
                                  Free review artwork
                                </h2>
                                <p className={`mt-1 text-sm ${theme.softText}`}>
                                  Requested {formatDate(lead.review_requested_at)}
                                </p>
                              </div>
                              <span className="w-fit rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                                Admin review needed
                              </span>
                            </div>

                            {reviewRequests.length > 0 ? (
                              <div className="space-y-3">
                                {reviewRequests.map((request) => (
                                  <div
                                    key={request.id}
                                    className={`rounded-xl border p-3 ${theme.card}`}
                                  >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold text-white">
                                            Review request
                                          </p>
                                          <span className={`w-fit rounded-full border px-3 py-1 text-xs ${getReviewStatusClass(request.status)}`}>
                                            {getReviewStatusLabel(request.status)}
                                          </span>
                                        </div>
                                        <p className={`mt-1 text-xs ${theme.mutedText}`}>
                                          Created {formatDate(request.created_at)}
                                        </p>
                                        {request.review_response_sent_at && (
                                          <p className="mt-2 text-xs text-emerald-100">
                                            Review response sent:{" "}
                                            {formatDate(request.review_response_sent_at)}
                                            {request.review_response_subject
                                              ? ` - ${request.review_response_subject}`
                                              : ""}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void markReviewInProgress(request.id)}
                                          disabled={
                                            updatingReviewStatusId === request.id ||
                                            request.status === "review_in_progress" ||
                                            request.status === "response_sent"
                                          }
                                          className={`${theme.buttonSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                          {updatingReviewStatusId === request.id
                                            ? "Updating..."
                                            : "Review Artwork"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openReviewResponseModal(lead, request)
                                          }
                                          disabled={
                                            !lead.email ||
                                            sendingReviewResponseId === request.id
                                          }
                                          className={`${theme.buttonSecondary} border-cyan-300/25 bg-cyan-400/10 text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                          {sendingReviewResponseId === request.id
                                            ? "Sending..."
                                            : "Send Review Response"}
                                        </button>
                                      </div>
                                    </div>

                                    {(request.uploaded_files?.length ?? 0) > 0 ? (
                                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {request.uploaded_files?.map((file) => (
                                          <div
                                            key={file.path || file.fileName}
                                            className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
                                          >
                                            <p className="break-all font-semibold text-white">
                                              {file.fileName || "Review file"}
                                            </p>
                                            <p className={`mt-1 text-xs ${theme.mutedText}`}>
                                              {formatBytes(file.sizeBytes)}
                                            </p>
                                            {file.signedUrl ? (
                                              <a
                                                href={file.signedUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100"
                                              >
                                                Open / download
                                              </a>
                                            ) : (
                                              <p className="mt-2 text-xs text-amber-100">
                                                Signed link unavailable. Refresh to try again.
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className={`mt-3 text-sm ${theme.mutedText}`}>
                                        No review files were stored for this request.
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`rounded-xl border p-3 text-sm ${theme.card} ${theme.mutedText}`}>
                                This lead requested a free review, but no review upload record was found.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className={`rounded-xl p-4 ${theme.panel}`}>
                            <p className={`mb-3 text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                              Uploaded files
                            </p>
                            {files.length > 0 ? (
                              <div className="space-y-3">
                                {files.map((file, index) => (
                                  <div key={`${file.fileName || "file"}-${index}`} className={`rounded-xl p-3 ${theme.card}`}>
                                    <p className="break-all text-sm font-semibold text-white">
                                      {file.fileName || `File ${index + 1}`}
                                    </p>
                                    <p className={`mt-1 text-xs ${theme.mutedText}`}>
                                      {formatDimensions(file)}
                                      {file.orientation ? ` - ${file.orientation}` : ""}
                                    </p>
                                    {file.outcome?.title && (
                                      <p className={`mt-2 text-xs ${theme.softText}`}>
                                        {file.outcome.title}
                                      </p>
                                    )}
                                    {file.smartQc && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                                          Safe zone: {formatSmartQcValue("safe", file.smartQc.safeZoneRisk)}
                                        </span>
                                        <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                                          Thumbnail: {formatSmartQcValue("thumbnail", file.smartQc.thumbnailReadability)}
                                        </span>
                                        <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                                          Contrast: {formatSmartQcValue("contrast", file.smartQc.contrast)}
                                        </span>
                                        <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                                          Edge: {formatSmartQcValue("edge", file.smartQc.edgeActivity)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-sm ${theme.mutedText}`}>
                                No uploaded file summary captured.
                              </p>
                            )}
                          </div>

                          <div className={`rounded-xl p-4 ${theme.panel}`}>
                            <p className={`mb-3 text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                              Package summary
                            </p>
                            {packageSummary.length > 0 ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {packageSummary.map((asset) => (
                                  <div key={asset.id || asset.label} className={`rounded-xl border p-3 text-xs ${
                                    asset.status === "present"
                                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                      : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                                  }`}>
                                    <p className="font-semibold">
                                      {asset.label || asset.id || "Asset"}
                                    </p>
                                    <p className="mt-1 capitalize">
                                      {asset.status || "recommended"}
                                    </p>
                                    {(asset.matchedFileNames?.length ?? 0) > 0 && (
                                      <p className="mt-1 break-all opacity-80">
                                        {asset.matchedFileNames?.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-sm ${theme.mutedText}`}>
                                No package summary captured.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className={`rounded-xl p-4 ${theme.panel}`}>
                          <p className={`mb-3 text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                            Checker warnings / issues
                          </p>
                          {issues.length > 0 ? (
                            <div className="space-y-2">
                              {issues.map((issue, index) => (
                                <div key={`${issue.id || "issue"}-${index}`} className={`rounded-xl p-3 text-sm ${
                                  issue.severity === "fail"
                                    ? theme.errorPanel
                                    : theme.warnPanel
                                }`}>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">
                                      {issue.label || "Checker issue"}
                                    </p>
                                    {issue.fileName && (
                                      <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px]">
                                        {issue.fileName}
                                      </span>
                                    )}
                                  </div>
                                  {issue.message && (
                                    <p className="mt-1 opacity-90">{issue.message}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={`text-sm ${theme.mutedText}`}>
                              No warnings or issues captured.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {reviewResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl p-5 ${theme.panelStrong}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                  Review response
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Send Review Response
                </h2>
                <p className={`mt-1 text-sm ${theme.mutedText}`}>
                  Edit the plain-text review before sending it to the lead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewResponseModal(null)}
                className={theme.buttonSecondary}
              >
                Close
              </button>
            </div>

            {reviewResponseError && (
              <div className={`mt-4 rounded-xl p-3 text-sm ${theme.errorPanel}`}>
                {reviewResponseError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className={`mb-2 block text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                  Subject
                </span>
                <input
                  value={reviewResponseModal.subject}
                  onChange={(event) =>
                    setReviewResponseModal((current) =>
                      current
                        ? { ...current, subject: event.target.value }
                        : current
                    )
                  }
                  className={`${theme.input} w-full`}
                />
              </label>

              <label className="block">
                <span className={`mb-2 block text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                  Email body
                </span>
                <textarea
                  value={reviewResponseModal.message}
                  onChange={(event) =>
                    setReviewResponseModal((current) =>
                      current
                        ? { ...current, message: event.target.value }
                        : current
                    )
                  }
                  rows={14}
                  className={`${theme.input} min-h-[360px] w-full resize-y leading-6`}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReviewResponseModal(null)}
                className={theme.buttonSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void sendReviewResponse()}
                disabled={
                  sendingReviewResponseId === reviewResponseModal.requestId ||
                  !reviewResponseModal.subject.trim() ||
                  !reviewResponseModal.message.trim()
                }
                className={`${theme.buttonSecondary} border-cyan-300/25 bg-cyan-400/10 text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {sendingReviewResponseId === reviewResponseModal.requestId
                  ? "Sending..."
                  : "Send Review Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
