export type CheckerSeverity = "pass" | "warning" | "fail" | "info";

export type CheckerDimensions = {
  width: number;
  height: number;
};

export type CheckerFileInput = {
  name: string;
  type: string;
  size: number;
  dimensions?: CheckerDimensions | null;
};

export type CheckerResult = {
  id: string;
  label: string;
  severity: CheckerSeverity;
  message: string;
};

export type CheckerSummary = {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  dimensions?: CheckerDimensions | null;
  results: CheckerResult[];
};

export type CheckerOrientation = "Portrait" | "Landscape" | "Square" | "Banner/wide";

export type CheckerPlatformId =
  | "filmhub"
  | "amazon"
  | "apple-tv"
  | "roku"
  | "tubi"
  | "youtube"
  | "fast";

export type CheckerAssetId =
  | "poster-2x3"
  | "poster-3x4"
  | "key-art-16x9"
  | "textless-16x9"
  | "artwork-4x3"
  | "square-1x1"
  | "banner-2x1"
  | "banner-16x6";

export type CheckerPlatform = {
  id: CheckerPlatformId;
  label: string;
};

export type CheckerRecommendedAsset = {
  id: CheckerAssetId;
  label: string;
  ratio: number;
  status: "present" | "missing" | "unknown";
  message: string;
};

export type CheckerPackageAsset = {
  id: CheckerAssetId;
  label: string;
  status: "present" | "missing";
  matchedFileNames: string[];
};

export const CHECKER_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const RATIO_TOLERANCE = 0.04;

export const CHECKER_ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "tif",
  "tiff",
  "psd",
  "zip",
] as const;

export const CHECKER_PLATFORMS: CheckerPlatform[] = [
  { id: "filmhub", label: "Filmhub" },
  { id: "amazon", label: "Amazon" },
  { id: "apple-tv", label: "Apple TV" },
  { id: "roku", label: "Roku" },
  { id: "tubi", label: "Tubi" },
  { id: "youtube", label: "YouTube" },
  { id: "fast", label: "FAST channels" },
];

const ASSET_TARGETS: Array<{
  id: CheckerAssetId;
  label: string;
  ratio: number;
  minWidth: number;
  minHeight: number;
}> = [
  {
    id: "poster-2x3",
    label: "2:3 poster",
    ratio: 2 / 3,
    minWidth: 1400,
    minHeight: 2100,
  },
  {
    id: "poster-3x4",
    label: "3:4 poster",
    ratio: 3 / 4,
    minWidth: 1575,
    minHeight: 2100,
  },
  {
    id: "key-art-16x9",
    label: "16:9 key art",
    ratio: 16 / 9,
    minWidth: 1920,
    minHeight: 1080,
  },
  {
    id: "textless-16x9",
    label: "16:9 textless",
    ratio: 16 / 9,
    minWidth: 1920,
    minHeight: 1080,
  },
  {
    id: "artwork-4x3",
    label: "4:3 artwork",
    ratio: 4 / 3,
    minWidth: 1024,
    minHeight: 768,
  },
  {
    id: "banner-2x1",
    label: "2:1 banner",
    ratio: 2,
    minWidth: 1920,
    minHeight: 960,
  },
  {
    id: "banner-16x6",
    label: "16:6 banner",
    ratio: 16 / 6,
    minWidth: 1920,
    minHeight: 720,
  },
  {
    id: "square-1x1",
    label: "1:1 square",
    ratio: 1,
    minWidth: 1400,
    minHeight: 1400,
  },
] as const;

const PLATFORM_ASSET_MAP: Record<CheckerPlatformId, CheckerAssetId[]> = {
  filmhub: ["poster-2x3", "poster-3x4", "key-art-16x9"],
  amazon: ["poster-2x3", "key-art-16x9", "textless-16x9", "artwork-4x3", "square-1x1"],
  "apple-tv": ["key-art-16x9", "textless-16x9", "banner-2x1"],
  roku: ["key-art-16x9", "artwork-4x3"],
  tubi: ["poster-2x3", "key-art-16x9", "square-1x1"],
  youtube: ["key-art-16x9", "square-1x1"],
  fast: ["key-art-16x9", "textless-16x9", "artwork-4x3", "banner-2x1"],
};

export function getArtworkFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function isCheckerFileTypeSupported(fileName: string): boolean {
  const extension = getArtworkFileExtension(fileName);
  return CHECKER_ALLOWED_EXTENSIONS.includes(
    extension as (typeof CHECKER_ALLOWED_EXTENSIONS)[number]
  );
}

export function canReadCheckerDimensions(fileName: string, mimeType: string): boolean {
  const extension = getArtworkFileExtension(fileName);

  return (
    ["png", "jpg", "jpeg"].includes(extension) ||
    ["image/png", "image/jpeg", "image/jpg"].includes(mimeType)
  );
}

