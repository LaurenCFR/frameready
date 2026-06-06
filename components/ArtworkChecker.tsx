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
  getPackageCompleteness,
  getRecommendedAssets,
  type CheckerDimensions,
  type CheckerPackageAsset,
  type CheckerPlatformId,
  type CheckerResult,
  type CheckerSeverity,
  type CheckerSummary,
} from "@/lib/artwork-checker";

const MAX_UPLOAD_FILES = 10;
const MAX_REVIEW_UPLOAD_FILES = 5;
const MAX_REVIEW_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const REVIEW_UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "tif", "tiff", "psd", "zip"];

type SmartQcReviewLevel = "Low" | "Review recommended";
type SmartQcContrastLevel = "Low" | "Moderate" | "Good";
type SmartQcActivityLevel = "Low" | "Moderate" | "High";

type SmartQcReport = {
  safeZoneRisk: SmartQcReviewLevel;
  thumbnailReadability: SmartQcReviewLevel;
  contrast: SmartQcContrastLevel;
  edgeActivity: SmartQcActivityLevel;
  scores: {
    averageBrightness: number;
    contrastScore: number;
    centralContrastScore: number;
    centralBackgroundDifference: number;
    outerFiveActivity: number;
    outerTenActivity: number;
    outerFifteenActivity: number;
    outerFiveDetailRatio: number;
    outerTenDetailRatio: number;
    outerFifteenDetailRatio: number;
    centralDetailRatio: number;
    centralActivity: number;
    thumbnailRiskSignalCount: number;
  };
  results: CheckerResult[];
};

type TopIssue = {
  key: string;
  label: string;
  message: string;
  severity: Extract<CheckerSeverity, "warning" | "fail">;
  count: number;
  fileNames: string[];
};

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

function getAverage(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

function getContrastLevel(contrastScore: number, averageBrightness: number): SmartQcContrastLevel {
  if (contrastScore < 30 || averageBrightness < 35 || averageBrightness > 220) {
    return "Low";
  }

  if (contrastScore < 48) {
    return "Moderate";
  }

  return "Good";
}

function getEdgeActivityLevel(activityScore: number): SmartQcActivityLevel {
  if (activityScore >= 26) return "High";
  if (activityScore >= 14) return "Moderate";
  return "Low";
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateReviewUploadFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Upload at least one artwork file for review.";
  }

  if (files.length > MAX_REVIEW_UPLOAD_FILES) {
    return `Upload up to ${MAX_REVIEW_UPLOAD_FILES} files for a free review.`;
  }

  const invalidType = files.find(
    (file) => !REVIEW_UPLOAD_EXTENSIONS.includes(getFileExtension(file.name))
  );

  if (invalidType) {
    return `${invalidType.name} is not an accepted review file type.`;
  }

  const oversizedFile = files.find((file) => file.size > MAX_REVIEW_FILE_SIZE_BYTES);

  if (oversizedFile) {
    return `${oversizedFile.name} is over the 25 MB review upload limit.`;
  }

  return null;
}

