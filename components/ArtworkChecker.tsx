"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHECKER_PLATFORMS,
  canReadCheckerDimensions,
  checkArtworkFile,
  formatCheckerFileSize,
  getCheckerOrientation,
  getCheckerOutcome,
  getRecommendedAssets,
  type CheckerDimensions,
  type CheckerPlatformId,
  type CheckerResult,
  type CheckerSeverity,
  type CheckerSummary,
} from "@/lib/artwork-checker";

const severityStyles: Record<
  CheckerSeverity,
  {
    badge: string;
    dot: string;
    panel: string;
    label: string;
  }
> = {
  pass: {
    badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-500",
    panel: "border-emerald-400/20 bg-emerald-500/10",
    label: "Pass",
  },
  warning: {
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    dot: "bg-amber-500",
    panel: "border-amber-400/20 bg-amber-500/10",
    label: "Review",
  },
  fail: {
    badge: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    dot: "bg-rose-500",
    panel: "border-rose-400/20 bg-rose-500/10",
    label: "Fix",
  },
  info: {
    badge: "border-white/10 bg-white/[0.04] text-slate-300",
    dot: "bg-slate-400",
    panel: "border-white/10 bg-white/[0.04]",
    label: "Note",
  },
};

function readImageDimensions(file: File): Promise<CheckerDimensions | null> {
  if (!canReadCheckerDimensions(file.name, file.type)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

function ResultRow({ result }: { result: CheckerResult }) {
  const style = severityStyles[result.severity];

  return (
    <li className={`rounded-lg border p-4 ${style.panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
            <p className="text-sm font-semibold text-white">{result.label}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{result.message}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
        >
          {style.label}
        </span>
      </div>
    </li>
  );
}

export default function ArtworkChecker() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [summary, setSummary] = useState<CheckerSummary | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadProjectTitle, setLeadProjectTitle] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<CheckerPlatformId[]>([
    "filmhub",
    "amazon",
    "apple-tv",
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const outcome = useMemo(
    () => (summary ? getCheckerOutcome(summary.results) : null),
    [summary]
  );

  const orientation = summary ? getCheckerOrientation(summary.dimensions) : null;
  const recommendedAssets = useMemo(
    () => getRecommendedAssets(selectedPlatforms, summary?.dimensions),
    [selectedPlatforms, summary?.dimensions]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const togglePlatform = (platformId: CheckerPlatformId) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
    );
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const [file] = Array.from(fileList);
    if (!file) return;

    setIsChecking(true);
    setError("");
    setSaveMessage("");
    setSaveError("");

    try {
      const dimensions = await readImageDimensions(file);
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return canReadCheckerDimensions(file.name, file.type)
          ? URL.createObjectURL(file)
          : "";
      });
      setSummary(
        checkArtworkFile({
          name: file.name,
          type: file.type,
          size: file.size,
          dimensions,
        })
      );
    } catch {
      setError("The checker could not read that file. Try a PNG or JPG preview.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveReport = async () => {
    if (!summary) return;

    setSaveMessage("");
    setSaveError("");

    if (!leadEmail.trim()) {
      setSaveError("Please enter your email before saving the checker report.");
      return;
    }

    try {
      setIsSavingReport(true);

      const response = await fetch("/api/checker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          projectTitle: leadProjectTitle,
          selectedPlatforms,
          file: {
            fileName: summary.fileName,
            fileType: summary.fileType,
            fileSizeBytes: summary.fileSizeBytes,
            dimensions: summary.dimensions ?? null,
          },
          checkerResults: summary.results,
          recommendedAssets,
          summary: {
            outcome,
            orientation,
            savedAt: new Date().toISOString(),
          },
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Could not save the checker report.");
      }

      setSaveMessage(
        "Checker report saved. We’ve emailed you a copy. To have FrameReady visually review and fix the artwork, start an order and upload your file."
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the checker report right now. Please try again."
      );
    } finally {
      setIsSavingReport(false);
    }
  };

  const outcomeStyle = outcome ? severityStyles[outcome.severity] : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] text-white">
      <section className="mx-auto flex min-h-[46vh] max-w-6xl flex-col justify-end px-6 pb-10 pt-16 text-center sm:px-8 lg:px-10">
        <img
          src="/frameready-logo.png"
          alt="FrameReady logo"
          className="mx-auto mb-4 w-20"
        />

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
          FrameReady checker
        </p>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white md:text-5xl">
          Check artwork basics before platform delivery.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
          Drop in a poster, key art, source file, or archive for a quick baseline
          review of file type, size, resolution, and format flexibility.
        </p>

        <div className="mx-auto mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-4">
          {["File type", "50 MB limit", "Pixel size", "Aspect ratio"].map((item) => (
            <div
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={`flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition ${
              isDragging
                ? "border-cyan-300/60 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".png,.jpg,.jpeg,.tif,.tiff,.psd,.zip,image/png,image/jpeg,image/tiff"
              onChange={(event) => {
                if (event.target.files) void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-2xl text-cyan-200 shadow-[0_0_32px_rgba(56,189,248,0.16)]">
              +
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Drop artwork here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              PNG, JPG, TIFF, PSD, or ZIP. The checker reads dimensions from PNG and
              JPG files directly in your browser.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isChecking}
              className="mt-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isChecking ? "Checking..." : "Choose file"}
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-indigo-400/20 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_28px_80px_rgba(79,70,229,0.18)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">Important limits</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This is a fast automated screen, not final platform approval. Safe zones,
              title readability, compression, and artwork quality still need human QC.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">Platform checklist</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Select platforms to see which artwork assets are usually recommended.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CHECKER_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);

                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                      isSelected
                        ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/30 hover:text-white"
                    }`}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-400/20 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_28px_80px_rgba(79,70,229,0.18)] backdrop-blur-xl">
          {!summary ? (
            <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-white/8 bg-black/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                Results
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Your checker report will appear here.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                Upload one file at a time for a simple pass, review, or fix report.
              </p>
            </div>
          ) : (
            <div>
              <div className={`rounded-2xl border p-5 ${outcomeStyle?.panel}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                      Checker result
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {outcome?.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {outcome?.message}
                    </p>
                  </div>
                  {outcomeStyle ? (
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${outcomeStyle.badge}`}
                    >
                      {outcomeStyle.label}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    File
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">
                    {summary.fileName}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Size
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatCheckerFileSize(summary.fileSizeBytes)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Dimensions
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {summary.dimensions
                      ? `${summary.dimensions.width} x ${summary.dimensions.height}px`
                      : "Manual QC"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Orientation
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {orientation || "Manual QC"}
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {summary.results.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </ul>

              {previewUrl ? (
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <p className="text-sm font-semibold text-white">
                    Streaming thumbnail preview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    If the title is hard to read here, it may need artwork QC.
                  </p>
                  <div className="mt-5 flex flex-wrap items-end gap-5">
                    {[300, 160, 80].map((width) => (
                      <div key={width} className="space-y-2">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                          <img
                            src={previewUrl}
                            alt={`${summary.fileName} thumbnail preview at ${width}px`}
                            width={width}
                            className="h-auto max-w-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-slate-500">{width}px wide</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Recommended assets
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Based on the selected platforms. This compares only the uploaded
                      file ratio, not every platform rule.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {selectedPlatforms.length || 0} selected
                  </span>
                </div>

                {recommendedAssets.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {recommendedAssets.map((asset) => {
                      const style =
                        asset.status === "present"
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                          : asset.status === "missing"
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300";
                      const label =
                        asset.status === "present"
                          ? "Likely present"
                          : asset.status === "missing"
                          ? "Missing from this upload"
                          : "Recommended";

                      return (
                        <div key={asset.id} className={`rounded-2xl border p-4 ${style}`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold">{asset.label}</p>
                            <span className="shrink-0 rounded-full border border-current/20 px-2 py-1 text-[11px] font-semibold">
                              {label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 opacity-85">
                            {asset.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    Select at least one platform to show recommended assets.
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Save checker report</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Save this report without uploading the artwork file. Email is required.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Name
                    </span>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(event) => setLeadName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                      placeholder="Your name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Email required
                    </span>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(event) => setLeadEmail(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Project / title optional
                    </span>
                    <input
                      type="text"
                      value={leadProjectTitle}
                      onChange={(event) => setLeadProjectTitle(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                      placeholder="Film or project title"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSaveReport}
                  disabled={isSavingReport}
                  className="mt-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {isSavingReport ? "Saving report..." : "Save checker report"}
                </button>

                {saveMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {saveMessage}
                  </div>
                ) : null}

                {saveError ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {saveError}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <h2 className="text-xl font-semibold">Need help fixing these issues?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  FrameReady can format and QC your artwork for Filmhub, Amazon,
                  Apple TV, Roku, Tubi, YouTube, FAST channels, and more.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)]"
                >
                  Get FrameReady to fix this
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