export function formatCheckerFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 MB";
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "unknown";

  const rounded = Math.round(value * 100) / 100;
  return `${rounded}:1`;
}

function getClosestRatioTarget(
  dimensions: CheckerDimensions
): (typeof ASSET_TARGETS)[number] | null {
  const actualRatio = dimensions.width / dimensions.height;
  const sortedTargets = [...ASSET_TARGETS].sort(
    (a, b) => Math.abs(actualRatio - a.ratio) - Math.abs(actualRatio - b.ratio)
  );

  const closest = sortedTargets[0];
  const distance = Math.abs(actualRatio - closest.ratio);

  return distance <= RATIO_TOLERANCE ? closest : null;
}

export function getCheckerOrientation(
  dimensions?: CheckerDimensions | null
): CheckerOrientation | null {
  if (!dimensions) return null;

  const ratio = dimensions.width / dimensions.height;

  if (Math.abs(ratio - 1) <= 0.04) return "Square";
  if (ratio >= 1.85) return "Banner/wide";
  if (ratio > 1) return "Landscape";
  return "Portrait";
}

export function getFilenameWarnings(fileName: string): string[] {
  const warnings: string[] = [];
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const lowerName = fileName.toLowerCase();
  const lowerBaseName = baseName.toLowerCase();

  if (/final[\s_-]*final/.test(lowerName)) {
    warnings.push("Filename contains a final final pattern.");
  }

  if (/\s/.test(fileName)) {
    warnings.push("Filename contains spaces.");
  }

  if (/[^a-zA-Z0-9._-]/.test(fileName)) {
    warnings.push("Filename contains special characters.");
  }

  if (["image", "img", "poster", "artwork", "final", "keyart", "key-art"].includes(lowerBaseName)) {
    warnings.push("Filename is vague. A title, format, and size are easier to track.");
  }

  return warnings;
}

export function getRecommendedAssets(
  platformIds: CheckerPlatformId[],
  dimensions?: CheckerDimensions | null
): CheckerRecommendedAsset[] {
  const requestedAssetIds = Array.from(
    new Set(
      platformIds.flatMap((platformId) => PLATFORM_ASSET_MAP[platformId] ?? [])
    )
  );

  const actualRatio = dimensions ? dimensions.width / dimensions.height : null;

  return requestedAssetIds
    .map((assetId) => ASSET_TARGETS.find((asset) => asset.id === assetId))
    .filter((asset): asset is (typeof ASSET_TARGETS)[number] => Boolean(asset))
    .map((asset) => {
      if (!actualRatio) {
        return {
          ...asset,
          status: "unknown",
          message: "Recommended for selected platforms. Dimensions were not readable in this upload.",
        };
      }

      const isLikelyMatch = Math.abs(actualRatio - asset.ratio) <= RATIO_TOLERANCE;

      return {
        ...asset,
        status: isLikelyMatch ? "present" : "missing",
        message: isLikelyMatch
          ? "Likely matching asset present in this upload."
          : "Recommended asset missing from this upload.",
      };
    });
}

export function getPackageCompleteness(
  summaries: CheckerSummary[]
): CheckerPackageAsset[] {
  const readableSummaries = summaries.filter((summary) => summary.dimensions);
  const usedFileNames = new Set<string>();

  return ASSET_TARGETS.map((asset) => {
    const matches = readableSummaries.filter((summary) => {
      if (!summary.dimensions) return false;
      const ratio = summary.dimensions.width / summary.dimensions.height;
      return Math.abs(ratio - asset.ratio) <= RATIO_TOLERANCE;
    });

    const availableMatches =
      asset.id === "textless-16x9"
        ? matches.filter((summary) => !usedFileNames.has(summary.fileName))
        : matches;

    const match = availableMatches[0];

    if (match) {
      usedFileNames.add(match.fileName);
    }

    return {
      id: asset.id,
      label: asset.label,
      status: match ? "present" : "missing",
      matchedFileNames: match ? [match.fileName] : [],
    };
  });
}