function analyzeSmartQc(file: File): Promise<SmartQcReport | null> {
  if (!canReadCheckerDimensions(file.name, file.type)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const sampleSize = 180;
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const scale = Math.min(1, sampleSize / Math.max(width, height));
      const canvas = document.createElement("canvas");
      const canvasWidth = Math.max(1, Math.round(width * scale));
      const canvasHeight = Math.max(1, Math.round(height * scale));
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
      const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const brightnessValues: number[] = [];
      const centralBrightnessValues: number[] = [];
      let backgroundBrightnessTotal = 0;
      let backgroundPixelCount = 0;
      let totalActivity = 0;
      let totalActivityCount = 0;
      let outerFiveActivityTotal = 0;
      let outerFiveActivityCount = 0;
      let outerTenActivityTotal = 0;
      let outerTenActivityCount = 0;
      let outerFifteenActivityTotal = 0;
      let outerFifteenActivityCount = 0;
      let outerFiveDetailCount = 0;
      let outerTenDetailCount = 0;
      let outerFifteenDetailCount = 0;
      let centralDetailCount = 0;
      let centralActivityTotal = 0;
      let centralActivityCount = 0;
      const brightnessAt = (x: number, y: number) => {
        const index = (y * canvasWidth + x) * 4;

        return (
          0.2126 * imageData[index] +
          0.7152 * imageData[index + 1] +
          0.0722 * imageData[index + 2]
        );
      };

      for (let y = 0; y < canvasHeight; y += 1) {
        for (let x = 0; x < canvasWidth; x += 1) {
          const brightness = brightnessAt(x, y);
          brightnessValues.push(brightness);

          const xRatio = x / canvasWidth;
          const yRatio = y / canvasHeight;
          const isOuterFive =
            xRatio < 0.05 || xRatio > 0.95 || yRatio < 0.05 || yRatio > 0.95;
          const isOuterTen =
            xRatio < 0.1 || xRatio > 0.9 || yRatio < 0.1 || yRatio > 0.9;
          const isOuterFifteen =
            xRatio < 0.15 || xRatio > 0.85 || yRatio < 0.15 || yRatio > 0.85;
          const isCentralSafeArea =
            xRatio >= 0.16 && xRatio <= 0.84 && yRatio >= 0.16 && yRatio <= 0.84;
          const leftDifference = x > 0 ? Math.abs(brightness - brightnessAt(x - 1, y)) : 0;
          const topDifference = y > 0 ? Math.abs(brightness - brightnessAt(x, y - 1)) : 0;
          const rightDifference =
            x < canvasWidth - 1 ? Math.abs(brightness - brightnessAt(x + 1, y)) : 0;
          const bottomDifference =
            y < canvasHeight - 1 ? Math.abs(brightness - brightnessAt(x, y + 1)) : 0;
          const activity =
            (leftDifference + topDifference + rightDifference + bottomDifference) /
            ((x > 0 ? 1 : 0) +
              (y > 0 ? 1 : 0) +
              (x < canvasWidth - 1 ? 1 : 0) +
              (y < canvasHeight - 1 ? 1 : 0) ||
              1);
          const isStrongDetail = activity >= 18;

          totalActivity += activity;
          totalActivityCount += 1;

          if (isOuterFive) {
            outerFiveActivityTotal += activity;
            outerFiveActivityCount += 1;
            if (isStrongDetail) outerFiveDetailCount += 1;
          } else if (isOuterTen) {
            outerTenActivityTotal += activity;
            outerTenActivityCount += 1;
            if (isStrongDetail) outerTenDetailCount += 1;
          } else if (isOuterFifteen) {
            outerFifteenActivityTotal += activity;
            outerFifteenActivityCount += 1;
            if (isStrongDetail) outerFifteenDetailCount += 1;
          }

          if (isCentralSafeArea) {
            centralBrightnessValues.push(brightness);
            centralActivityTotal += activity;
            centralActivityCount += 1;
            if (isStrongDetail) centralDetailCount += 1;
          } else {
            backgroundBrightnessTotal += brightness;
            backgroundPixelCount += 1;
          }
        }
      }

      URL.revokeObjectURL(objectUrl);

      const averageBrightness =
        brightnessValues.reduce((sum, value) => sum + value, 0) / brightnessValues.length;
      const variance =
        brightnessValues.reduce(
          (sum, value) => sum + Math.pow(value - averageBrightness, 2),
          0
        ) / brightnessValues.length;
      const contrastScore = Math.sqrt(variance);
      const centralAverageBrightness =
        centralBrightnessValues.reduce((sum, value) => sum + value, 0) /
        Math.max(centralBrightnessValues.length, 1);
      const centralVariance =
        centralBrightnessValues.reduce(
          (sum, value) => sum + Math.pow(value - centralAverageBrightness, 2),
          0
        ) / Math.max(centralBrightnessValues.length, 1);
      const centralContrastScore = Math.sqrt(centralVariance);
      const backgroundAverageBrightness = getAverage(
        backgroundBrightnessTotal,
        backgroundPixelCount
      );
      const centralBackgroundDifference = Math.abs(
        centralAverageBrightness - backgroundAverageBrightness
      );
      const outerFiveActivity = getAverage(outerFiveActivityTotal, outerFiveActivityCount);
      const outerTenActivity = getAverage(outerTenActivityTotal, outerTenActivityCount);
      const outerFifteenActivity = getAverage(
        outerFifteenActivityTotal,
        outerFifteenActivityCount
      );
      const outerFiveDetailRatio = getAverage(outerFiveDetailCount, outerFiveActivityCount);
      const outerTenDetailRatio = getAverage(outerTenDetailCount, outerTenActivityCount);
      const outerFifteenDetailRatio = getAverage(
        outerFifteenDetailCount,
        outerFifteenActivityCount
      );
      const centralDetailRatio = getAverage(centralDetailCount, centralActivityCount);
      const centralActivity = getAverage(centralActivityTotal, centralActivityCount);
      const totalTextureActivity = getAverage(totalActivity, totalActivityCount);
      const edgeActivityScore = Math.max(
        outerFiveActivity,
        outerTenActivity,
        outerFifteenActivity
      );
      const edgeActivity = getEdgeActivityLevel(edgeActivityScore);
      const contrast = getContrastLevel(contrastScore, averageBrightness);
      const edgeDetailRatio = Math.max(
        outerFiveDetailRatio,
        outerTenDetailRatio,
        outerFifteenDetailRatio
      );
      const relativeEdgeDetail = edgeDetailRatio / Math.max(centralDetailRatio, 0.04);
      const relativeEdgeActivity = edgeActivityScore / Math.max(centralActivity, 8);
      const safeZoneNeedsReview =
        edgeActivity === "High" ||
        outerFiveActivity >= 18 ||
        outerTenActivity >= 15 ||
        outerFifteenActivity >= 13 ||
        outerFiveDetailRatio >= 0.1 ||
        outerTenDetailRatio >= 0.08 ||
        outerFifteenDetailRatio >= 0.06 ||
        (edgeDetailRatio >= 0.05 && relativeEdgeDetail >= 1.25) ||
        (edgeActivityScore >= 12 && relativeEdgeActivity >= 1.1);
      const thumbnailRiskSignals = [
        contrastScore < 24,
        totalTextureActivity >= 42,
        averageBrightness < 28 || averageBrightness > 232,
        centralContrastScore < 14 || centralBackgroundDifference < 10,
        centralActivity >= 38 && totalTextureActivity >= 36,
      ];
      const thumbnailRiskSignalCount = thumbnailRiskSignals.filter(Boolean).length;
      const thumbnailNeedsReview = thumbnailRiskSignalCount >= 2;
      const safeZoneRisk: SmartQcReviewLevel = safeZoneNeedsReview
        ? "Review recommended"
        : "Low";
      const thumbnailReadability: SmartQcReviewLevel = thumbnailNeedsReview
        ? "Review recommended"
        : "Low";
      const smartResults: CheckerResult[] = [];

      if (contrast === "Low") {
        smartResults.push({
          id: "smart-qc-contrast",
          label: "Contrast may need review",
          severity: "warning",
          message:
            "Potential readability issue. The image has a low automated contrast range or very dark/bright overall brightness.",
        });
      } else {
        smartResults.push({
          id: "smart-qc-contrast",
          label: "Contrast",
          severity: "info",
          message:
            "Automated brightness and contrast look broadly usable, but final legibility still needs human review.",
        });
      }

      if (safeZoneNeedsReview) {
        smartResults.push({
          id: "smart-qc-edge-risk",
          label: "Possible safe-zone risk",
          severity: "warning",
          message:
            "High-detail content was detected near the outer safe-zone area. Important text, logos, or faces may be too close to the edge.",
        });
      } else {
        smartResults.push({
          id: "smart-qc-edge-risk",
          label: "Edge/cropping",
          severity: "info",
          message:
            "No strong automated edge-content warning was detected, but platform safe zones still need visual review.",
        });
      }

      if (thumbnailNeedsReview) {
        smartResults.push({
          id: "smart-qc-thumbnail-readability",
          label: "Potential thumbnail readability issue",
          severity: "warning",
          message:
            "Artwork may become difficult to read at small streaming thumbnail sizes. Manual title readability review recommended.",
        });
      } else {
        smartResults.push({
          id: "smart-qc-thumbnail-readability",
          label: "Thumbnail readability",
          severity: "info",
          message:
            "Looks OK — manual review still recommended. Automated thumbnail checks did not find multiple readability risk signals.",
        });
      }

      smartResults.push({
        id: "smart-qc-title-review",
        label: "Manual title-size review recommended",
        severity: "warning",
        message:
          "Manual title-size review recommended. Browser OCR/text detection is not available here, so text density and title readability are not measured.",
      });

      resolve({
        safeZoneRisk,
        thumbnailReadability,
        contrast,
        edgeActivity,
        scores: {
          averageBrightness: Math.round(averageBrightness),
          contrastScore: Math.round(contrastScore),
          centralContrastScore: Math.round(centralContrastScore),
          centralBackgroundDifference: Math.round(centralBackgroundDifference),
          outerFiveActivity: Math.round(outerFiveActivity),
          outerTenActivity: Math.round(outerTenActivity),
          outerFifteenActivity: Math.round(outerFifteenActivity),
          outerFiveDetailRatio: Math.round(outerFiveDetailRatio * 100),
          outerTenDetailRatio: Math.round(outerTenDetailRatio * 100),
          outerFifteenDetailRatio: Math.round(outerFifteenDetailRatio * 100),
          centralDetailRatio: Math.round(centralDetailRatio * 100),
          centralActivity: Math.round(centralActivity),
          thumbnailRiskSignalCount,
        },
        results: smartResults,
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

function getResultCounts(results: CheckerResult[]) {
  return results.reduce(
    (counts, result) => {
      if (result.severity === "fail") counts.fail += 1;
      if (result.severity === "warning") counts.warning += 1;
      return counts;
    },
    { fail: 0, warning: 0 }
  );
}

function getDetectedAssetLabel(
  summary: CheckerSummary,
  packageSummary: CheckerPackageAsset[]
): string {
  const matchedAssets = packageSummary
    .filter((asset) => asset.matchedFileNames.includes(summary.fileName))
    .map((asset) => asset.label);

  return matchedAssets.length > 0 ? matchedAssets.join(" / ") : "Manual QC";
}

function getFileStatusLabel(results: CheckerResult[]) {
  const outcome = getCheckerOutcome(results);
  const style = severityStyles[outcome.severity];

  return {
    label: style.label,
    className: style.badge,
  };
}

function getTopIssues(summaries: CheckerSummary[]): TopIssue[] {
  const groupedIssues = new Map<string, TopIssue>();

  for (const summary of summaries) {
    for (const result of summary.results) {
      if (result.severity !== "fail" && result.severity !== "warning") continue;

      const key = `${result.severity}:${result.label}:${result.message}`;
      const existing = groupedIssues.get(key);

      if (existing) {
        existing.count += 1;
        existing.fileNames.push(summary.fileName);
      } else {
        groupedIssues.set(key, {
          key,
          label: result.label,
          message: result.message,
          severity: result.severity,
          count: 1,
          fileNames: [summary.fileName],
        });
      }
    }
  }

  return Array.from(groupedIssues.values())
    .sort((a, b) => {
      const severityRank = (issue: TopIssue) => (issue.severity === "fail" ? 0 : 1);
      return severityRank(a) - severityRank(b) || b.count - a.count;
    })
    .slice(0, 5);
}

function CompactPackageSummaryCard({
  assets,
  fileCount,
  warningCount,
  issueCount,
}: {
  assets: CheckerPackageAsset[];
  fileCount: number;
  warningCount: number;
  issueCount: number;
}) {
  const presentCount = assets.filter((asset) => asset.status === "present").length;
  const missingCount = assets.filter((asset) => asset.status === "missing").length;

  const stats = [
    { label: "Present assets", value: presentCount },
    { label: "Missing assets", value: missingCount },
    { label: "Files uploaded", value: fileCount },
    { label: "Warnings/issues", value: warningCount + issueCount },
  ];

  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.06] p-5 shadow-[0_24px_70px_rgba(34,211,238,0.1)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Results summary
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Package Summary
          </h2>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          {fileCount} file{fileCount === 1 ? "" : "s"} checked
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="text-2xl font-semibold text-white">{stat.value}</p>
            <p className="mt-1 max-w-[7rem] text-[11px] leading-tight text-slate-400 sm:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopIssues({ issues }: { issues: TopIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
        No warning or fix items were found in this automated check.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-white">Top Issues</p>
      <div className="mt-4 space-y-3">
        {issues.map((issue) => {
          const style = severityStyles[issue.severity];
          const fileLabel =
            issue.count === 1
              ? `on ${issue.fileNames[0]}`
              : `on ${issue.count} files`;

          return (
            <div key={issue.key} className={`rounded-2xl border p-4 ${style.panel}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {issue.label} {fileLabel}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {issue.message}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                >
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackageSummary({ assets }: { assets: CheckerPackageAsset[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-white">Package Summary</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Based on detected aspect ratios across the uploaded files.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              asset.status === "present"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                : "border-amber-400/20 bg-amber-500/10 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>
                {asset.status === "present" ? "\u2713" : "\u2717"} {asset.label}
                {asset.status === "missing" ? " Missing" : ""}
              </span>
            </div>
            {asset.matchedFileNames.length > 0 ? (
              <p className="mt-1 break-all text-xs opacity-80">
                {asset.matchedFileNames.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartQcPanel({ report }: { report: SmartQcReport | null | undefined }) {
  if (!report) return null;

  const hasSafeZoneReview = report.safeZoneRisk === "Review recommended";
  const edgeActivityValue = hasSafeZoneReview
    ? "High"
    : report.edgeActivity === "Low"
    ? "Minimal"
    : report.edgeActivity;

  const items: Array<{
    label: string;
    value: string;
    tone: "good" | "review" | "moderate";
  }> = [
    {
      label: "Safe Zone Risk",
      value:
        report.safeZoneRisk === "Review recommended"
          ? "Review Recommended"
          : "Looks OK",
      tone: hasSafeZoneReview ? "review" : "good",
    },
    {
      label: "Thumbnail Readability",
      value:
        report.thumbnailReadability === "Review recommended"
          ? "Review Recommended"
          : "Good",
      tone: report.thumbnailReadability === "Review recommended" ? "review" : "good",
    },
    {
      label: "Contrast",
      value:
        report.contrast === "Low"
          ? "Low Contrast"
          : report.contrast === "Moderate"
          ? "Acceptable"
          : "Good",
      tone:
        report.contrast === "Low"
          ? "review"
          : report.contrast === "Moderate"
          ? "moderate"
          : "good",
    },
    {
      label: "Edge Activity",
      value: edgeActivityValue,
      tone:
        edgeActivityValue === "High"
          ? "review"
          : edgeActivityValue === "Moderate"
          ? "moderate"
          : "good",
    },
  ];
  const needsReview = items.some((item) => item.tone === "review");
  const badgeStyles = {
    good: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    moderate: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
    review: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  } as const;

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Smart QC summary</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Automated sampling for safe-zone, thumbnail readability, contrast, and edge activity.
          </p>
        </div>
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            needsReview
              ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
              : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {needsReview ? "Review Recommended" : "Looks OK"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 ${badgeStyles[item.tone]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {item.label}
            </p>
            <span className="mt-3 inline-flex rounded-full border border-current/20 px-3 py-1 text-xs font-semibold">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ArtworkChecker() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [summaries, setSummaries] = useState<CheckerSummary[]>([]);
  const [isPackageSummaryExpanded, setIsPackageSummaryExpanded] = useState(false);
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
  const [previewUrls, setPreviewUrls] = useState<
    Array<{ fileName: string; url: string }>
  >([]);
  const [smartQcReports, setSmartQcReports] = useState<
    Array<SmartQcReport | null>
  >([]);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadProjectTitle, setLeadProjectTitle] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [savedSubmissionId, setSavedSubmissionId] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [isReviewUploadOpen, setIsReviewUploadOpen] = useState(false);
  const [reviewUploadFiles, setReviewUploadFiles] = useState<File[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<CheckerPlatformId[]>([
    "filmhub",
    "amazon",
    "apple-tv",
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const packageSummary = useMemo(
    () => getPackageCompleteness(summaries),
    [summaries]
  );
  const reportIssueStats = useMemo(
    () =>
      summaries.reduce(
        (stats, summary) => {
          const counts = getResultCounts(summary.results);
          stats.warningCount += counts.warning;
          stats.issueCount += counts.fail;
          return stats;
        },
        { warningCount: 0, issueCount: 0 }
      ),
    [summaries]
  );
  const topIssues = useMemo(() => getTopIssues(summaries), [summaries]);
  const primarySummary = summaries[0] ?? null;

  useEffect(() => {
    return () => {
      previewUrls.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previewUrls]);

  const togglePlatform = (platformId: CheckerPlatformId) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
    );
  };

  const toggleFileExpanded = (fileId: string) => {
    setExpandedFileIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    if (fileArray.length === 0) return;

    const filesToCheck = fileArray.slice(0, MAX_UPLOAD_FILES);

    setIsChecking(true);
    setError("");
    setSaveMessage("");
    setSaveError("");
    setSavedSubmissionId("");
    setReviewMessage("");
    setReviewError("");
    setIsReviewUploadOpen(false);
    setReviewUploadFiles([]);

    try {
      const checkedFiles = await Promise.all(
        filesToCheck.map(async (file) => {
          const dimensions = await readImageDimensions(file);
          const smartQcReport = await analyzeSmartQc(file);
          const baseSummary = checkArtworkFile({
            name: file.name,
            type: file.type,
            size: file.size,
            dimensions,
          });

          return {
            summary: {
              ...baseSummary,
              results: [...baseSummary.results, ...(smartQcReport?.results ?? [])],
            },
            smartQcReport,
            previewUrl: canReadCheckerDimensions(file.name, file.type)
              ? URL.createObjectURL(file)
              : "",
          };
        })
      );

      setPreviewUrls((currentUrls) => {
        currentUrls.forEach((preview) => URL.revokeObjectURL(preview.url));
        return checkedFiles
          .filter((item) => item.previewUrl)
          .map((item) => ({
            fileName: item.summary.fileName,
            url: item.previewUrl,
          }));
      });

      setSummaries(checkedFiles.map((item) => item.summary));
      setSmartQcReports(checkedFiles.map((item) => item.smartQcReport));
      setIsPackageSummaryExpanded(false);
      setExpandedFileIds(new Set());

      if (fileArray.length > MAX_UPLOAD_FILES) {
        setError(
          `Only the first ${MAX_UPLOAD_FILES} files were checked. Upload fewer files to review the rest.`
        );
      }
    } catch {
      setSmartQcReports([]);
      setError("The checker could not read that file. Try a PNG or JPG preview.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveReport = async (): Promise<string | null> => {
    if (summaries.length === 0) return null;

    setSaveMessage("");
    setSaveError("");

    if (!leadEmail.trim()) {
      setSaveError("Please enter your email before saving the checker report.");
      return null;
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
          files: summaries.map((summary, index) => ({
            fileName: summary.fileName,
            fileType: summary.fileType,
            fileSizeBytes: summary.fileSizeBytes,
            dimensions: summary.dimensions ?? null,
            checkerResults: summary.results,
            outcome: getCheckerOutcome(summary.results),
            orientation: getCheckerOrientation(summary.dimensions),
            smartQc: smartQcReports[index] ?? null,
          })),
          packageSummary,
          file: {
            fileName: primarySummary?.fileName,
            fileType: primarySummary?.fileType,
            fileSizeBytes: primarySummary?.fileSizeBytes,
            dimensions: primarySummary?.dimensions ?? null,
          },
          checkerResults: summaries.flatMap((summary) =>
            summary.results.map((result) => ({
              ...result,
              fileName: summary.fileName,
            }))
          ),
          recommendedAssets: packageSummary,
          summary: {
            fileCount: summaries.length,
            packageSummary,
            files: summaries.map((summary, index) => ({
              fileName: summary.fileName,
              dimensions: summary.dimensions ?? null,
              outcome: getCheckerOutcome(summary.results),
              orientation: getCheckerOrientation(summary.dimensions),
              smartQc: smartQcReports[index] ?? null,
            })),
            savedAt: new Date().toISOString(),
          },
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Could not save the checker report.");
      }

      setSaveMessage(
        "Checker report saved. We\u2019ve emailed you a copy. To have FrameReady visually review and fix the artwork, start an order and upload your file."
      );
      if (typeof json?.submissionId === "string") {
        setSavedSubmissionId(json.submissionId);
        return json.submissionId;
      }

      return null;
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the checker report right now. Please try again."
      );
      return null;
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleStartReviewRequest = async () => {
    setReviewMessage("");
    setReviewError("");

    if (!leadEmail.trim()) {
      setReviewError("Enter your email before requesting a free review.");
      return;
    }

    try {
      setIsRequestingReview(true);
      const submissionId = savedSubmissionId || (await handleSaveReport());

      if (!submissionId) {
        setReviewError("Save the checker report before requesting a free review.");
        return;
      }

      setIsReviewUploadOpen(true);
    } finally {
      setIsRequestingReview(false);
    }
  };

  const handleReviewFileChange = (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    const validationError = validateReviewUploadFiles(files);

    setReviewMessage("");
    setReviewError(validationError || "");
    setReviewUploadFiles(validationError ? [] : files);
  };

  const handleSubmitReviewRequest = async () => {
    setReviewMessage("");
    setReviewError("");

    const validationError = validateReviewUploadFiles(reviewUploadFiles);

    if (validationError) {
      setReviewError(validationError);
      return;
    }

    if (!savedSubmissionId || !leadEmail.trim()) {
      setReviewError("Save the checker report before requesting a free review.");
      return;
    }

    try {
      setIsRequestingReview(true);

      const formData = new FormData();
      formData.append("submissionId", savedSubmissionId);
      formData.append("email", leadEmail);
      reviewUploadFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/checker/review-request", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Could not request a review right now.");
      }

      setReviewMessage(
        "Thanks. Your artwork has been uploaded for review. FrameReady will review it and follow up by email."
      );
      setReviewUploadFiles([]);
      setIsReviewUploadOpen(false);
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "Could not request a review right now. Please try again."
      );
    } finally {
      setIsRequestingReview(false);
    }
  };

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
              multiple
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
              PNG, JPG, TIFF, PSD, or ZIP. Upload up to {MAX_UPLOAD_FILES} files;
              PNG and JPG previews are read directly in your browser.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isChecking}
              className="mt-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isChecking ? "Checking..." : "Choose file(s)"}
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
            <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
              These are automated visual warnings, not guaranteed platform QC results.
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
          {summaries.length === 0 ? (
            <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-white/8 bg-black/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                Results
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Your checker report will appear here.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                Upload up to {MAX_UPLOAD_FILES} files at once for grouped file checks
                and a package completeness summary.
              </p>
            </div>
          ) : (
            <div>
              <CompactPackageSummaryCard
                assets={packageSummary}
                fileCount={summaries.length}
                warningCount={reportIssueStats.warningCount}
                issueCount={reportIssueStats.issueCount}
              />

              <div className="mt-4">
                <TopIssues issues={topIssues} />
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Package Summary details
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Expand to see which package assets are present or missing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setIsPackageSummaryExpanded((current) => !current)
                    }
                    className="w-fit rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                  >
                    {isPackageSummaryExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>

                {isPackageSummaryExpanded ? (
                  <div className="mt-4">
                    <PackageSummary assets={packageSummary} />
                  </div>
                ) : null}
              </div>

              <div className="mt-6 space-y-3">
                {summaries.map((summary, index) => {
                  const outcome = getCheckerOutcome(summary.results);
                  const outcomeStyle = severityStyles[outcome.severity];
                  const orientation = getCheckerOrientation(summary.dimensions);
                  const fileId = `${summary.fileName}-${index}`;
                  const isExpanded = expandedFileIds.has(fileId);
                  const resultCounts = getResultCounts(summary.results);
                  const detectedAssetLabel = getDetectedAssetLabel(
                    summary,
                    packageSummary
                  );
                  const fileStatus = getFileStatusLabel(summary.results);
                  const recommendedAssets = getRecommendedAssets(
                    selectedPlatforms,
                    summary.dimensions
                  );
                  const previewUrl = previewUrls.find(
                    (preview) => preview.fileName === summary.fileName
                  )?.url;
                  const smartQcReport = smartQcReports[index] ?? null;

                  return (
                    <section
                      key={fileId}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                              File {index + 1}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${fileStatus.className}`}
                            >
                              {fileStatus.label}
                            </span>
                          </div>
                          <h2 className="mt-2 break-all text-lg font-semibold text-white">
                            {summary.fileName}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {summary.dimensions
                              ? `${summary.dimensions.width} x ${summary.dimensions.height}px`
                              : "Dimensions need manual QC"}{" "}
                            - {detectedAssetLabel}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                            {resultCounts.fail + resultCounts.warning} warning/issue
                            {resultCounts.fail + resultCounts.warning === 1
                              ? ""
                              : "s"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFileExpanded(fileId)}
                            className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                          >
                            {isExpanded ? "Collapse" : "Expand"}
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <>
                          <div className={`mt-5 rounded-2xl border p-5 ${outcomeStyle.panel}`}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                                  Full checker result
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">
                                  {outcome.title}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
                                  {outcome.message}
                                </p>
                              </div>
                              <span
                                className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${outcomeStyle.badge}`}
                              >
                                {outcomeStyle.label}
                              </span>
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

                      <SmartQcPanel report={smartQcReport} />

                      <ul className="mt-5 space-y-3">
                        {summary.results.map((result) => (
                          <ResultRow key={result.id} result={result} />
                        ))}
                      </ul>

                      {previewUrl ? (
                        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                          <p className="text-sm font-semibold text-white">
                            Streaming thumbnail preview with safe-zone guide
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            If the title is hard to read here, it may need artwork QC.
                          </p>
                          <p className="mt-2 text-xs leading-5 text-amber-100">
                            These are automated visual warnings, not guaranteed platform QC results.
                          </p>
                          <div className="mt-5 flex flex-wrap items-end gap-5">
                            {[
                              { width: 300, label: "300px desktop/card preview" },
                              { width: 160, label: "160px app tile preview" },
                              { width: 80, label: "80px tiny thumbnail preview" },
                            ].map((preview) => (
                              <div key={preview.width} className="space-y-2">
                                <div
                                  className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30"
                                  style={{ width: preview.width }}
                                >
                                  <img
                                    src={previewUrl}
                                    alt={`${summary.fileName} thumbnail preview at ${preview.width}px`}
                                    width={preview.width}
                                    className="h-auto w-full object-contain"
                                  />
                                  <div className="pointer-events-none absolute inset-[8%] border border-cyan-300/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.18)]" />
                                  <div className="pointer-events-none absolute inset-[16%] border border-cyan-200/35" />
                                </div>
                                <p className="max-w-[180px] text-xs leading-5 text-slate-500">
                                  {preview.label}
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-3 w-5 border border-cyan-300/70" />
                              Outer safe-zone guide
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-3 w-5 border border-cyan-200/35" />
                              Inner title comfort guide
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Recommended assets for this file
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              Based on selected platforms. This compares only this file ratio.
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
                        </>
                      ) : null}
                    </section>
                  );
                })}
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

              <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_24px_70px_rgba(8,145,178,0.16)] backdrop-blur-xl">
                <h2 className="text-xl font-semibold text-white">
                  Request a FREE review or Save your report.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Save this checker report without uploading artwork, or ask
                  FrameReady to take a quick professional look before you place
                  an order. Email is required.
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

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartReviewRequest}
                    disabled={isRequestingReview}
                    className="inline-flex justify-center rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.26)] transition hover:shadow-[0_22px_55px_rgba(245,158,11,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {isRequestingReview ? "Preparing review..." : "Get a Free Review"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    disabled={isSavingReport}
                    className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {isSavingReport ? "Saving report..." : "Save checker report"}
                  </button>
                </div>

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

                {isReviewUploadOpen ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">
                      Upload artwork for review
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      PNG, JPG, TIFF, PSD, or ZIP. Upload up to{" "}
                      {MAX_REVIEW_UPLOAD_FILES} files, {MAX_REVIEW_FILE_SIZE_BYTES / 1024 / 1024}
                      MB each.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.tif,.tiff,.psd,.zip,image/png,image/jpeg,image/tiff,application/zip"
                      onChange={(event) => handleReviewFileChange(event.target.files)}
                      className="mt-4 block w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                    />
                    {reviewUploadFiles.length > 0 ? (
                      <ul className="mt-4 space-y-2 text-sm text-slate-300">
                        {reviewUploadFiles.map((file) => (
                          <li
                            key={`${file.name}-${file.size}`}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <span className="break-all">{file.name}</span>
                            <span className="ml-2 text-slate-500">
                              {formatCheckerFileSize(file.size)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSubmitReviewRequest}
                      disabled={isRequestingReview || reviewUploadFiles.length === 0}
                      className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRequestingReview
                        ? "Uploading artwork..."
                        : "Upload artwork for review"}
                    </button>
                  </div>
                ) : null}

                {reviewMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {reviewMessage}
                  </div>
                ) : null}

                {reviewError ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {reviewError}
                  </div>
                ) : null}
              </div>

            </div>
          )}
        </div>
      </section>
    </main>
  );
}