export function checkArtworkFile(input: CheckerFileInput): CheckerSummary {
  const results: CheckerResult[] = [];
  const extension = getArtworkFileExtension(input.name);
  const dimensions = input.dimensions ?? null;
  const filenameWarnings = getFilenameWarnings(input.name);

  if (isCheckerFileTypeSupported(input.name)) {
    results.push({
      id: "file-type",
      label: "File type",
      severity: "pass",
      message: `${extension.toUpperCase()} is accepted for checker review.`,
    });
  } else {
    results.push({
      id: "file-type",
      label: "File type",
      severity: "fail",
      message: "Use PNG, JPG, TIFF, PSD, or ZIP artwork files.",
    });
  }

  if (input.size <= CHECKER_MAX_FILE_SIZE_BYTES) {
    results.push({
      id: "file-size",
      label: "File size",
      severity: "pass",
      message: `${formatCheckerFileSize(input.size)} is under the 50 MB checker limit.`,
    });
  } else {
    results.push({
      id: "file-size",
      label: "File size",
      severity: "fail",
      message: `${formatCheckerFileSize(input.size)} is over the 50 MB checker limit.`,
    });
  }

  if (filenameWarnings.length > 0) {
    results.push({
      id: "filename",
      label: "Filename",
      severity: "warning",
      message: filenameWarnings.join(" "),
    });
  } else {
    results.push({
      id: "filename",
      label: "Filename",
      severity: "pass",
      message: "Filename looks clean for handoff and tracking.",
    });
  }

  if (!canReadCheckerDimensions(input.name, input.type)) {
    results.push({
      id: "dimensions-readable",
      label: "Dimensions",
      severity: "info",
      message:
        "This file type needs manual QC for dimensions. Browser previews cannot reliably inspect PSD, ZIP, or TIFF files.",
    });
  } else if (!dimensions) {
    results.push({
      id: "dimensions-readable",
      label: "Dimensions",
      severity: "warning",
      message:
        "The checker could not read this image. Re-export the file or try a PNG/JPG preview.",
    });
  } else {
    const orientation = getCheckerOrientation(dimensions);
    const closestRatio = getClosestRatioTarget(dimensions);
    const closestRatioLabel =
      closestRatio?.ratio === 16 / 9
        ? "16:9 key art / textless"
        : closestRatio?.label;
    const clearsAssetMinimum = closestRatio
      ? dimensions.width >= closestRatio.minWidth &&
        dimensions.height >= closestRatio.minHeight
      : false;

    results.push({
      id: "orientation",
      label: "Orientation",
      severity: "info",
      message: orientation
        ? `This upload reads as ${orientation.toLowerCase()} artwork.`
        : "Orientation could not be determined.",
    });

    results.push({
      id: "minimum-resolution",
      label: "Minimum resolution",
      severity: closestRatio && clearsAssetMinimum ? "pass" : "warning",
      message: closestRatio
        ? clearsAssetMinimum
          ? `${dimensions.width} x ${dimensions.height}px clears the ${closestRatio.label} baseline checker minimum of ${closestRatio.minWidth} x ${closestRatio.minHeight}px.`
          : `${dimensions.width} x ${dimensions.height}px is below the ${closestRatio.label} baseline checker minimum of ${closestRatio.minWidth} x ${closestRatio.minHeight}px.`
        : `${dimensions.width} x ${dimensions.height}px does not match a known checker ratio, so resolution needs platform-specific review.`,
    });

    results.push({
      id: "aspect-ratio",
      label: "Aspect ratio",
      severity: closestRatio ? "pass" : "warning",
      message: closestRatio
        ? `This looks close to a common ${closestRatioLabel} deliverable.`
        : `Ratio ${formatRatio(dimensions.width / dimensions.height)} may need platform-specific formatting.`,
    });

    const shortSide = Math.min(dimensions.width, dimensions.height);
    const longSide = Math.max(dimensions.width, dimensions.height);

    results.push({
      id: "delivery-flexibility",
      label: "Delivery flexibility",
      severity: shortSide >= 2000 && longSide >= 3000 ? "pass" : "warning",
      message:
        shortSide >= 2000 && longSide >= 3000
          ? "This has enough pixel room for several common artwork exports."
          : "This may work for some placements, but larger source art gives more room for platform exports.",
    });
  }

  results.push({
    id: "manual-qc",
    label: "Manual QC still needed",
    severity: "info",
    message:
      "Automated checks cannot verify safe zones, title legibility, compression artifacts, or every platform rule.",
  });

  return {
    fileName: input.name,
    fileType: input.type || extension || "unknown",
    fileSizeBytes: input.size,
    dimensions,
    results,
  };
}

export function getCheckerOutcome(results: CheckerResult[]): {
  severity: CheckerSeverity;
  title: string;
  message: string;
} {
  if (results.some((result) => result.severity === "fail")) {
    return {
      severity: "fail",
      title: "Needs fixes before delivery",
      message:
        "One or more baseline checks failed. Fix those before sending artwork to a platform or ordering final formatting.",
    };
  }

  if (results.some((result) => result.severity === "warning")) {
    return {
      severity: "warning",
      title: "Likely usable, but review needed",
      message:
        "No hard blockers were found, but this file still needs a closer platform-specific review.",
    };
  }

  return {
    severity: "pass",
    title: "Passed baseline checks",
    message:
      "This file clears the automated baseline checks. A final human QC pass is still recommended.",
  };
}
