"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type UploadedFileRecord,
  type OrderRow,
  type AdminOrder,
  type RevisionHistoryItem,
} from "@/types/order";

type View = "home" | "dashboard" | "upload" | "review" | "admin";

type AdminFilter =
  | "all"
  | "files_received"
  | "in_progress"
  | "ready_for_delivery"
  | "completed"
  | "revisions"
  | "archived";


type FileMessage = { type: "error" | "warning"; text: string };

type PackageOption = {
  id: "essential" | "pro" | "studio";
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  note?: string;
  features: string[];
};

type AddOn = {
  id: "variation" | "localized" | "logo_pack" | "express";
  label: string;
  price: number;
  description: string;
  includes: string[];
};

const theme = {
  page:
    "bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_30%),linear-gradient(180deg,_#06070a_0%,_#0b0d14_45%,_#050608_100%)] text-white",
  heroPage:
    "bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] text-white",
  panel: "border border-white/8 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.35)]",
  panelStrong:
    "border border-indigo-400/20 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))] backdrop-blur-xl shadow-[0_28px_80px_rgba(79,70,229,0.18)]",
  mutedText: "text-slate-400",
  softText: "text-slate-300",
  accentLine: "text-indigo-300",
  buttonPrimary:
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  buttonSecondary:
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white",
  selectedCard:
    "border-cyan-400/70 bg-cyan-500/10 ring-1 ring-cyan-300/30 shadow-[0_0_32px_rgba(56,189,248,0.18)]",
  card: "border-white/8 bg-white/[0.03]",
  selectedAddon: "border-indigo-400/60 bg-indigo-500/12 shadow-[0_0_28px_rgba(99,102,241,0.18)]",
  pill: "border border-white/10 bg-white/[0.04] text-slate-300",
  input: "border border-white/10 bg-black/25 text-white placeholder:text-slate-500",
  errorPanel: "border border-rose-400/20 bg-rose-500/10",
  warnPanel: "border border-amber-400/20 bg-amber-500/10 text-amber-100",
};

const packageOptions: PackageOption[] = [
  {
    id: "essential",
    name: "🧱 Essential",
    price: 99,
    priceLabel: "$99",
    description: "Perfect for indie filmmakers & first-time releases",
    features: [
      "2:3 Poster (Master artwork)",
      "3:4 Poster (Filmhub ready)",
      "16:9 Key Art (with title)",
      "4:3 Artwork (TV / FAST platforms)",
      "Includes 1 round of minor artwork revisions"
    ],
  },
  {
    id: "pro",
    name: "🔥 Pro",
    price: 199,
    priceLabel: "$199",
    description: "Best value — covers almost all platforms",
    note: "Includes assets required for most major platform placements",
    features: [
      "Everything in Essential",
      "16:9 Textless Background (required for Amazon / Apple placements)",
      "1:1 Square Artwork",
      "2:1 Banner",
      "Basic Title Treatment (transparent PNG)",
      "Includes 2 rounds of minor artwork revisions"
    ],
  },
  {
    id: "studio",
    name: "💎 Studio",
    price: 349,
    priceLabel: "$349",
    description: "For serious releases + maximum visibility",
    features: [
      "Everything in Pro",
      "16:6 Ultra-wide Banner",
      "Apple-style Hero Backgrounds",
      "Advanced Title Treatment (multiple variations)",
      "Includes 2 rounds of minor artwork revisions"
    ],
  },
];

const addOns: AddOn[] = [
  {
    id: "variation",
    label: "🎨 Artwork Variation Pack",
    price: 75,
    description: "Alternate version of your key artwork designed to improve performance across platforms.",
    includes: [
      "Alternate version of your key artwork",
      "Multiple formats (poster + key art + square)",
      "Different visual approach to improve performance",
      "Designed to increase click-through rate and platform visibility",
    ],
  },
  {
    id: "localized",
    label: "🌍 Localised Versions Pack",
    price: 50,
    description: "Per-language localized title treatment and layout adaptation.",
    includes: [
      "Localized versions of selected artwork",
      "Title treatment adapted per language",
      "Layout adjustments for text length",
    ],
  },
  {
    id: "logo_pack",
    label: "🔤 Title Treatment Pack",
    price: 100,
    description: "Flexible title treatment exports for platform use.",
    includes: [
      "Primary title treatment (transparent PNG)",
      "Light & dark versions",
      "Horizontal + stacked layouts where possible",
      "Simplified version",
    ],
  },
  {
    id: "express",
    label: "⚡ Express Delivery",
    price: 50,
    description: "Priority turnaround for faster delivery.",
    includes: ["24–48 hour delivery", "Priority queue handling", "Faster revision turnaround"],
  },
];

const MAX_FILE_SIZE_MB = 50;
const MIN_DIMENSION_PX = 1400;
const COMMON_LANGUAGES = ["Spanish", "French", "German", "Italian", "Japanese"] as const;

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const initialAdminOrders: AdminOrder[] = [
  {
    id: "FR-1001",
    clientName: "Lauren Clifton",
    clientEmail: "admin@framereadystudio.com",
    packageName: "🔥 Pro",
    total: 299,
    status: "in_progress",
    paid: true,
    turnaround: "Due in 1 day",
    submittedAt: "Today, 9:42 AM",
    languages: ["Spanish", "French"],
    localizedTitles: {
      Spanish: "Título en español",
      French: "Titre en français",
    },
    addOns: ["🌍 Localised Versions Pack", "⚡ Express Delivery"],
    sourceFiles: [
      {
        path: "artwork/poster-master.psd",
        bucket: "order-uploads",
        fileName: "poster-master.psd",
      },
      {
        path: "artwork/filmhub-key-art.png",
        bucket: "order-uploads",
        fileName: "filmhub-key-art.png",
      },
    ],
    deliveryFiles: [
      {
        path: "deliveries/2x3-poster-final.jpg",
        bucket: "order-uploads",
        fileName: "2x3-poster-final.jpg",
      },
      {
        path: "deliveries/16x9-keyart-final.jpg",
        bucket: "order-uploads",
        fileName: "16x9-keyart-final.jpg",
      },
    ],
    revisionDeliveryFiles: [],
    notes: "Waiting on final localized title spacing review before delivery.",
  },
  {
    id: "FR-1002",
    clientName: "Northlight Pictures",
    clientEmail: "deliveries@northlightpictures.com",
    packageName: "🧱 Essential",
    total: 99,
    status: "ready_for_delivery",
    paid: true,
    turnaround: "Due today",
    submittedAt: "Yesterday, 4:15 PM",
    languages: [],
    localizedTitles: {},
    addOns: [],
    sourceFiles: [
      {
        path: "artwork/master-poster.jpg",
        bucket: "order-uploads",
        fileName: "master-poster.jpg",
      },
    ],
    deliveryFiles: [
      {
        path: "deliveries/2x3-poster-final.jpg",
        bucket: "order-uploads",
        fileName: "2x3-poster-final.jpg",
      },
      {
        path: "deliveries/3x4-filmhub-final.jpg",
        bucket: "order-uploads",
        fileName: "3x4-filmhub-final.jpg",
      },
      {
        path: "deliveries/16x9-keyart-final.jpg",
        bucket: "order-uploads",
        fileName: "16x9-keyart-final.jpg",
      },
    ],
    revisionDeliveryFiles: [],
    notes: "All exports completed. Ready to send delivery link.",
  },
  {
    id: "FR-1003",
    clientName: "Blue Harbor Media",
    clientEmail: "ops@blueharbor.media",
    packageName: "💎 Studio",
    total: 524,
    status: "files_received",
    paid: true,
    turnaround: "Due in 3 days",
    submittedAt: "May 2, 11:08 AM",
    languages: ["German", "Japanese", "Italian"],
    localizedTitles: {
      German: "Deutscher Titel",
      Japanese: "日本語タイトル",
      Italian: "Titolo italiano",
    },
    addOns: [
      "🌍 Localised Versions Pack",
      "🔤 Title Treatment Pack",
      "🎨 Artwork Variation Pack",
    ],
    sourceFiles: [
      {
        path: "artwork/master-key-art.psd",
        bucket: "order-uploads",
        fileName: "master-key-art.psd",
      },
      {
        path: "artwork/title-treatment.ai",
        bucket: "order-uploads",
        fileName: "title-treatment.ai",
      },
      {
        path: "artwork/font-reference.zip",
        bucket: "order-uploads",
        fileName: "font-reference.zip",
      },
    ],
    deliveryFiles: [],
    revisionDeliveryFiles: [],
    notes: "Client supplied layered source files. Waiting to begin title treatment exports.",
  },
];

function calculateTotal(packageId: PackageOption["id"], addOnIds: string[], localizedCount: number): number {
  const selectedPackage = packageOptions.find((pkg) => pkg.id === packageId) ?? packageOptions[1];
  const addOnTotal = addOnIds.reduce((sum, addOnId) => {
    const addOn = addOns.find((item) => item.id === addOnId);
    if (!addOn) return sum;
    return sum + (addOn.id === "localized" ? addOn.price * localizedCount : addOn.price);
  }, 0);
  return selectedPackage.price + addOnTotal;
}

function formatUsd(amount: number): string {
  return `$${amount} USD`;
}

function runDevChecks(): void {
  console.assert(calculateTotal("essential", [], 1) === 99, "Essential base pricing failed");
  console.assert(calculateTotal("pro", ["express"], 1) === 249, "Express add-on pricing failed");
  console.assert(calculateTotal("pro", ["localized"], 3) === 349, "Localized pricing failed");
  console.assert(calculateTotal("studio", ["variation", "logo_pack"], 1) === 524, "Studio pricing failed");
}

runDevChecks();

export default function FrameReadyApp({
  initialView = "home",
  initialAdminAuthenticated = false,
}: {
  initialView?: View;
  initialAdminAuthenticated?: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption["id"]>("pro");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [localizedLanguageCount, setLocalizedLanguageCount] = useState(1);
  const [localizedLanguages, setLocalizedLanguages] = useState<string[]>([]);
  const [localizedTitles, setLocalizedTitles] = useState<Record<string, string>>({});
  const [localizedRegionGuidelines, setLocalizedRegionGuidelines] = useState("");
  const [packageFontInfo, setPackageFontInfo] = useState("");
  const [packageFontFiles, setPackageFontFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedArtworkFiles, setUploadedArtworkFiles] = useState<UploadedFileRecord[]>([]);
const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
const [fileMessages, setFileMessages] = useState<FileMessage[]>([]);
const [isDragging, setIsDragging] = useState(false);
const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
const [adminOrdersError, setAdminOrdersError] = useState("");
const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");
const [lastCleanupRun, setLastCleanupRun] = useState<string | null>(null);
const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
const [showSourceFiles, setShowSourceFiles] = useState(true);
const [expandedRevisionDeliverySet, setExpandedRevisionDeliverySet] =
  useState<string>("");
const [showDeliveryFiles, setShowDeliveryFiles] = useState(true);
const [showRevisionDeliveryFiles, setShowRevisionDeliveryFiles] = useState(false);
const [showDeliveryTracking, setShowDeliveryTracking] =
  useState(false);
const [showRevisionRequests, setShowRevisionRequests] =
  useState(false);
const [revisionEmailSent, setRevisionEmailSent] = useState<string | null>(null);
const [paidRevisionQuoteMessage, setPaidRevisionQuoteMessage] = useState("");
const [draftOrderNumber, setDraftOrderNumber] = useState("");
const [draftOrderDbId, setDraftOrderDbId] = useState<string | null>(null);
const adminFilterOptions = [
  { label: "All", value: "all" },
  { label: "Files Received", value: "files_received" },
  { label: "In Progress", value: "in_progress" },
  { label: "Ready for Delivery", value: "ready_for_delivery" },
  { label: "Completed", value: "completed" },
  { label: "Revisions", value: "revisions" },
  { label: "Archived", value: "archived" },
] as const;

const [selectedAdminOrderId, setSelectedAdminOrderId] = useState("FR-1001");
const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(initialAdminAuthenticated);
const [adminEmail, setAdminEmail] = useState("");
const [adminPassword, setAdminPassword] = useState("");
const [adminAuthError, setAdminAuthError] = useState("");
const [clientName, setClientName] = useState("");
const [clientEmail, setClientEmail] = useState("");
const [confirmClientEmail, setConfirmClientEmail] = useState("");
const [clientNotes, setClientNotes] = useState("");
const [checkoutError, setCheckoutError] = useState("");
const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
const [isUploadingDeliveryFiles, setIsUploadingDeliveryFiles] = useState(false);
const [deliveryUploadMessage, setDeliveryUploadMessage] = useState("");
const [isDeliveryDragOver, setIsDeliveryDragOver] = useState(false);
const [isRevisionDeliveryDragOver, setIsRevisionDeliveryDragOver] = useState(false);
const [isUploadingRevisionDeliveryFiles, setIsUploadingRevisionDeliveryFiles] = useState(false);
const [revisionDeliveryUploadMessage, setRevisionDeliveryUploadMessage] = useState("");
const [paidRevisionAmount, setPaidRevisionAmount] = useState("");

const selectedPackageData =
  packageOptions.find((pkg) => pkg.id === selectedPackage) ?? packageOptions[1];

const loadAdminOrders = async () => {
  try {
    setAdminOrdersLoading(true);
    setAdminOrdersError("");

    const response = await fetch("/api/admin/orders", {
      method: "GET",
      cache: "no-store",
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to load admin orders.");
    }

    const mappedOrders: AdminOrder[] = (json.orders || []).map(mapOrderRowToAdminOrder);

    console.log(
  "Loaded admin orders revision sets:",
  mappedOrders.map((order) => ({
    id: order.id,
    dbId: order.dbId,
    revisionDeliverySets: order.revisionDeliverySets,
  }))
);
    
setAdminOrders(mappedOrders);

    if (mappedOrders.length > 0) {
      setSelectedAdminOrderId((current) =>
  current &&
  mappedOrders.some((order) => (order.dbId ?? order.id) === current)
    ? current
    : mappedOrders[0].dbId ?? mappedOrders[0].id
);
    }
  } catch (error) {
    setAdminOrdersError(
      error instanceof Error ? error.message : "Unable to load admin orders."
    );
  } finally {
    setAdminOrdersLoading(false);
  }
};

const loadCleanupStatus = async () => {
  try {
    const response = await fetch("/api/admin/cleanup-orders/status");
    const json = await response.json();

    if (response.ok) {
      setLastCleanupRun(json.lastRun || null);
    }
  } catch (error) {
    console.error("Failed to load cleanup status", error);
  }
};

useEffect(() => {
  if (view === "admin" && isAdminAuthenticated) {
    void loadAdminOrders();
    void loadCleanupStatus(); // ✅ ADD THIS
  }
}, [view, isAdminAuthenticated]);

const totalPrice = useMemo(
  () => calculateTotal(selectedPackage, selectedAddOns, localizedLanguageCount),
  [selectedPackage, selectedAddOns, localizedLanguageCount]
);

const getTurnaroundHours = (order: AdminOrder) => {
  const hasExpress =
    order.addOns?.some((addOn) =>
      String(addOn).toLowerCase().includes("express")
    ) ||
    order.packageName?.toLowerCase().includes("express");

  return hasExpress ? 24 : 72;
};

const getDueInfo = (order: AdminOrder) => {
  if (!order.submittedAt) {
    return {
      label: "Due date unknown",
      overdue: false,
      dueSoon: false,
    };
  }

  const createdAt = new Date(order.submittedAt).getTime();

  if (Number.isNaN(createdAt)) {
    return {
      label: "Due date unknown",
      overdue: false,
      dueSoon: false,
    };
  }

  const dueAt =
    createdAt + getTurnaroundHours(order) * 60 * 60 * 1000;

  const diffMs = dueAt - Date.now();

  const diffHours = Math.ceil(
    Math.abs(diffMs) / (1000 * 60 * 60)
  );

  if (diffMs < 0) {
    return {
      label: `Overdue by ${diffHours}h`,
      overdue: true,
      dueSoon: false,
    };
  }

  return {
    label: `Due in ${diffHours}h`,
    overdue: false,
    dueSoon: diffHours <= 12,
  };
};

const hasExpressDelivery = (order: AdminOrder) =>
  order.addOns?.some((addOn) =>
    addOn.toLowerCase().includes("express")
  ) ?? false;

  const filteredOrders: AdminOrder[] = adminOrders
  .filter((order: AdminOrder) => {
    if (adminFilter === "all") {
      return order.status !== "archived";
    }

    if (adminFilter === "revisions") {
      return (
        order.status === "revision_requested" ||
        order.status === "paid_revision_quote_requested"
      );
    }

    return order.status === adminFilter;
  })
  
  .sort((a, b) => {
  const aExpress =
  hasExpressDelivery(a) && a.status !== "completed";

  const bExpress =
  hasExpressDelivery(b) && b.status !== "completed";

  if (aExpress && !bExpress) return -1;
  if (bExpress && !aExpress) return 1;

  const aDue = getDueInfo(a);
  const bDue = getDueInfo(b);

  if (aDue.overdue && !bDue.overdue) return -1;
  if (bDue.overdue && !aDue.overdue) return 1;

  if (aDue.dueSoon && !bDue.dueSoon) return -1;
  if (bDue.dueSoon && !aDue.dueSoon) return 1;

  if (
    a.status === "revision_requested" &&
    b.status !== "revision_requested"
  ) {
    return -1;
  }

  if (
    b.status === "revision_requested" &&
    a.status !== "revision_requested"
  ) {
    return 1;
  }

  return (
    new Date(b.submittedAt || 0).getTime() -
    new Date(a.submittedAt || 0).getTime()
  );
});

console.log("adminFilter:", adminFilter);
console.log(
  "adminOrders statuses:",
  adminOrders.map((order: AdminOrder) => ({
    id: order.id,
    dbId: order.dbId,
    status: order.status,
    turnaround: order.turnaround,
  }))
);
console.log(
  "filteredOrders:",
  filteredOrders.map((order: AdminOrder) => ({
    id: order.id,
    status: order.status,
  }))
);

const getOrCreateDraftOrderNumber = () => {
  if (draftOrderNumber) return draftOrderNumber;

  const nextOrderNumber = `FR-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  setDraftOrderNumber(nextOrderNumber);
  return nextOrderNumber;
};

  const expandedPackageFeatures = useMemo(() => {
    if (selectedPackage === "essential") return packageOptions[0].features;
    if (selectedPackage === "pro") {
      return [
        ...packageOptions[0].features,
        ...packageOptions[1].features.filter((feature) => feature !== "Everything in Essential"),
      ];
    }
    return [
      ...packageOptions[0].features,
      ...packageOptions[1].features.filter((feature) => feature !== "Everything in Essential"),
      ...packageOptions[2].features.filter((feature) => feature !== "Everything in Pro"),
    ];
  }, [selectedPackage]);

  const selectedAddOnObjects = useMemo(
    () => addOns.filter((addOn) => selectedAddOns.includes(addOn.id)),
    [selectedAddOns]
  );

  const revisionFeature =
  selectedPackage === "essential"
    ? "Includes 1 round of minor artwork revisions"
    : "Includes 2 rounds of minor artwork revisions";

const cleanedFeatures = expandedPackageFeatures.filter(
  (feature) =>
    !feature.toLowerCase().includes("minor artwork revisions")
);

const whatYouReceiveItems = Array.from(
  new Set([
    ...cleanedFeatures,
    revisionFeature,
    ...selectedAddOnObjects.map((addOn) => addOn.label),
  ])
);

  const hasRevisions = adminOrders.some(
  (order) =>
    order.status === "revision_requested" ||
    order.status === "paid_revision_quote_requested"
);
  
  const selectedAdminOrder = adminOrders.find(
  (order) =>
    (order.dbId ?? order.id) === selectedAdminOrderId ||
    order.id === selectedAdminOrderId
);

const deliveryLocked =
  selectedAdminOrder?.deliveryStatus === "sent";

console.log("SELECTED ORDER DEBUG:", {
  selectedAdminOrderId,
  selectedId: selectedAdminOrder?.id,
  selectedDbId: selectedAdminOrder?.dbId,
  revisionDeliverySets: selectedAdminOrder?.revisionDeliverySets,
});

  useEffect(() => {
  if (selectedAdminOrder?.id) {
    setDraftOrderNumber(selectedAdminOrder.id);
  }
}, [selectedAdminOrder]);

  const adminSummary = {
  total: adminOrders.length,
  active: adminOrders.filter((order: AdminOrder) =>
    [
  "files_received",
  "in_progress",
  "revision_requested",
  "revision_in_progress",
  "paid_revision_paid",
  "paid_revision_in_progress",
].includes(order.status)
  ).length,
  ready: adminOrders.filter(
    (order: AdminOrder) => order.status === "ready_for_delivery"
  ).length,
  completed: adminOrders.filter(
    (order: AdminOrder) => order.status === "completed"
  ).length,
};

  const navigateTo = (nextView: View) => {
    setView(nextView);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns((prev) => {
      const next = prev.includes(addOnId) ? prev.filter((item) => item !== addOnId) : [...prev, addOnId];
      if (addOnId === "localized" && prev.includes(addOnId)) {
        setLocalizedLanguages([]);
        setLocalizedTitles({});
        setLocalizedRegionGuidelines("");
        setLocalizedLanguageCount(1);
      }
      return next;
    });
  };

  const toggleLocalizedLanguage = (language: string) => {
    setLocalizedLanguages((prev) => {
      const exists = prev.includes(language);
      const next = exists ? prev.filter((item) => item !== language) : [...prev, language];
      setLocalizedLanguageCount(Math.max(1, next.length || 1));
      if (exists) {
        setLocalizedTitles((current) => {
          const copy = { ...current };
          delete copy[language];
          return copy;
        });
      }
      return next;
    });
  };

  const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        const dimensions = { width: bitmap.width, height: bitmap.height };
        if (typeof bitmap.close === "function") bitmap.close();
        return dimensions;
      } catch {
        // Fallback below.
      }
    }

    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("unable_to_read_dimensions"));
      };
      image.src = objectUrl;
    });
  };

  const validateFiles = async (incomingFiles: File[]) => {
    const accepted: File[] = [];
    const messages: FileMessage[] = [];
    const allowedTypes = ["image/png", "image/jpeg", "image/tiff", "image/jpg"];

    for (const file of incomingFiles) {
      const tooLarge = file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
      const typeInvalid = !allowedTypes.includes(file.type) && !/(png|jpe?g|tiff?)$/i.test(file.name);

      if (typeInvalid) {
        messages.push({ type: "error", text: `${file.name} was blocked because only PNG, JPG, and TIFF files are accepted.` });
        continue;
      }
      if (tooLarge) {
        messages.push({ type: "error", text: `${file.name} was blocked because it is larger than ${MAX_FILE_SIZE_MB}MB.` });
        continue;
      }

      const isRasterImage = /(png|jpe?g)$/i.test(file.name) || ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      if (isRasterImage) {
        try {
          const { width, height } = await getImageDimensions(file);
          if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
            messages.push({
              type: "error",
              text: `${file.name} was blocked because its resolution is too low (${width}×${height}). Minimum size is ${MIN_DIMENSION_PX}px on both sides.`,
            });
            continue;
          }
        } catch {
          messages.push({ type: "error", text: `${file.name} could not be checked for minimum resolution. Please re-save and upload again.` });
          continue;
        }
      }

      if (/tiff?$/i.test(file.name)) {
        messages.push({
          type: "warning",
          text: `${file.name} was accepted. Resolution will be verified during QC because TIFF preview support varies in browsers.`,
        });
      }
      accepted.push(file);
    }

    setFiles((prev) => [...prev, ...accepted]);
    setFileMessages(messages);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;

  await validateAndAddFiles(e.target.files);

  e.target.value = "";
};

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  setIsDragging(false);

  if (!e.dataTransfer.files) return;

  await validateAndAddFiles(e.dataTransfer.files);
};

  const handlePackageFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(e.target.files || []);
    const acceptedFonts = incomingFiles.filter((file) => /\.(otf|ttf)$/i.test(file.name));
    const rejectedFonts = incomingFiles.filter((file) => !/\.(otf|ttf)$/i.test(file.name));

    setPackageFontFiles((prev) => [...prev, ...acceptedFonts]);

    if (rejectedFonts.length > 0) {
      setFileMessages((prev) => [
        ...prev,
        ...rejectedFonts.map((file) => ({
          type: "error" as const,
          text: `${file.name} was blocked because only OTF and TTF font files are accepted.`,
        })),
      ]);
    }
  };

  const removePackageFontFile = (name: string) => {
  setPackageFontFiles((prev) => prev.filter((file) => file.name !== name));

};

const removeFile = (name: string) => {
  setFiles((prev) => prev.filter((file) => file.name !== name));

  setUploadedArtworkFiles((prev) =>
    prev.filter((file) => file.fileName !== name)
  );
};

  const updateAdminOrder = async (
  id: string,
  updates: Partial<AdminOrder>
) => {
  try {
    const order = adminOrders.find((o) => o.id === id || o.dbId === id);

    if (!order?.dbId) {
      throw new Error("Missing database ID for order.");
    }

    const response = await fetch("/api/admin/update-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  orderId: order.dbId,
  status: updates.status,
  notes: updates.notes,
  deliveryFiles: updates.deliveryFiles,
  deliverySets: updates.deliverySets,
  deliveredAt: updates.deliveredAt,
  deliveredBy: updates.deliveredBy,

  revisionDeliveryFiles: updates.revisionDeliveryFiles,
  revisionDeliverySets: updates.revisionDeliverySets,
  revisionEmailSentAt: updates.revisionEmailSentAt,
  revisionHistory: updates.revisionHistory,
  
  deliveryEmailSentAt: updates.deliveryEmailSentAt,
  deliveryStatus: updates.deliveryStatus,
}),
    });

    const json = await response.json();

    console.log("Update order response:", json);

    if (!response.ok) {
      throw new Error(json?.error || "Failed to update order.");
    }

    setAdminOrders((prev: AdminOrder[]) =>
      prev.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      )
    );

    await loadAdminOrders();
  } catch (error) {
    console.error("Failed to update order", error);
  }
};

const handleSendDelivery = async () => {
  if (!selectedAdminOrder) return;

  const orderId = selectedAdminOrder.dbId || selectedAdminOrder.id;
  const now = new Date().toISOString();

  try {
    const response = await fetch("/api/admin/send-delivery-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to send delivery email.");
    }

    const now = new Date().toISOString();

const nextDeliverySets = [
  ...(selectedAdminOrder.deliverySets || []).filter(
    (set) => set.type !== "initial"
  ),
  {
    type: "initial",
    label: "Original delivery",
    files: selectedAdminOrder.deliveryFiles || [],
    sentAt: now,
  },
];

    setAdminOrders((prev: AdminOrder[]) =>
      prev.map((order) =>
        (order.dbId ?? order.id) === orderId
          ? {
              ...order,
              status: "completed",
              turnaround: "Delivered",
              deliveryStatus: "sent",
              deliveredAt: now,
              deliveryEmailSentAt: now,
              deliverySets: nextDeliverySets,
            }
          : order
      )
    );

    await loadAdminOrders();
  } catch (error) {
    console.error("Send delivery failed", error);
  }
};

const handleSendRevisionDelivery = async (
  revisionType?: "free_1" | "free_2" | "paid"
) => {
  if (!selectedAdminOrder) return;

  const orderId = selectedAdminOrder.dbId ?? selectedAdminOrder.id;

  try {
    const response = await fetch("/api/admin/send-delivery-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        deliveryType: "revision",
        revisionType,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to send revision delivery email.");
    }

    setRevisionEmailSent(orderId);

    await loadAdminOrders();
  } catch (error) {
    console.error("Send revision delivery failed", error);
  }
};

const handleDeleteDeliveryFile = async (filePath: string) => {
  if (!selectedAdminOrder) return;

  try {
    const response = await fetch("/api/admin/delete-delivery-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: selectedAdminOrder.dbId ?? selectedAdminOrder.id,
        filePath,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to delete delivery file.");
    }

    await loadAdminOrders();
  } catch (error) {
    console.error("Delete delivery file failed", error);
  }
};

const handleSendPaidRevisionPaymentLink = async () => {
  if (!selectedAdminOrder) return;

  const amountCents = Math.round(Number(paidRevisionAmount) * 100);

  if (!amountCents || amountCents < 100) {
    alert("Enter a valid amount.");
    return;
  }

  const response = await fetch(
    "/api/create-priority-revision-checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: selectedAdminOrder.id,
        publicOrderId: selectedAdminOrder.id,
        amountCents,
      }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    alert(json.error || "Could not send payment link.");
    return;
  }

  setPaidRevisionQuoteMessage("Paid revision payment link sent.");

  setPaidRevisionAmount("");

  await loadAdminOrders();
};

const handleDeleteRevisionDeliverySetFile = async (
  setType: "free_1" | "free_2" | "paid",
  fileIdentifier?: string
) => {
  if (!selectedAdminOrder || !fileIdentifier) return;

  try {
    const nextSets = (selectedAdminOrder.revisionDeliverySets || []).map((set) => {
      if (set.type !== setType) return set;

      return {
        ...set,
        files: (set.files || []).filter((file) => {
          const currentIdentifier = file.path || file.fileName;
          return currentIdentifier !== fileIdentifier;
        }),
        emailSentAt: null,
      };
    });

    await updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
      revisionDeliverySets: nextSets,
      revisionEmailSentAt: "",
    });

    await loadAdminOrders();
  } catch (error) {
    console.error("Delete revision delivery set file failed", error);
  }
};

const handleSendRevisionDeliverySetEmail = async (
  setType: "free_1" | "free_2" | "paid",
  label: string
) => {
  if (!selectedAdminOrder) return;

  try {
    const now = new Date().toISOString();

    const revisionHistory = selectedAdminOrder.revisionHistory || [];

const latestActiveRevisionIndex = revisionHistory.findLastIndex((item) => {
  if (setType === "paid") {
    return (
      item.type === "paid_revision_paid" &&
      item.status === "in_progress"
    );
  }

  return (
    item.type === "revision_requested" &&
    item.status === "in_progress"
  );
});

const updatedRevisionHistory =
  latestActiveRevisionIndex >= 0
    ? revisionHistory.map((item, index) =>
        index === latestActiveRevisionIndex
          ? {
              ...item,
              status: "completed" as const,
              deliveredAt: now,
            }
          : item
      )
    : revisionHistory;

    const revisionSet = (selectedAdminOrder.revisionDeliverySets || []).find(
      (set) => set.type === setType
    );

    const filesToSend = revisionSet?.files || [];

    if (filesToSend.length === 0) {
      throw new Error(`No files uploaded for ${label}.`);
    }

    const nextSets = (selectedAdminOrder.revisionDeliverySets || []).map((set) =>
      set.type === setType
        ? {
            ...set,
            emailSentAt: now,
          }
        : set
    );

    const nextDeliverySets = [
  ...(selectedAdminOrder.deliverySets || []).filter(
    (set) => set.type !== setType
  ),
  {
    type: setType,
    label,
    files: filesToSend,
    sentAt: now,
  },
];

console.log(
  "Saving paid revision completed history:",
  JSON.stringify(updatedRevisionHistory, null, 2)
);

console.log(
  "latestActiveRevisionIndex:",
  latestActiveRevisionIndex
);

await updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
      revisionDeliveryFiles: filesToSend,
      revisionDeliverySets: nextSets,
      deliverySets: nextDeliverySets,
      revisionEmailSentAt: now,
      deliveryStatus: "sent",
      revisionHistory: updatedRevisionHistory,
    });

    await handleSendRevisionDelivery(setType);

    await loadAdminOrders();
  } catch (error) {
    console.error("Send revision delivery set email failed", error);

    setRevisionDeliveryUploadMessage(
      error instanceof Error
        ? error.message
        : "Failed to send revision delivery email."
    );
  }
};

const uploadSignedFilesToStorage = async (
  uploadFiles: File[],
  kind: "delivery" | "revision-delivery",
  orderNumber: string
): Promise<UploadedFileRecord[]> => {
  if (!uploadFiles.length) return [];

  const signResponse = await fetch("/api/upload/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      orderNumber,
      files: uploadFiles.map((file) => ({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    }),
  });

  const signText = await signResponse.text();
  const signJson = signText ? JSON.parse(signText) : {};

  if (!signResponse.ok) {
    throw new Error(signJson?.error || "Could not prepare upload.");
  }

  const signedFiles = signJson.files as Array<
    UploadedFileRecord & {
      token: string;
      signedUrl: string;
    }
  >;

  const uploadedRecords: UploadedFileRecord[] = [];

  for (let index = 0; index < uploadFiles.length; index += 1) {
    const file = uploadFiles[index];
    const signedFile = signedFiles[index];

    const { error } = await supabaseBrowser.storage
      .from(signedFile.bucket)
      .uploadToSignedUrl(signedFile.path, signedFile.token, file);

    if (error) {
      throw new Error(`${file.name}: ${error.message}`);
    }

    const { data: previewData } = await supabaseBrowser.storage
  .from(signedFile.bucket)
  .createSignedUrl(signedFile.path, 60 * 60 * 24 * 7);

uploadedRecords.push({
  bucket: signedFile.bucket,
  path: signedFile.path,
  fileName: file.name,
  mimeType: file.type || "application/octet-stream",
  sizeBytes: file.size,
  publicUrl: null,
  signedUrl: previewData?.signedUrl ?? null,
});
  }

  return uploadedRecords;
};

const uploadDeliveryFiles = async (fileList: FileList | File[]) => {
  if (!selectedAdminOrder || fileList.length === 0) return;

  try {
    setIsUploadingDeliveryFiles(true);
    setDeliveryUploadMessage("Uploading delivery files...");

    const fileArray = Array.from(fileList);

    const uploadedFiles = await uploadSignedFilesToStorage(
      fileArray,
      "delivery",
      selectedAdminOrder.id
    );

    const nextFiles = [
      ...(selectedAdminOrder.deliveryFiles || []),
      ...uploadedFiles,
    ];

    await updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
      deliveryFiles: nextFiles,
      deliveryStatus: "ready_to_send",
    });

    setDeliveryUploadMessage("Delivery files uploaded successfully.");

    setTimeout(() => {
      setDeliveryUploadMessage("");
    }, 3000);

    await loadAdminOrders();

console.log("Uploaded delivery files:", uploadedFiles);
console.log("Next delivery files:", nextFiles);
  } catch (error) {
    console.error("Delivery upload failed", error);

    setDeliveryUploadMessage(
      error instanceof Error
        ? error.message
        : "Delivery upload failed. Please try again."
    );
  } finally {
    setIsUploadingDeliveryFiles(false);
  }
};

const uploadRevisionDeliverySetFiles = async (
  setType: "free_1" | "free_2" | "paid",
  label: string,
  fileList: FileList | File[]
) => {
  if (!selectedAdminOrder || fileList.length === 0) return;

  try {
    setIsUploadingRevisionDeliveryFiles(true);
    setRevisionDeliveryUploadMessage(`Uploading ${label} files...`);

    const fileArray = Array.from(fileList);

    const uploadedFiles = await uploadSignedFilesToStorage(
      fileArray,
      "revision-delivery",
      selectedAdminOrder.id
    );

    const existingSets = selectedAdminOrder.revisionDeliverySets || [];
    const existingSet = existingSets.find((set) => set.type === setType);

    const nextSets = existingSet
      ? existingSets.map((set) =>
          set.type === setType
            ? {
                ...set,
                files: [...(set.files || []), ...uploadedFiles],
              }
            : set
        )
      : [
          ...existingSets,
          {
            type: setType,
            label,
            files: uploadedFiles,
            emailSentAt: null,
          },
        ];

    await updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
      revisionDeliverySets: nextSets,
      revisionEmailSentAt: "",
      status: "ready_for_delivery",
    });

    console.log("Saving revisionDeliverySets:", nextSets);

    setAdminOrders((currentOrders) =>
  currentOrders.map((order) =>
    order.id === selectedAdminOrder.id
      ? {
          ...order,
          revisionDeliverySets: nextSets,
          revisionEmailSentAt: "",
          status: "ready_for_delivery",
        }
      : order
  )
);

    setRevisionDeliveryUploadMessage(`${label} files uploaded successfully.`);

    setTimeout(() => {
      setRevisionDeliveryUploadMessage("");
    }, 3000);

  } catch (error) {
    console.error("Revision delivery set upload failed", error);

    setRevisionDeliveryUploadMessage(
      error instanceof Error
        ? error.message
        : "Revision delivery upload failed."
    );
  } finally {
    setIsUploadingRevisionDeliveryFiles(false);
  }
};

const handleDeliveryFilesUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  if (!e.target.files?.length) return;

  await uploadDeliveryFiles(e.target.files);
  e.target.value = "";
};

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const email = adminEmail.trim();
  const password = adminPassword.trim();

  if (!email || !password) {
    setAdminAuthError("Enter your admin email and password to continue.");
    return;
  }

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await response.json();

    if (!response.ok) {
      setAdminAuthError(json?.error || "Login failed.");
      return;
    }

    setAdminAuthError("");
setAdminPassword("");
window.location.reload();
  } catch {
    setAdminAuthError("Unable to sign in right now.");
  }
};

const handleAdminLogout = async () => {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } finally {
    setAdminEmail("");
    setAdminPassword("");
    window.location.reload();
  }
};  

const localizedSelectionIsValid =
  !selectedAddOns.includes("localized") ||
  (localizedLanguages.length > 0 &&
    localizedLanguages.every(
      (language) => (localizedTitles[language] || "").trim().length > 0
    ));

const canProceedToCheckout =
  files.length > 0 &&
  clientName.trim().length > 0 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()) &&
  localizedSelectionIsValid;

const uploadFilesToStorage = async (
  uploadFiles: File[],
  kind: "artwork" | "font" | "delivery" | "revision-delivery"
): Promise<UploadedFileRecord[]> => {
  if (!uploadFiles.length) return [];  

  const orderNumber = getOrCreateDraftOrderNumber();

  const signResponse = await fetch("/api/upload/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      orderNumber,
      files: uploadFiles.map((file) => ({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    }),
  });

  const signJson = await signResponse.json();

  if (!signResponse.ok) {
    throw new Error(signJson?.error || "Could not prepare upload.");
  }

  const signedFiles = signJson.files as Array<
    UploadedFileRecord & {
      token: string;
      signedUrl: string;
    }
  >;

  const uploadedRecords: UploadedFileRecord[] = [];

  for (let index = 0; index < uploadFiles.length; index += 1) {
    const file = uploadFiles[index];
    const signedFile = signedFiles[index];

    const { error } = await supabaseBrowser.storage
      .from(signedFile.bucket)
      .uploadToSignedUrl(signedFile.path, signedFile.token, file);

    if (error) {
      throw new Error(`${file.name}: ${error.message}`);
    }

    const { data: previewData } = await supabaseBrowser.storage
  .from(signedFile.bucket)
  .createSignedUrl(signedFile.path, 60 * 60 * 24 * 7);

uploadedRecords.push({
  bucket: signedFile.bucket,
  path: signedFile.path,
  fileName: file.name,
  mimeType: file.type || "application/octet-stream",
  sizeBytes: file.size,
  publicUrl: null,
  signedUrl: previewData?.signedUrl ?? null,
});
  }

  return uploadedRecords;
};

const handleProceedToPayment = async () => {
  console.log("Proceed clicked");
console.log("uploadedArtworkFiles:", uploadedArtworkFiles);
console.log("clientName:", clientName);
console.log("clientEmail:", clientEmail);
console.log("confirmClientEmail:", confirmClientEmail);
  if (!uploadedArtworkFiles.length) {
  setCheckoutError("Upload artwork before continuing to payment.");
  return;
}

  if (!clientName.trim()) {
    setCheckoutError("Enter the client name before continuing to payment.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
    setCheckoutError("Enter a valid client email before continuing to payment.");
    return;
  }

  if (selectedAddOns.includes("localized") && localizedLanguages.length === 0) {
    setCheckoutError(
      "Select at least one localised language before continuing to payment."
    );
    return;
  }

  if (selectedAddOns.includes("localized")) {
    const missingLanguage = localizedLanguages.find(
      (language) => !(localizedTitles[language] || "").trim()
    );

    if (missingLanguage) {
      setCheckoutError(
        `Enter the translated title for ${missingLanguage} before continuing to payment.`
      );
      return;
    }
  }

  try {
    setCheckoutError("");
    setIsSubmittingCheckout(true);

    const uploadedFontFiles = await uploadFilesToStorage(packageFontFiles, "font");

    console.log("SENDING uploadedArtworkFiles:", uploadedArtworkFiles);
    // ✅ UPDATE EXISTING DRAFT ORDER
const updateRes = await fetch("/api/orders", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: draftOrderDbId,

    clientName: clientName.trim(),
    clientEmail: clientEmail.trim(),
    notes: clientNotes.trim(),

    localizedLanguages,
    localizedTitles,
    localizedRegionGuidelines,
    packageFontInfo,

    uploadedFiles: uploadedArtworkFiles,
uploadedFontFiles,
  }),
});

const updateText = await updateRes.text();
const updateJson = updateText ? JSON.parse(updateText) : {};

if (!updateRes.ok) {
  throw new Error(updateJson?.error || "Failed to update order.");
}

    const checkoutRes = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: draftOrderDbId }),
    });

    const checkoutJson = await checkoutRes.json();
    console.log("checkout response:", checkoutJson);

    if (!checkoutRes.ok || !checkoutJson?.url) {
      throw new Error(
        checkoutJson?.error || "Failed to create checkout session."
      );
    }

    window.location.href = checkoutJson.url;
  } catch (error) {
    setCheckoutError(
      error instanceof Error ? error.message : "Unable to continue to payment."
    );
  } finally {
    setIsSubmittingCheckout(false);
  }

const caseStudies = [
  {
    title: "Rejected by Filmhub — Fixed & Approved in 24 Hours",
    platform: "Filmhub",
    beforeImage: "/before-filmhub.jpg",
    afterImage: "/after-filmhub.jpg",
    issues: [
      "Title too small/illegible",
      "Text outside safe zone",
      "additional text",
    ],
    fixes: [
      "Rebuilt layout for Filmhub safe zones",
      "Increased title size and contrast",
      "Removed non-compliant elements",
      "Exported 2:3, 3:4 and 16:9 assets",
    ],
    result: [
      "Passed Filmhub QC",
      "Approved on first resubmission",
      "No further changes required",
    ],
    impact: "Avoided 2–3 week delay from repeated QC failures.",
  },
  {
    title: "Rejected by Amazon — Rebuilt for Multi-Platform Approval",
    platform: "Amazon Prime Video",
    beforeImage: "/before-amazon.jpg",
    afterImage: "/after-amazon.jpg",
    issues: [
      "Title outside safe zone",
      "Missing textless background",
      "Extra logos not permitted",
    ],
    fixes: [
      "Created 16:9 textless background",
      "Repositioned title inside safe zones",
      "Removed non-compliant graphics",
      "Generated full platform-ready set",
    ],
    result: [
      "Passed Amazon QC",
      "Compatible with Apple TV placements",
      "Delivered multi-platform package",
    ],
    impact: "Ready for distribution across multiple platforms without rework.",
  },
];

};

type CaseStudy = {
  title: string;
  platform: string;
  beforeImage: string;
  afterImage: string;
  issues: string[];
  fixes: string[];
  result: string[];
  impact: string;
};

const caseStudies: CaseStudy[] = [
  {
    title: "Rejected by Filmhub — Fixed & Approved in 24 Hours",
    platform: "Filmhub",
    beforeImage: "/before-filmhub.jpg",
    afterImage: "/after-filmhub.jpg",
    issues: [
      "Title too small/illegible",
      "Text outside safe zone",
      "Additional text",
    ],
    fixes: [
      "Rebuilt layout for safe zones",
      "Improved title legibility",
      "Removed non-compliant elements",
    ],
    result: ["Passed Filmhub QC", "Approved first submission"],
    impact: "Avoided 2–3 week delays from repeated QC failures.",
  },
  {
    title: "Rejected by Amazon — Rebuilt for Multi-Platform Approval",
    platform: "Amazon Prime Video",
    beforeImage: "/before-amazon.jpg",
    afterImage: "/after-amazon.jpg",
    issues: [
      "Artwork padded",
      "Character outside safe zone/cropped",
      "Additional logos & text not permitted",
    ],
    fixes: [
      "Removed padding",
      "Repositioned character inside safe zones",
      "Removed non-compliant graphics & text",
    ],
    result: [
      "Passed Amazon QC",
      "Compatible with Apple TV placements",
      "Delivered multi-platform package",
    ],
    impact: "Ready for distribution across multiple platforms without rework.",
  },
];

  const renderHome = () => (
    <div className={theme.heroPage}>
  {/* Hero */}
  <section className="flex min-h-[78vh] flex-col items-center justify-center px-6 pb-12 pt-20 text-center">
    <img
      src="/frameready-logo.png"
      alt="FrameReady logo"
      className="mb-4 w-20 cursor-pointer"
      onClick={() => navigateTo("home")}
    />

    <>
  <p className={`mb-3 text-xs uppercase tracking-[0.25em] ${theme.accentLine}`}>
    FrameReady
  </p>

  <h1 className="mb-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
    Professional Artwork QC for Streaming Platforms
  </h1>
</>

    <p className={`mb-5 max-w-xl text-base md:text-lg ${theme.mutedText}`}>
  <span className="font-semibold text-white">
    Professional Artwork QC & Formatting for Streaming Platforms.
  </span>
</p>

    <div className={`mb-8 max-w-xl space-y-3 text-base md:text-lg ${theme.mutedText}`}>
      <p>✔ Get your artwork approved the first time</p>
      <p>✔ Avoid costly rejections and delays</p>
      <p>✔ Save hours of guesswork on platform specs</p>
      <p>✔ Delivery-ready assets for Filmhub, Amazon, Netflix & more</p>
    </div>

    <button
      onClick={() => navigateTo("dashboard")}
      className={`rounded-xl px-8 py-3 ${theme.buttonPrimary}`}
    >
      Get Started
    </button>
  </section>

  <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

  {/* Case Studies */}
  <section className="mx-auto max-w-6xl px-6 pb-14 pt-6">
    <div className="mb-12 mx-auto max-w-3xl text-center">
  <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
    Case studies
  </p>

  <h2 className="mt-3 text-2xl font-bold text-white md:text-4xl">
    Real Fixes. Real Approvals.
  </h2>

  <p className={`mt-4 text-base ${theme.softText}`}>
    See how we turn rejected artwork into platform-approved assets.
  </p>
</div>

  <div className="grid gap-8">
    {caseStudies.map((study: CaseStudy) => (
      <motion.article
  key={study.title}
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.25 }}
  transition={{ duration: 0.65, ease: "easeOut" }}
  className="overflow-hidden rounded-[2rem] border border-white/6 bg-white/[0.03] shadow-2xl shadow-black/30"
>
  <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
    {/* Visual comparison */}
    <div className="grid grid-cols-2 border-b border-white/10 lg:border-b-0 lg:border-r">
      {/* Before */}
      <div className="group relative min-h-[320px] overflow-hidden bg-black/40">
        <img
          src={study.beforeImage}
          alt={`${study.platform} artwork rejected before QC fix`}
          className="w-full h-full object-contain object-top opacity-90 transition duration-500 group-hover:opacity-60"
        />

        <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
          QC FAIL
        </div>

        <div className="absolute inset-x-4 bottom-4 translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-2xl border border-red-400/30 bg-black/70 p-4 backdrop-blur">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Failed because
            </p>

            <div className="flex flex-wrap gap-2">
              {study.issues.map((issue: string) => (
                <span
                  key={issue}
                  className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-100"
                >
                  ❌ {issue}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* After */}
      <div className="group relative flex min-h-[320px] items-start justify-start overflow-hidden bg-black/40">
        <img
          src={study.afterImage}
          alt={`${study.platform} artwork after QC approval and formatting fix`}
          className="w-full h-full object-contain object-top opacity-95 transition duration-500"
        />

        <div className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
          QC PASS
        </div>

        <div className="absolute inset-x-4 bottom-4 translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-2xl border border-emerald-400/30 bg-black/70 p-4 backdrop-blur">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Approved after
            </p>

            <div className="flex flex-wrap gap-2">
              {study.result.map((result: string) => (
                <span
                  key={result}
                  className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100"
                >
                  ✅ {result}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Copy panel */}
    <div className="p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
          {study.platform}
        </span>

        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          Approved result
        </span>
      </div>

      <h3 className="text-xl font-semibold leading-snug text-white md:text-2xl">
  {study.title}
</h3>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-red-400/15 bg-red-500/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
            What failed
          </p>

          <ul className="space-y-1 text-sm text-slate-300">
            {study.issues.map((issue) => (
              <li key={issue} className="flex gap-2">
                <span className="text-red-300">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-sky-400/15 bg-sky-500/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            What we fixed
          </p>

          <ul className="space-y-1 text-sm text-slate-300">
            {study.fixes.map((fix: string) => (
              <li key={fix} className="flex gap-2">
                <span className="text-sky-300">•</span>
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="mb-2 text-sm font-semibold text-white">Result</p>

          <p className="text-sm leading-6 text-emerald-100">
            {study.impact}
          </p>
        </div>
      </div>
    </div>
  </div>
</motion.article>
    ))}
  </div>
</section>



<section className="mx-auto max-w-6xl px-6 py-16">
  <div className="mx-auto max-w-3xl text-center">
    <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
      Common QC problems
    </p>

    <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
      Why Your Artwork Gets Rejected
    </h2>

    <p className={`mt-4 text-lg ${theme.softText}`}>
      Most streaming platform rejections come from a handful of preventable issues.
    </p>
  </div>

  <div className="mt-10 grid gap-4 md:grid-cols-2">
    {[
      "Titles too small at thumbnail size",
      "Text outside platform safe zones",
      "Incorrect dimensions or aspect ratios",
      "Low contrast artwork",
      "Missing textless backgrounds",
      "Extra logos or laurels not allowed",
    ].map((item) => (
      <div
        key={item}
        className={`rounded-2xl border border-white/10 p-5 ${theme.panelStrong}`}
      >
        <p className="text-sm text-white">❌ {item}</p>
      </div>
    ))}
  </div>
</section>

<section className="mx-auto max-w-7xl px-6 pb-20">
  <div className={`rounded-3xl border border-white/10 p-8 ${theme.panelStrong}`}>
    <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
      Artwork QC help
    </p>

    <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
  Artwork Failed QC?
</h2>

<div className={`mt-6 space-y-5 text-base leading-7 ${theme.softText}`}>
  <p>
    If your artwork failed Filmhub QC, Amazon artwork checks, or
    streaming platform requirements, you’re not alone.
  </p>

  <div className="space-y-2">
    <p className="font-medium text-white">
      FrameReady fixes artwork issues like:
    </p>

    <ul className="space-y-1 pl-1">
      <li>• Incorrect dimensions</li>
      <li>• Titles outside safe zones</li>
      <li>• Illegible thumbnails</li>
      <li>• Missing textless assets</li>
      <li>• Non-compliant logos and laurels</li>
    </ul>
  </div>

  <p>
    We deliver platform-ready artwork packages designed for Filmhub,
    Amazon, Apple TV, Netflix, Tubi and more.
  </p>
</div>

    <div className="mt-6 flex flex-wrap gap-2">
      {[
        "Filmhub artwork rejected",
        "Amazon artwork requirements",
        "Artwork failed QC",
        "Streaming artwork fix",
        "OTT artwork formatting",
      ].map((keyword) => (
        <span
  key={keyword}
  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-500"
>
  {keyword}
</span>
      ))}
    </div>
  </div>
</section>

          <div className="mt-1 pb-4 text-center">
  <button
    onClick={() => navigateTo("dashboard")}
    className={`mb-8 rounded-xl px-8 py-3 ${theme.buttonPrimary}`}
  >
    Get Started
  </button>

  <p className={`text-sm ${theme.mutedText}`}>
    Have a unique project or questions? We can help. Email us at{" "}
    <a
      href="mailto:admin@framereadystudio.com"
      className="underline text-slate-300 transition hover:text-white"
    >
      admin@framereadystudio.com
    </a>
  </p>
</div>
        </div>
  );

  const renderDashboard = () => {
    const selectedLocalizedCount = Math.max(localizedLanguages.length, localizedLanguageCount);
const localizedAddonSelected = selectedAddOns.includes("localized");

const missingLocalizedTranslations =
  localizedAddonSelected &&
  localizedLanguages.some((language) => !localizedTitles[language]?.trim());

const noLocalizedLanguagesSelected =
  localizedAddonSelected && localizedLanguages.length === 0;

const canContinueToUpload =
  !localizedAddonSelected ||
  (!noLocalizedLanguagesSelected && !missingLocalizedTranslations);
    return (
      <div className={`min-h-screen p-6 ${theme.page}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/frameready-logo.png" alt="FrameReady logo" className="w-14 cursor-pointer" onClick={() => navigateTo("home")} />
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>Premium artwork delivery</p>
                <h1 className="text-2xl font-semibold">Build your delivery-ready artwork package</h1>
              </div>
            </div>
            <button
              onClick={() => navigateTo("home")}
              className={theme.buttonSecondary}
            >
              ← Back to Home
            </button>
          </div>

          <div className="grid gap-6">
  {/* LEFT COLUMN */}
  <div className="space-y-6">
    <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
        
          <h2 className="text-2xl font-semibold">
            Choose your package
          </h2>
          <p className={`mt-2 max-w-xl text-sm ${theme.mutedText}`}>
            Start with the package that matches your release, then add only the upgrades you actually need.
          </p>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-sm ${theme.panel}`}>
          <p className="font-medium text-white">
            Compatible with Filmhub, Amazon, Apple TV, Netflix, Roku, Tubi & YouTube
          </p>
        </div>
      </div>

      {/* NOTE */}
      <p className={`text-xs ${theme.mutedText}`}>
        Revision rounds cover minor artwork formatting adjustments. Major creative changes or new artwork requests may require a paid revision.
      </p>

      {/* PACKAGES */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {packageOptions.map((pkg) => {
          const isSelected = selectedPackage === pkg.id;

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedPackage(pkg.id)}
              className={`h-full rounded-3xl border p-5 text-left transition-all duration-200 ${
                isSelected ? theme.selectedCard : theme.card
              }`}
            >
              <div className="flex h-full flex-col">

                {/* TOP */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {pkg.name}
                    </h3>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {formatUsd(pkg.price)}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Selected
                    </span>
                  )}
                </div>

                {/* DESCRIPTION */}
                <p className={`text-sm ${theme.mutedText}`}>
                  {pkg.description}
                </p>

                {pkg.note && (
                  <p className={`mt-2 text-xs ${theme.accentLine}`}>
                    {pkg.note}
                  </p>
                )}

                {/* FEATURES */}
                <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/70">
                    Includes
                  </p>

                  <ul className={`space-y-1.5 text-sm ${theme.softText}`}>
                    {pkg.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                </div>

              </div>
            </button>
          );
        })}
      </div>
    </div>

              <div className={`rounded-3xl p-6 ${theme.panel}`}>
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Choose premium add-ons</h2>
                    <p className={`mt-2 text-sm ${theme.mutedText}`}>Add only the extras that improve approval speed, localization, or storefront performance.</p>
                  </div>
                  <p className={`max-w-sm text-sm ${theme.mutedText}`}>Your pricing updates instantly so there are no surprises at checkout.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {addOns.map((addOn) => {
                    const isSelected = selectedAddOns.includes(addOn.id);
                    return (
                      <button key={addOn.id} type="button" onClick={() => toggleAddOn(addOn.id)} className={`h-full rounded-2xl border p-5 text-left align-top transition-all ${isSelected ? theme.selectedAddon : theme.card}`}>
                        <div className="flex h-full flex-col items-start justify-start">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white">{addOn.label}</p>
                              <p className={`mt-2 text-xs leading-5 ${theme.mutedText}`}>{addOn.description}</p>
                            </div>
                            <div className="shrink-0 rounded-full border border-indigo-400/20 bg-black/20 px-3 py-1 text-sm font-semibold text-indigo-200">+{formatUsd(addOn.price)}</div>
                          </div>
                          <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Included</p>
                            <ul className={`space-y-1.5 text-xs ${theme.softText}`}>
                              {addOn.includes.map((item) => <li key={item}>• {item}</li>)}
                            </ul>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedAddOns.includes("localized") && (
                <div className={`rounded-3xl p-6 ${theme.panel}`}>
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">Set up localised versions</h2>
                      <p className={`mt-2 max-w-2xl text-sm ${theme.mutedText}`}>Choose the languages you need and paste the exact translated titles you want us to use.</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>$50 per language</div>
                  </div>

                  <div className="mb-5">
                    <p className={`mb-2 text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Available languages for selection</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_LANGUAGES.map((language) => {
                        const isSelected = localizedLanguages.includes(language);
                        return <button key={language} type="button" onClick={() => toggleLocalizedLanguage(language)} className={`rounded-full border px-3 py-2 text-xs ${isSelected ? theme.selectedAddon : theme.pill}`}>{language}</button>;
                      })}
                    </div>
                  </div>

                  {localizedLanguages.length > 0 && (
                    <div className="space-y-4">
                      {localizedLanguages.map((language) => (
                        <div key={language}>
                          <label className="mb-1 block text-xs font-medium text-white">{language} translated title (This is what we will use)</label>
                          <textarea value={localizedTitles[language] || ""} onChange={(e) => setLocalizedTitles((prev) => ({ ...prev, [language]: e.target.value }))} placeholder={`Paste ${language} translated title here`} className={`min-h-[84px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} />
                        </div>
                      ))}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-white">Region-specific guidelines (optional)</label>
                        <textarea value={localizedRegionGuidelines} onChange={(e) => setLocalizedRegionGuidelines(e.target.value)} placeholder="Add any market or territory-specific guidance" className={`min-h-[84px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              
            </div>

            <div className="grid gap-6">

  <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
                <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Live summary</p>
                <h2 className="text-xl font-semibold">Your package</h2>
                <p className={`mt-2 text-sm ${theme.mutedText}`}>Everything below updates live as you build your order.</p>

                <div className="mt-5 rounded-2xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedPackageData.name}</p>
                      <p className={`mt-1 text-sm ${theme.mutedText}`}>{selectedPackageData.description}</p>
                      <p className={`mt-2 text-xs ${theme.mutedText}`}>
  {{
    essential: "Includes 1 round of minor artwork revisions.",
    pro: "Includes 2 rounds of minor artwork revisions.",
    studio: "Includes 2 rounds of minor artwork revisions.",
  }[selectedPackage]}
</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatUsd(selectedPackageData.price)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-white">What you receive</p>
                  <ul className={`space-y-2 text-sm ${theme.softText}`}>
                    {whatYouReceiveItems.map((feature) => (
  <li key={feature}>• {feature}</li>
))}
                  </ul>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="mb-3 text-sm font-semibold text-white">Pricing summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className={theme.softText}>{selectedPackageData.name}</span><span className="font-medium text-white">{formatUsd(selectedPackageData.price)}</span></div>
                    {selectedAddOns.map((addOnId) => {
                      const addOn = addOns.find((item) => item.id === addOnId);
                      if (!addOn) return null;
                      const price = addOn.id === "localized" ? addOn.price * selectedLocalizedCount : addOn.price;
                      return <div key={addOn.id} className="flex items-center justify-between"><span className={theme.softText}>{addOn.label}{addOn.id === "localized" ? ` (${selectedLocalizedCount} language${selectedLocalizedCount !== 1 ? "s" : ""})` : ""}</span><span className="font-medium text-white">{formatUsd(price)}</span></div>;
                    })}
                  </div>
                  <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between"><span className="text-base font-semibold text-white">Total</span><span className="text-2xl font-bold text-white">{formatUsd(totalPrice)}</span></div>
                </div>
                  {localizedAddonSelected && !canContinueToUpload && (
  <p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
    {noLocalizedLanguagesSelected
      ? "Please select at least one localised language before continuing."
      : "Please add translated titles for all selected localised languages before continuing."}
  </p>
)}

<button
  type="button"
  disabled={!canContinueToUpload}
  onClick={async () => {
  if (!canContinueToUpload) return;

  try {
    const response = await fetch("/api/orders/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        packageId: selectedPackage,
        packageName:
          selectedPackage === "essential"
            ? "🧱 Essential"
            : selectedPackage === "pro"
            ? "🔥 Pro"
            : "💎 Studio",
        addOnIds: selectedAddOns,
        addOnLabels: selectedAddOnObjects.map((a) => a.label),
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to create order");
    }

    // ✅ IMPORTANT: set real order ID
    setDraftOrderNumber(json.publicOrderId);
    setDraftOrderDbId(json.id);

    // Move to upload
    navigateTo("upload");
  } catch (err) {
    console.error("Create draft order failed", err);
  }
}}
  className={`mt-6 w-full rounded-xl py-3 ${
    canContinueToUpload
      ? theme.buttonPrimary
      : "cursor-not-allowed bg-white/10 text-white/40"
  }`}
>
  Continue to Upload
</button>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MIN_DIMENSION_PX = 1400;

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "tif", "tiff", "psd", "zip"];

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() || "";

const isAllowedFile = (file: File) => {
  const extension = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(extension);
};

const checkImageDimensions = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const extension = getFileExtension(file.name);

    // PSD and ZIP do not expose artwork dimensions in the browser.
    if (["psd", "zip", "tif", "tiff"].includes(extension)) {
  resolve(null);
  return;
}

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width < MIN_DIMENSION_PX || img.height < MIN_DIMENSION_PX) {
        resolve(
          `${file.name} is too small. Minimum size is ${MIN_DIMENSION_PX}px wide and ${MIN_DIMENSION_PX}px high.`
        );
        return;
      }

      resolve(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(`${file.name} could not be read. Please upload a valid PNG, JPG, TIFF, PSD or ZIP file.`);
    };

    img.src = objectUrl;
  });
};

const validateAndAddFiles = async (incomingFiles: FileList | File[]) => {
  setIsUploading(true);
  setUploadErrors([]);

  try {
    const fileArray = Array.from(incomingFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];
    setUploadErrors([]);
    for (const file of fileArray) {
      const extension = getFileExtension(file.name);

      if (!isAllowedFile(file)) {
        errors.push(
          `${file.name} was blocked. Accepted file types are PNG, JPG, TIFF, PSD or ZIP.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(
          `${file.name} was blocked because it is ${(file.size / 1024 / 1024).toFixed(
            2
          )}MB. Maximum file size is 50MB.`
        );
        continue;
      }

      if (!["psd", "zip", "tif", "tiff"].includes(extension)) {
        const dimensionError = await checkImageDimensions(file);

        if (dimensionError) {
          errors.push(dimensionError);
          continue;
        }
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
  setFiles((prev) => [...prev, ...validFiles]);

  const uploadedFiles = await uploadFilesToStorage(validFiles, "artwork");

setUploadedArtworkFiles((prev) => [...prev, ...uploadedFiles]);
setUploadErrors([]);
setUploadSuccessMessage(
  `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""} uploaded successfully.`
);

return;
}

    setUploadErrors(errors.length > 0 ? errors : []);
  } catch (error) {
  console.error("Upload validation failed:", error);

  setUploadErrors((prev) => {
    // ✅ If uploads already succeeded, don't show stale/generic red error
    if (uploadedArtworkFiles.length > 0) {
      return [];
    }

    return [
      error instanceof Error
        ? error.message
        : "Something went wrong while checking your files. Please try uploading again.",
    ];
  });
} finally {
    setIsUploading(false);
  }
};

  const renderUpload = () => {
  return (
    <div className={`min-h-screen p-6 ${theme.page}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/frameready-logo.png"
              alt="FrameReady logo"
              className="w-14 cursor-pointer"
              onClick={() => navigateTo("home")}
            />
            <div>
              <h1 className="text-2xl font-semibold">Upload your artwork</h1>
            </div>
          </div>

          <button
            onClick={() => navigateTo("dashboard")}
            className={theme.buttonSecondary}
          >
            ← Back to Package Builder
          </button>
        </div>

        <div className="space-y-6">
          {/* What to upload */}
          <div className={`rounded-3xl p-6 ${theme.panel}`}>
            <h2 className="text-xl font-semibold">What to upload</h2>
            <p className={`mt-2 text-sm ${theme.mutedText}`}>
              Upload the artwork you want us to fix and format. This should be your existing poster,
              key art, title treatment, source artwork, or package of artwork files.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className={`rounded-2xl p-4 ${theme.panel}`}>
                <p className="text-sm font-semibold text-white">Best files to upload</p>
                <ul className={`mt-2 space-y-1.5 text-sm ${theme.softText}`}>
                  <li>• Poster or key art</li>
                  <li>• Textless artwork if available</li>
                  <li>• Existing title treatment files</li>
                  <li>• PSD or ZIP package if you have working files</li>
                </ul>
              </div>

              <div className={`rounded-2xl p-4 ${theme.panel}`}>
                <p className="text-sm font-semibold text-white">Please note</p>
                <ul className={`mt-2 space-y-1.5 text-sm ${theme.softText}`}>
                  <li>• PSD and ZIP files may not show previews</li>
                  <li>• Low-resolution artwork may need manual review</li>
                  <li>• We preserve the original creative where possible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Upload source files */}
          <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                
                <h2 className="text-xl font-semibold">Add your source files</h2>
                <p className={`mt-2 text-sm ${theme.mutedText}`}>
                  Upload the main artwork you want us to fix, format, and deliver across your selected platforms.
                </p>
              </div>

              <div className={`rounded-2xl px-4 py-3 text-sm ${theme.panel}`}>
                <p className="font-medium text-white">
                  Minimum resolution: {MIN_DIMENSION_PX}px
                </p>
                <p className={`mt-1 text-xs ${theme.mutedText}`}>
                  Recommended: 3000px+ for best results
                </p>
              </div>
            </div>

            <div
              className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
                isDragging
                  ? "border-cyan-300/70 bg-cyan-400/8 shadow-[0_0_30px_rgba(56,189,248,0.16)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
            >
              <p className="mb-2 text-lg font-medium text-white">
                Drag & drop your files here
              </p>
              <p className={`mb-4 text-sm ${theme.mutedText}`}>
                PNG, JPG, TIFF, PSD or ZIP • up to {MAX_FILE_SIZE_MB}MB per file
              </p>

              <input
  type="file"
  multiple
  accept=".png,.jpg,.jpeg,.tif,.tiff,.psd,.zip,image/png,image/jpeg,image/tiff,application/zip,application/x-zip-compressed"
  onChange={handleFileUpload}
  disabled={isUploading}
  className="mx-auto"
/>

{isUploading && (
  <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
    Checking files… large files may take a moment.
  </div>
)}

{uploadErrors.length > 0 && (
  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
    <p className="mb-2 font-semibold">Some files could not be added:</p>
    <ul className="space-y-1">
      {uploadErrors.map((error) => (
        <li key={error}>• {error}</li>
      ))}
    </ul>
  </div>
)}

              {!isUploading && files.length === 0 && uploadErrors.length === 0 && (
  <div className={`rounded-2xl p-4 ${theme.panel}`}>
    <p className="text-sm font-semibold text-white">Validation</p>
    <p className={`mt-1 text-sm ${theme.mutedText}`}>
  PNG/JPG files are checked automatically. TIFF, PSD and ZIP files are verified during QC.
</p>
  </div>
)}
            </div>
          </div>

          {/* Uploaded files */}
          {files.length > 0 && (
            <div className={`rounded-3xl p-6 ${theme.panel}`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Uploaded files</h2>
                <p className="mt-1 text-sm text-emerald-300">
                  {files.length} file{files.length !== 1 ? "s" : ""} uploaded successfully
                </p>
              </div>

              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 font-bold text-emerald-300">
                        ✓
                      </div>

                      <div>
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="mt-1 text-xs text-emerald-200/80">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Uploaded successfully
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="text-sm text-slate-300 underline hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional reference */}
          <div className={`rounded-3xl p-6 ${theme.panel}`}>
                <div className="mb-5">
                  <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Optional reference</p>
                  <h2 className="text-xl font-semibold">Fonts used in the artwork</h2>
                  <p className={`mt-2 max-w-2xl text-sm ${theme.mutedText}`}>Add font information once here for any package. We’ll use it to preserve your branding more accurately.</p>
                </div>

                <textarea value={packageFontInfo} onChange={(e) => setPackageFontInfo(e.target.value)} placeholder="e.g. Gotham Bold, Trajan Pro, custom font family, or notes about typography" className={`min-h-[84px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} />
                <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
                  <p className="mb-2 text-sm font-medium text-white">Upload font files for the main artwork (optional)</p>
                  <p className={`mb-3 text-xs ${theme.mutedText}`}>Accepted formats: OTF and TTF. Upload any fonts you want us to use or match across the selected package assets.</p>
                  <input type="file" multiple accept=".otf,.ttf,font/otf,font/ttf" onChange={handlePackageFontUpload} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-cyan-400 file:to-indigo-400 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950" />
                  {packageFontFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {packageFontFiles.map((file) => <div key={`${file.name}-${file.size}`} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${theme.card}`}><span className={theme.softText}>{file.name}</span><button type="button" onClick={() => removePackageFontFile(file.name)}>❌</button></div>)}
                    </div>
                  )}</div>
                    </div>

          {/* Review button */}
          <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
            <button
  onClick={() => navigateTo("review")}
  disabled={uploadedArtworkFiles.length === 0 || isUploading}
  className={`w-full rounded-xl py-3 ${theme.buttonPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
>
  {isUploading ? "Uploading files..." : "Review your order"}
</button>

            <p className={`mt-3 text-center text-xs ${theme.mutedText}`}>
              You must upload artwork before continuing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderReview = () => {
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isClientDetailsValid =
    clientName.trim().length > 1 &&
    isValidEmail(clientEmail) &&
    clientEmail.trim().toLowerCase() === confirmClientEmail.trim().toLowerCase();

  return (

    <div className={`min-h-screen p-6 ${theme.page}`}>
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/frameready-logo.png"
              alt="FrameReady logo"
              className="w-14 cursor-pointer"
              onClick={() => navigateTo("home")}
            />
            <div>
              <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
                Review your order
              </p>
              <h1 className="text-2xl font-semibold">
                Confirm before payment
              </h1>
            </div>
          </div>

          <button
            onClick={() => setView("upload")}
            className={theme.buttonSecondary}
          >
            ← Back to Upload
          </button>
        </div>

        {/* GRID */}
        <div className="space-y-6">

          {/* CLIENT DETAILS */}
          <div className={`rounded-3xl p-6 ${theme.panel}`}>
            <p className={`mb-2 text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
              Client details
            </p>

            <h2 className="text-xl font-semibold">
              Who should we deliver to?
            </h2>

            <div className="mt-5 space-y-4">

              <div>
                <label className="mb-1 block text-xs text-white">Client name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-sm ${theme.input}`}
                />
                
              </div>

              <div>
                <label className="mb-1 block text-xs text-white">Client email</label>
                <input
  type="email"
  value={clientEmail}
  onChange={(e) => setClientEmail(e.target.value)}
  className={`w-full rounded-xl px-3 py-2 outline-none ${
    clientEmail && !isValidEmail(clientEmail)
      ? "border border-red-400/40 bg-red-500/10"
      : theme.input
  }`}
/>
<input
  type="email"
  value={confirmClientEmail}
  onChange={(e) => setConfirmClientEmail(e.target.value)}
  placeholder="Confirm client email"
  className={`w-full rounded-xl px-3 py-2 text-sm ${theme.input}`}
/>

{clientEmail && !isValidEmail(clientEmail) && (
  <p className="mt-1 text-xs text-red-300">
    Please enter a valid email address.
  </p>
)}
              </div>

              <div>
                <label className="mb-1 block text-xs text-white">Notes</label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className={`min-h-[100px] w-full rounded-xl px-3 py-2 text-sm ${theme.input}`}
                />
              </div>

            </div>
          </div>

          {/* SUMMARY */}
<div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
  <p className={`mb-2 text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
    Order summary
  </p>

  <h2 className="text-xl font-semibold">Your package</h2>

  <div className="mt-5 space-y-4">
    <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
  <div className="flex justify-between">
    <span className="font-medium text-white">
      {selectedPackageData.name}
    </span>
    <span className="font-medium text-white">
      {formatUsd(selectedPackageData.price)}
    </span>
  </div>
</div>

    {selectedAddOns.map((id) => {
      const addOn = addOns.find((a) => a.id === id);
      if (!addOn) return null;

      const isLocalized = id === "localized";
      const localizedCount = localizedLanguages.length || 1;
      const addOnPrice = isLocalized ? addOn.price * localizedCount : addOn.price;

      return (
        <div key={id} className="rounded-2xl border border-white/6 bg-black/20 p-4">
          <div className="flex justify-between">
            <span className="font-medium text-white">{addOn.label}</span>
            <span>{formatUsd(addOnPrice)}</span>
          </div>

          {isLocalized && localizedLanguages.length > 0 && (
            <div className="mt-4 space-y-3">
              {localizedLanguages.map((language) => (
                <div
                  key={language}
                  className="rounded-xl border border-white/6 bg-white/[0.03] p-3"
                >
                  <p className="text-sm font-semibold text-white">{language}</p>
                  <p className={`mt-1 text-xs ${theme.mutedText}`}>
                    Translated title/text:
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {localizedTitles[language] || "No translated title added"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
{/* UPLOADED FILES */}
<div className={`rounded-3xl p-6 ${theme.panel}`}>
  <p className={`mb-2 text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>
    Uploaded files
  </p>

  <h2 className="text-xl font-semibold">Files ready for this order</h2>

  <div className="mt-5 space-y-3">
    {files.map((file) => {
      const isPreviewable =
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        /\.(jpg|jpeg|png)$/i.test(file.name);

      const previewUrl = isPreviewable ? URL.createObjectURL(file) : null;
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const emailsMatch =
  clientEmail.trim().toLowerCase() === confirmClientEmail.trim().toLowerCase();

const isClientDetailsValid =
  clientName.trim().length > 1 &&
  isValidEmail(clientEmail) &&
  isValidEmail(confirmClientEmail) &&
  emailsMatch;

      return (
        <div
          key={`${file.name}-${file.size}`}
          className="flex items-center gap-4 rounded-2xl border border-white/6 bg-black/20 p-4"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="h-10 w-10 rounded-lg border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-xs text-slate-400">
              File
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{file.name}</p>
            <p className={`mt-1 text-xs ${theme.mutedText}`}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      );
    })}
  </div>
</div>
    <div className="border-t border-white/10 pt-3 flex justify-between text-lg font-semibold">
      <span>Total</span>
      <span>{formatUsd(totalPrice)}</span>
    </div>
  </div>

  {!isClientDetailsValid && (
  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
    Please enter a valid name and matching email addresses before proceeding to payment.
  </div>
)}
{checkoutError && (
  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
    {checkoutError}
  </div>
)}
<button
  onClick={handleProceedToPayment}
  disabled={!isClientDetailsValid || isSubmittingCheckout}
  className={`mt-6 w-full rounded-xl py-3 ${
    isClientDetailsValid && !isSubmittingCheckout
      ? theme.buttonPrimary
      : "cursor-not-allowed bg-white/10 text-white/40"
  }`}
>
  {isSubmittingCheckout ? "Starting payment..." : "Proceed to Payment"}
</button>
          </div>

        </div>
      </div>
    </div>
  );
};

const mapOrderRowToAdminOrder = (order: any): AdminOrder => ({
  id: order.publicOrderId ?? order.public_order_id ?? order.id,
  dbId: order.id,

  clientName: order.client_name ?? order.clientName ?? "Unknown client",
  clientEmail: order.client_email ?? order.clientEmail ?? "",

  packageName: order.package_name ?? order.packageName ?? "Unknown package",

  total:
    typeof order.total_cents === "number"
      ? order.total_cents / 100
      : typeof order.totalCents === "number"
      ? order.totalCents / 100
      : typeof order.total === "number"
      ? order.total
      : 0,

  status: order.order_status ?? order.orderStatus ?? order.status ?? "draft",

  paid:
    order.payment_status === "paid" ||
    order.paymentStatus === "paid" ||
    order.paid === true,

  turnaround: order.turnaround ?? "Queued",

localizedTitles: order.localized_titles ?? order.localizedTitles ?? {},

regionGuidelines:
  order.localized_region_guidelines ?? order.regionGuidelines ?? "",

packageFontInfo:
  order.package_font_info ?? order.packageFontInfo ?? "",

fontFiles:
  order.uploaded_font_files ?? order.fontFiles ?? [],

  submittedAt:
  order.submitted_at ??
  order.submittedAt ??
  order.created_at ??
  order.createdAt ??
  "",
  languages: order.localized_languages ?? order.localizedLanguages ?? [],

  
  addOns: order.add_on_labels ?? order.addOnLabels ?? order.addOns ?? [],

  sourceFiles: order.uploaded_files ?? order.uploadedFiles ?? order.sourceFiles ?? [],
  deliveryFiles: order.delivery_files ?? order.deliveryFiles ?? [],

  notes: order.notes ?? "",

  deliveredAt: order.delivered_at ?? order.deliveredAt ?? undefined,
  deliveredBy: order.delivered_by ?? order.deliveredBy ?? undefined,
  deliveryEmailSentAt:
    order.delivery_email_sent_at ?? order.deliveryEmailSentAt ?? undefined,
  deliveryStatus: order.delivery_status ?? order.deliveryStatus ?? null,
  revisionDeliverySets: Array.isArray(order.revision_delivery_sets)
  ? order.revision_delivery_sets
  : Array.isArray(order.revisionDeliverySets)
  ? order.revisionDeliverySets
  : [],

  deliverySets: Array.isArray(order.delivery_sets)
  ? order.delivery_sets
  : [],

revisionHistory: Array.isArray(order.revision_history)
  ? order.revision_history
  : Array.isArray(order.revisionHistory)
  ? order.revisionHistory
  : [],
  revisionRequestedAt:
    order.revision_requested_at ?? order.revisionRequestedAt ?? undefined,
  revisionRequestMessage:
    order.revision_request_message ?? order.revisionRequestMessage ?? undefined,

    revisionDeliveryFiles:
  order.revision_delivery_files ?? order.revisionDeliveryFiles ?? [],

  revisionEmailSentAt:
  order.revision_email_sent_at ?? order.revisionEmailSentAt ?? undefined,
});

  const renderAdminAuth = () => (
    <div className={`min-h-screen p-6 ${theme.page}`}>
      <div className="mx-auto max-w-md pt-10">
        <div className="mb-8 flex items-center justify-center"><img src="/frameready-logo.png" alt="FrameReady logo" className="w-14 cursor-pointer" onClick={() => navigateTo("home")} /></div>
        <div className={`rounded-2xl p-6 ${theme.panelStrong}`}>
          <p className={`mb-2 text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>Admin access</p>
          <h1 className="mb-3 text-2xl font-semibold">Sign in to Admin</h1>
          <p className={`mb-6 text-sm ${theme.mutedText}`}>Sign in with your admin credentials to access the dashboard.</p>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div><label className="mb-1 block text-xs font-medium text-white">Email</label><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Enter your admin email" className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} autoComplete="email" /></div>
            <div><label className="mb-1 block text-xs font-medium text-white">Password</label><input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter your admin password" className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} autoComplete="current-password" /></div>
            {adminAuthError && <div className={`rounded-xl p-3 text-sm ${theme.errorPanel}`}><p className="font-semibold">Sign-in failed</p><p className="mt-1 text-rose-100">{adminAuthError}</p></div>}
            <button type="submit" className={`w-full rounded-xl py-3 ${theme.buttonPrimary}`}>Sign in to Admin</button>
          </form>
        </div>
      </div>
    </div>
  );

  const getRevisionHistoryStatusLabel = (item: any) => {
  if (
    item.type === "revision_delivered" ||
    item.type === "paid_revision_delivered"
  ) {
    return "Completed";
  }

  if (item.type === "paid_revision_paid") {
    return "Paid Revision Paid";
  }

  if (item.type === "paid_revision_quote_sent") {
    return "Quote sent";
  }

  if (item.type === "paid_revision_quote_requested") {
    return "Quote requested";
  }

  if (
    item.type === "revision_requested" ||
    item.type === "paid_revision_requested"
  ) {
    return "Pending";
  }

  if (
    item.type === "revision_in_progress" ||
    item.type === "paid_revision_in_progress"
  ) {
    return "In progress";
  }

  return "Pending";
};

const getRevisionHistoryBadge = (item: any) => {
  if (item.status === "completed") {
    return {
      label: "Completed",
      className:
        "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200",
    };
  }

  if (item.status === "in_progress") {
    return {
      label: "In progress",
      className:
        "rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-200",
    };
  }

  if (item.status === "quote_sent") {
    return {
      label: "Quote sent",
      className:
        "rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-200",
    };
  }

  if (item.status === "paid") {
    return {
      label: "Paid Revision Paid",
      className:
        "rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-200",
    };
  }

  if (item.type === "paid_revision_paid") {
    return {
      label: "Paid Revision Paid",
      className:
        "rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-200",
    };
  }

  if (item.type === "paid_revision_quote_requested") {
    return {
      label: "Quote requested",
      className:
        "rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200",
    };
  }

  if (item.type === "awaiting_paid_revision_payment") {
    return {
      label: "Awaiting payment",
      className:
        "rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-200",
    };
  }

  return {
    label: "Pending",
    className:
      "rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-xs text-slate-200",
  };
};

const handleResumeRevisionWork = async (
  order: AdminOrder,
  revisionIndex: number
) => {
  const revisionItem = order.revisionHistory?.[revisionIndex];

  const isPaidRevision = revisionItem?.type === "paid_revision_paid";

  const updatedHistory: RevisionHistoryItem[] = (order.revisionHistory ?? []).map(
    (item, index): RevisionHistoryItem =>
      index === revisionIndex
        ? {
            ...item,
            status: "in_progress" as const,
          }
        : item
  );

  await updateAdminOrder(order.dbId ?? order.id, {
    status: isPaidRevision
      ? "paid_revision_in_progress"
      : "revision_in_progress",
    revisionHistory: updatedHistory,
    revisionRequestMessage: undefined,
    revisionRequestedAt: undefined,
  });

  await loadAdminOrders();
};

  const renderAdmin = () => (
  <div className={`min-h-screen p-6 ${theme.page}`}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/frameready-logo.png"
            alt="FrameReady logo"
            className="w-14 cursor-pointer"
            onClick={() => navigateTo("home")}
          />

          <div>
            <p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
              Operations
            </p>
            <h1 className="text-2xl font-semibold text-white">
              Admin Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => void loadAdminOrders()}
            className={theme.buttonSecondary}
          >
            Refresh Orders
          </button>

          <button
            onClick={() => navigateTo("dashboard")}
            className="text-sm underline text-slate-300 hover:text-white"
          >
            Back to Dashboard
          </button>

          <button
            onClick={handleAdminLogout}
            className="text-sm underline text-slate-300 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
</div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className={`rounded-2xl p-4 ${theme.panelStrong}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Total orders</p><p className="mt-2 text-3xl font-semibold">{adminSummary.total}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Active</p><p className="mt-2 text-3xl font-semibold">{adminSummary.active}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Ready to deliver</p><p className="mt-2 text-3xl font-semibold">{adminSummary.ready}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Completed</p><p className="mt-2 text-3xl font-semibold">{adminSummary.completed}</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className={`rounded-2xl p-4 ${theme.panel}`}>
            
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <div>
    <p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
      Orders
    </p>

    <h2 className="text-lg font-semibold">
      Track and manage client deliveries
    </h2>

    <div className={`mt-2 text-xs ${theme.mutedText}`}>
      🧹 Last Cleanup:{" "}
      {lastCleanupRun
        ? new Date(lastCleanupRun).toLocaleString()
        : "Not run yet"}
    </div>
  </div>

  <div className="flex flex-wrap gap-2">
    {adminFilterOptions.map((filter) => (
      <button
        key={filter.value}
        type="button"
        onClick={() => setAdminFilter(filter.value)}
        className={`rounded-full px-3 py-2 text-xs ${
          adminFilter === filter.value
            ? theme.selectedAddon
            : filter.value === "revisions" && hasRevisions
            ? "border border-orange-400/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
            : theme.pill
        }`}
      >
        {filter.label}
      </button>
    ))}
  </div>              

            </div>

            <div className="space-y-3">
  {adminOrdersLoading && adminOrders.length === 0 && (
  <div className={`rounded-2xl p-4 text-sm ${theme.panel}`}>
    Loading real orders...
  </div>
)}

  {adminOrdersError && (
    <div className={`rounded-2xl p-4 text-sm ${theme.errorPanel}`}>
      {adminOrdersError}
    </div>
  )}

  {!adminOrdersLoading && filteredOrders.length === 0 && (
    <div className={`rounded-2xl p-4 text-sm ${theme.panel}`}>
      No real orders found yet.
    </div>
  )}

  {!adminOrdersLoading &&
    filteredOrders.map((order) => {
      const isSelected = order.id === selectedAdminOrderId;
      const dueInfo = getDueInfo(order);
      return (
        <button
          key={order.id}
          type="button"
          onClick={() => setSelectedAdminOrderId(order.dbId ?? order.id)}
          className={`w-full rounded-2xl border p-4 text-left transition-all ${
  isSelected
    ? "border-white/40 bg-white/10 ring-2 ring-white/20"
    : hasExpressDelivery(order)
    ? "border-emerald-400/40 bg-emerald-500/10"
    : dueInfo.overdue
    ? "border-red-400/40 bg-red-500/10"
    : dueInfo.dueSoon
    ? "border-yellow-400/40 bg-yellow-500/10"
    : theme.card
}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white flex items-center">
  {order.id}

  {hasExpressDelivery(order) && (
  <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
    Express
  </span>
)}

{dueInfo.overdue && (
  <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
    Overdue
  </span>
)}

{dueInfo.dueSoon && !dueInfo.overdue && (
  <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-300">
    Due soon
  </span>
)}

  {order.status === "revision_requested" && (
  <span className="ml-2 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">
    Revision
  </span>
)}

{order.status === "paid_revision_quote_requested" && (
  <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs text-amber-200">
    Paid Revision
  </span>
)}
</p>

{dueInfo.overdue && (
  <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
    Overdue
  </span>
)}

                <span className={`rounded-full px-2 py-1 text-[10px] ${theme.pill}`}>
                  {order.packageName}
                </span>
              </div>
              <p className={`mt-1 text-sm ${theme.softText}`}>{order.clientName}</p>
              <p className={`text-xs ${theme.mutedText}`}>{order.clientEmail}</p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold text-white">{formatUsd(order.total)}</p>
              <p className={`text-xs ${theme.mutedText}`}>{order.submittedAt}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            
            <span
  className={`rounded-full px-3 py-1 text-xs ${
  order.status === "revision_requested" ||
  order.status === "revision_in_progress" ||
  order.status === "revision_ready_for_delivery"
    ? "border border-orange-400/20 bg-orange-500/10 text-orange-300"
    : order.status === "paid_revision_quote_requested" ||
      order.status === "awaiting_priority_revision_payment" ||
      order.status === "paid_revision_paid" ||
      order.status === "paid_revision_in_progress" ||
      order.status === "paid_revision_ready_for_delivery"
    ? "border border-amber-400/30 bg-amber-500/15 text-amber-200"
    : order.status === "ready_for_delivery"
    ? "border border-emerald-400/20 bg-emerald-500/10"
    : order.status === "in_progress"
    ? theme.selectedAddon
    : order.status === "completed"
    ? "border border-sky-400/20 bg-sky-500/10 text-sky-300"
    : theme.pill
}`}
>
  {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
</span>

            <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
              {order.turnaround}
            </span>

            {order.languages.length > 0 && (
              <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
                {order.languages.length} localised language
                {order.languages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </button>
      );
    })}
</div>
          </div>

          <div className={`min-w-0 overflow-hidden rounded-2xl p-4 ${theme.panelStrong}`}>
            {selectedAdminOrder ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-4"><div>
                  <p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>
                    Selected order
                    </p>
                    <h2 className="text-xl font-semibold">
                      {selectedAdminOrder.id}
                      </h2>
                      <p className={`mt-1 text-sm ${theme.softText}`}>
                        {selectedAdminOrder.clientName}
                        </p>
                        <p className={`text-xs ${theme.mutedText}`}>
                          {selectedAdminOrder.clientEmail}
                          </p>
                          <p className={`text-xs ${theme.mutedText}`}>
  
  Ordered:{" "}
{selectedAdminOrder.submittedAt
  ? new Date(selectedAdminOrder.submittedAt).toLocaleString()
  : "Unknown"}
</p>

{(() => {
  const dueInfo = getDueInfo(selectedAdminOrder);

  return (
    <p
      className={`text-xs ${
        dueInfo.overdue ? "text-red-300" : theme.mutedText
      }`}
    >
      {dueInfo.label}
    </p>
  );
})()}

                          </div><span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>{selectedAdminOrder.packageName}</span></div>
                <div className={`mb-4 rounded-xl p-4 ${theme.panel}`}>
  <p className={`mb-2 text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>
    Order details
  </p>

  <div className="space-y-3 text-sm">
    <div className="flex justify-between">
      <span className={theme.softText}>Package</span>
      <span className="text-white">{selectedAdminOrder.packageName}</span>
    </div>

    {(selectedAdminOrder.addOns?.length ?? 0) > 0 && (
      <div>
        <p className={`${theme.softText} mb-1`}>Add-ons</p>
        <div className="flex flex-wrap gap-2">
          {selectedAdminOrder.addOns?.map((addOn: string) => (
            <span key={addOn} className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
              {addOn}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="space-y-4 text-sm">

  {/* Localised versions */}
  {(selectedAdminOrder.languages?.length ?? 0) > 0 && (
    <div>
      <p className={`mb-2 text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>
        Localised versions
      </p>

      <div className="space-y-2">
        {selectedAdminOrder.languages.map((language) => (
          <div
            key={language}
            className="flex items-start justify-between rounded-lg border border-white/6 bg-black/20 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-white">{language}</p>
              <p className="text-xs text-slate-400">
                {selectedAdminOrder.localizedTitles[language] || "No translation"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Additional details */}
  {(selectedAdminOrder.regionGuidelines ||
  selectedAdminOrder.packageFontInfo ||
  (selectedAdminOrder.fontFiles?.length ?? 0) > 0 ||
  selectedAdminOrder.notes) && (
  <div className="rounded-xl border border-white/6 bg-black/20">
    <button
      type="button"
      onClick={() => setShowAdditionalDetails((prev) => !prev)}
      className="flex w-full items-center justify-between px-4 py-3 text-left"
    >
      <span className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>
        Additional details
      </span>
      <span className="text-xs text-slate-400">
        {showAdditionalDetails ? "Hide" : "Show"}
      </span>
    </button>

    {showAdditionalDetails && (
      <div className="space-y-3 border-t border-white/6 px-4 pb-4 pt-3 text-sm">
        {selectedAdminOrder.regionGuidelines && (
          <div>
            <p className="text-xs text-slate-400">Region guidelines</p>
            <p className="text-white">{selectedAdminOrder.regionGuidelines}</p>
          </div>
        )}

        {selectedAdminOrder.packageFontInfo && (
          <div>
            <p className="text-xs text-slate-400">Font</p>
            <p className="text-white">{selectedAdminOrder.packageFontInfo}</p>
          </div>
        )}

        {(selectedAdminOrder.fontFiles?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1 text-xs text-slate-400">Font files</p>
            <div className="space-y-1">
              {selectedAdminOrder.fontFiles?.map((file) => (
                <div
                  key={file.path || file.fileName}
                  className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-1.5"
                >
                  <span className="truncate text-white">
                    {file.fileName || file.path}
                  </span>

                  {file.signedUrl && (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-300 hover:underline"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedAdminOrder.notes && (
          <div>
            <p className="text-xs text-slate-400">Notes</p>
            <p className="text-white">{selectedAdminOrder.notes}</p>
          </div>
        )}
      </div>
    )}
  </div>
)}

</div>
  
  </div>
</div>
                
                <div className="mb-4 grid gap-3 sm:grid-cols-2"><div className={`rounded-xl p-3 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Total</p><p className="mt-1 text-lg font-semibold">${selectedAdminOrder.total}</p></div><div className={`rounded-xl p-3 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Turnaround</p><p className="mt-1 text-lg font-semibold">{selectedAdminOrder.turnaround}</p></div></div>
                <div className="mb-4">
                  <label className={`mb-2 block text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>
                    Status
                    </label>

<select
  value={selectedAdminOrder.status}
  onChange={(e) =>
  updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
    status: e.target.value as OrderStatus,
  })
}
  className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
>
  {ORDER_STATUSES.map((status) => (
    <option key={status} value={status} className="bg-slate-900 text-white">
      {ORDER_STATUS_LABELS[status]}
    </option>
  ))}
</select>
</div>

    <div className="mb-4 grid gap-4">
  <div className={`min-w-0 overflow-hidden rounded-xl p-4 ${theme.panel}`}>
  <button
    type="button"
    onClick={() => setShowSourceFiles((prev) => !prev)}
    className="mb-3 flex w-full items-center justify-between text-left"
  >
    <div className="flex items-center gap-2">
      <p className="font-medium text-white">Source files</p>
      <span className={`rounded-full px-2 py-1 text-xs ${theme.pill}`}>
        {selectedAdminOrder.sourceFiles?.length ?? 0}
      </span>
    </div>

    <span className="text-xs text-slate-400">
      {showSourceFiles ? "Hide" : "Show"}
    </span>
  </button>

  {showSourceFiles && (
    <>
      <div className="mb-3 flex items-center justify-end gap-3">
  {selectedAdminOrder.status === "files_received" && (
    <button
      type="button"
      className={`rounded-xl px-3 py-2 text-xs ${theme.buttonPrimary}`}
      onClick={() =>
        updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
          status: "in_progress",
        })
      }
    >
      Start work
    </button>
  )}

  <a
    href={
      selectedAdminOrder.dbId
        ? `/api/admin/orders/${selectedAdminOrder.dbId}/download-source-files`
        : "#"
    }
    className="text-xs underline text-slate-300 hover:text-white"
  >
    Download all
  </a>
</div>

      {(selectedAdminOrder.sourceFiles?.length ?? 0) > 0 ? (
        <ul className={`space-y-2 text-sm ${theme.softText}`}>
          {selectedAdminOrder.sourceFiles.map((file: any) => (
            <li
              key={file.path || file.fileName || "source-file"}
              className="flex flex-col gap-2 rounded-lg border border-white/6 bg-black/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                {file.signedUrl && file.mimeType?.startsWith("image/") ? (
                  <img
                    src={file.signedUrl}
                    alt={file.fileName || file.path || "Source file"}
                    className="h-10 w-10 rounded-md border border-white/10 bg-slate-800 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-slate-800 text-[10px] text-slate-400">
                    File
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {file.fileName || file.path || "Source file"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {file.mimeType || "File"}
                    {typeof file.sizeBytes === "number"
                      ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                      : ""}
                  </p>
                </div>
              </div>

              {file.signedUrl ? (
                <a
                  href={file.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-slate-300 hover:text-white"
                >
                  Download
                </a>
              ) : (
                <span className="text-xs text-slate-500">Unavailable</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={`rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-sm ${theme.mutedText}`}
        >
          No source files uploaded yet.
        </div>
      )}
    </>
  )}
</div>

  <div className={`min-w-0 overflow-hidden rounded-xl p-4 ${theme.panel}`}>
  <button
    type="button"
    onClick={() => setShowDeliveryFiles((prev) => !prev)}
    className="mb-3 flex w-full items-center justify-between text-left"
  >
    <div className="flex items-center gap-2">
      <p className="font-medium text-white">Delivery files</p>
      {selectedAdminOrder.deliveryEmailSentAt ? (
  <p className="mt-1 text-xs text-emerald-300">
    Sent{" "}
    {new Date(selectedAdminOrder.deliveryEmailSentAt).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    })}
  </p>
) : (
  <p className={`mt-1 text-xs ${theme.mutedText}`}>
    {selectedAdminOrder.deliveryFiles?.length ?? 0} files
  </p>
)}
      <span className={`rounded-full px-2 py-1 text-xs ${theme.pill}`}>
        {selectedAdminOrder.deliveryFiles?.length ?? 0}
      </span>
    </div>

    <span className="text-xs text-slate-400">
      {showDeliveryFiles ? "Hide" : "Show"}
    </span>
  </button>

  {showDeliveryFiles && (
    <>
      {!deliveryLocked ? (
  <>
    {/* Upload button */}
    <div className="mb-3 flex justify-end">
      <label
        className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${theme.buttonPrimary}`}
      >
        {isUploadingDeliveryFiles ? "Uploading..." : "Choose files"}
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleDeliveryFilesUpload}
        />
      </label>
    </div>

    {/* Drag & drop */}
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDeliveryDragOver(true);
      }}
      onDragLeave={() => setIsDeliveryDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDeliveryDragOver(false);

        if (e.dataTransfer.files?.length) {
          await uploadDeliveryFiles(e.dataTransfer.files);
        }
      }}
      className={`mb-3 rounded-xl border border-dashed px-4 py-5 text-center transition ${
        isDeliveryDragOver
          ? "border-emerald-400/50 bg-emerald-500/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-sm font-medium text-white">
        {isUploadingDeliveryFiles
          ? "Uploading delivery files..."
          : "Drag and drop delivery files here"}
      </p>

      <p className={`mt-1 text-xs ${theme.mutedText}`}>
        Supports JPG, PNG, TIFF, PSD and ZIP
      </p>
    </div>
  </>
) : (
  <div className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
    Delivery email has been sent. Files are locked to prevent accidental changes.
  </div>
)}

      {/* Upload message */}
      {deliveryUploadMessage && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-xs ${
            deliveryUploadMessage.includes("successfully")
              ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
              : deliveryUploadMessage.includes("failed")
              ? "border border-red-400/20 bg-red-500/10 text-red-200"
              : "border border-sky-400/20 bg-sky-500/10 text-sky-200"
          }`}
        >
          {deliveryUploadMessage}
        </div>
      )}

      {/* File list */}
      {(selectedAdminOrder.deliveryFiles?.length ?? 0) > 0 ? (
        <ul className={`space-y-2 text-sm ${theme.softText}`}>
          {selectedAdminOrder.deliveryFiles.map((file) => (
            <li
              key={file.path || file.fileName || "delivery-file"}
              className="flex flex-col gap-2 rounded-lg border border-white/6 bg-black/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                {file.signedUrl && file.mimeType?.startsWith("image/") ? (
                  <img
                    src={file.signedUrl}
                    alt={file.fileName || file.path || "Delivery file"}
                    className="h-10 w-10 rounded-md border border-white/10 bg-slate-800 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-slate-800 text-[10px] text-slate-400">
                    File
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {file.fileName || file.path}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {file.mimeType || "File"}
                    {typeof file.sizeBytes === "number"
                      ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-slate-300 hover:text-white"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">Stored</span>
                )}

                <button
  type="button"
  disabled={deliveryLocked}
  onClick={() => handleDeleteDeliveryFile(file.path)}
  className="text-xs underline text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
>
  Delete
</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={`rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-sm ${theme.mutedText}`}
        >
          No delivery files uploaded yet.
        </div>
      )}
      <button
  className={`mt-4 w-full rounded-xl py-3 ${
    selectedAdminOrder?.deliveryStatus === "sent"
      ? "bg-emerald-600 text-white"
      : theme.buttonPrimary
  }`}
  type="button"
  disabled={
    !selectedAdminOrder ||
    selectedAdminOrder.deliveryFiles.length === 0 ||
    selectedAdminOrder.deliveryStatus === "sent"
  }
  onClick={handleSendDelivery}
>
  {selectedAdminOrder?.deliveryStatus === "sent"
    ? "Delivery email sent"
    : "Send delivery email"}
</button>
    </>
  )}
</div>

<div className={`mt-4 rounded-2xl p-5 ${theme.panel}`}>
  <button
    type="button"
    onClick={() => setShowRevisionRequests((prev) => !prev)}
    className="mb-4 flex w-full items-center justify-between text-left"
  >
    <div className="flex items-center gap-2">
      <p className="font-medium text-white">Revision Requests</p>

      <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>
        {selectedAdminOrder.revisionHistory?.length || 0}
      </span>
    </div>

    <span className="text-xs text-slate-400">
      {showRevisionRequests ? "Hide" : "Show"}
    </span>
  </button>

  {showRevisionRequests ? (
    selectedAdminOrder.revisionHistory?.length ? (
      <div className="space-y-3">
        {selectedAdminOrder.revisionHistory.map((item, index) => (
          <div
            key={`${item.createdAt}-${index}`}
            className={`rounded-xl border border-white/10 p-4 ${theme.card}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-white">
                  {item.type === "revision_requested" ||
                  item.type === "free_revision"
                    ? `Request #${index + 1} — Free revision`
                    : item.type === "paid_revision_quote_requested"
                    ? "Paid revision quote requested"
                    : item.type === "awaiting_paid_revision_payment"
                    ? "Awaiting paid revision payment"
                    : item.type === "paid_revision_paid"
                    ? "Paid revision paid"
                    : "Revision request"}
                </p>

                {item.message ? (
                  <p className={`mt-2 text-sm ${theme.softText}`}>
                    {item.message}
                  </p>
                ) : null}
              

                {item.amountUsd ? (
                  <p className="mt-2 text-sm text-emerald-300">
                    ${item.amountUsd.toFixed(2)} USD
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
  <span className={`text-xs ${theme.mutedText}`}>
  {new Date(item.createdAt).toLocaleString()}
</span>

<span className={getRevisionHistoryBadge(item).className}>
  {getRevisionHistoryBadge(item).label}
</span>

{item.type === "paid_revision_paid" && item.status === "paid" && (
  <button
    type="button"
    className={`mt-2 rounded-xl px-3 py-2 text-xs ${theme.buttonPrimary}`}
    onClick={() => handleResumeRevisionWork(selectedAdminOrder, index)}
  >
    Resume work
  </button>
)}

{item.status !== "completed" &&
  item.status !== "in_progress" &&
  item.message === selectedAdminOrder.revisionRequestMessage &&
  item.type === "revision_requested" &&
  selectedAdminOrder.status === "revision_requested" && (
    <button
      type="button"
      className={`rounded-xl px-3 py-2 text-xs ${theme.buttonPrimary}`}
      onClick={() =>
        handleResumeRevisionWork(selectedAdminOrder, index)
      }
    >
      Resume work
    </button>
  )}
    
</div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className={`text-sm ${theme.mutedText}`}>
        No revision requests yet.
      </p>
    )
  ) : null}
</div>

<div className={`mt-4 rounded-2xl p-5 ${theme.panel}`}>
  <h3 className="text-lg font-semibold text-white">
  Revision Delivery Files
</h3>

  {[
    { type: "free_1", label: "Free Revision #1" },
    { type: "free_2", label: "Free Revision #2" },
    { type: "paid", label: "Paid Revision" },
  ].map((set) => {
  const revisionSet = (selectedAdminOrder.revisionDeliverySets || []).find(
    (item) => item.type === set.type
  );

  const files = revisionSet?.files || [];

const isPaidRevision = set.type === "paid";

const revisionSetLocked =
  !isPaidRevision && Boolean(revisionSet?.emailSentAt);
  const isOpen = expandedRevisionDeliverySet === set.type;

  return (
    <div key={set.type} className={`mt-4 rounded-xl p-4 ${theme.card}`}>
      <button
        type="button"
        onClick={() =>
          setExpandedRevisionDeliverySet((prev) =>
            prev === set.type ? "" : set.type
          )
        }
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="font-medium text-white">{set.label}</p>

          {revisionSet?.emailSentAt ? (
            <p className="mt-1 text-xs text-emerald-300">
              Sent {new Date(revisionSet.emailSentAt).toLocaleString()}
            </p>
          ) : (
            <p className={`mt-1 text-xs ${theme.mutedText}`}>
              {files.length} file{files.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <span className="text-xs text-slate-400">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4">
          {!revisionSetLocked ? (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      setExpandedRevisionDeliverySet(set.type);
    }}
    onDrop={async (e) => {
      e.preventDefault();

      if (!e.dataTransfer.files?.length) return;

      await uploadRevisionDeliverySetFiles(
        set.type as "free_1" | "free_2" | "paid",
        set.label,
        e.dataTransfer.files
      );
    }}
    className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-center transition hover:border-cyan-300/40"
  >
    <p className="text-sm font-medium text-white">
      Drag & drop files here
    </p>

    <p className={`mt-1 text-xs ${theme.mutedText}`}>
      Or choose files for {set.label}
    </p>

    <label
      className={`mt-3 inline-flex cursor-pointer rounded-lg px-3 py-2 text-sm ${theme.buttonPrimary}`}
    >
      {isUploadingRevisionDeliveryFiles ? "Uploading..." : "Choose files"}

      <input
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          if (!e.target.files?.length) return;

          await uploadRevisionDeliverySetFiles(
            set.type as "free_1" | "free_2" | "paid",
            set.label,
            e.target.files
          );

          e.target.value = "";
        }}
      />
    </label>
  </div>
) : (
  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
    Revision delivery email sent. Files are locked.
  </div>
)}

          {files.length > 0 ? (
            <div className="mt-3 grid gap-3">
  {files.map((file) => {
    const fileUrl = file.signedUrl || file.publicUrl;
    const isImage = file.mimeType?.startsWith("image/");
    const fileIdentifier = file.path || file.fileName || undefined;

    return (
      <div
  key={file.path || file.fileName}
  className="flex items-center justify-between gap-4 rounded-lg border border-white/6 bg-black/20 p-4"
>
  <div className="flex min-w-0 flex-1 items-center gap-3">
    {isImage && fileUrl ? (
      <img
        src={fileUrl}
        alt={file.fileName || "Revision delivery file"}
        className="h-14 w-14 shrink-0 rounded-lg object-cover"
      />
    ) : (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] text-slate-400">
        FILE
      </div>
    )}

    <div className="min-w-0 flex-1">
      <p className="break-all text-sm font-medium text-white">
        {file.fileName || file.path}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {file.mimeType || "Uploaded file"}
      </p>
    </div>
  </div>

  <div className="flex shrink-0 items-center gap-4">
    {fileUrl ? (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs underline text-slate-300 hover:text-white"
      >
        Open
      </a>
    ) : (
      <span className="text-xs text-slate-500">
        Stored
      </span>
    )}

    <button
  type="button"
  disabled={
    !fileIdentifier ||
    (set.type !== "paid" && Boolean(revisionSet?.emailSentAt))
  }
  onClick={() =>
    fileIdentifier &&
    handleDeleteRevisionDeliverySetFile(
      set.type as "free_1" | "free_2" | "paid",
      fileIdentifier
    )
  }
  className="text-xs underline text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
>
  Delete
</button>
  </div>
</div>
    );
  })}
</div>
          ) : (
            <div
              className={`mt-3 rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-sm ${theme.mutedText}`}
            >
              No files uploaded for this revision yet.
            </div>
          )}

          <button
            type="button"
            disabled={files.length === 0 || Boolean(revisionSet?.emailSentAt)}
            onClick={() =>
              handleSendRevisionDeliverySetEmail(
                set.type as "free_1" | "free_2" | "paid",
                set.label
              )
            }
            className={`mt-4 w-full rounded-xl px-4 py-3 text-sm ${
              revisionSet?.emailSentAt
                ? "cursor-default bg-emerald-600 text-white"
                : files.length === 0
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : theme.buttonPrimary
            }`}
          >
            {revisionSet?.emailSentAt
              ? "Revision delivery email sent"
              : `Send ${set.label} delivery email`}
          </button>
        </div>
      )}
    </div>
  );
})}

  {revisionDeliveryUploadMessage && (
    <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
      {revisionDeliveryUploadMessage}
    </div>
  )}
</div>

<button
  type="button"
  onClick={() => setShowDeliveryTracking((prev) => !prev)}
  className="mb-2 flex w-full items-center justify-between text-left"
>
  <div className="flex items-center gap-2">
    <p className="text-sm font-medium text-white">
      Delivery tracking
    </p>

    <span className={`rounded-full px-2 py-1 text-xs ${theme.pill}`}>
      {selectedAdminOrder.deliveryStatus || "not_sent"}
    </span>
  </div>

  <span className="text-xs text-slate-400">
    {showDeliveryTracking ? "Hide" : "Show"}
  </span>
</button>

  {showDeliveryTracking && (
  <>
    <div className="grid gap-3 text-xs sm:grid-cols-3">
      <div>
        <p className={theme.mutedText}>Delivered</p>
        <p className="text-white">
          {selectedAdminOrder.deliveredAt
            ? new Date(selectedAdminOrder.deliveredAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—"}
        </p>
      </div>

      <div>
        <p className={theme.mutedText}>Email sent</p>
        <p className="text-white">
          {selectedAdminOrder.deliveryEmailSentAt
            ? new Date(selectedAdminOrder.deliveryEmailSentAt).toLocaleString(
                undefined,
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                }
              )
            : "—"}
        </p>
      </div>

      <div>
        <p className={theme.mutedText}>By</p>
        <p className="break-all text-white">
          {selectedAdminOrder.deliveredBy || "—"}
        </p>
      </div>
    </div>

    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        Revision deliveries
      </p>

      <div className="space-y-2">
        {(selectedAdminOrder.revisionDeliverySets || []).map((set) => (
          <div
            key={set.type}
            className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2"
          >
            <span className="text-sm text-white">{set.label}</span>

            <span className="text-xs text-slate-400">
              {set.emailSentAt
                ? `Sent ${new Date(set.emailSentAt).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`
                : "Not sent"}
            </span>
          </div>
        ))}
      </div>
    </div>
  </>
)}

{selectedAdminOrder.status === "paid_revision_quote_requested" && (
  <div className={`mt-4 rounded-xl p-4 ${theme.panel}`}>
    <p className="font-medium text-white">Paid revision quote requested</p>

    <p className={`mt-1 text-sm ${theme.mutedText}`}>
      Review the request, enter a custom price, then send the payment link.
    </p>

    <input
      type="number"
      min="1"
      value={paidRevisionAmount}
      onChange={(e) => setPaidRevisionAmount(e.target.value)}
      placeholder="Amount in USD"
      className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
    />

    <button
      type="button"
      onClick={handleSendPaidRevisionPaymentLink}
      className={`mt-3 w-full rounded-xl px-4 py-3 ${theme.buttonPrimary}`}
    >
      Send paid revision payment link
    </button>

    {paidRevisionQuoteMessage && (
      <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        {paidRevisionQuoteMessage}
      </p>
    )}
  </div>
)}

{selectedAdminOrder.status === "paid_revision_paid" && (
  <button
    type="button"
    className={`mt-4 rounded-xl px-4 py-3 ${theme.buttonPrimary}`}
    onClick={() =>
      updateAdminOrder(selectedAdminOrder.dbId ?? selectedAdminOrder.id, {
        status: "paid_revision_in_progress",
      })
    }
  >
    Resume paid revision work
  </button>
)}

{selectedAdminOrder.status === "paid_revision_in_progress" && (
  <span className="mt-4 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
    In progress
  </span>
)}

</div>
</>
) : (
  <p className={theme.mutedText}>No order selected.</p>
)}
</div>
</div>
</div>
);

  if (view === "home") return renderHome();
  if (view === "dashboard") return renderDashboard();
  if (view === "upload") return renderUpload();
  if (view === "review") return renderReview();
  return isAdminAuthenticated ? renderAdmin() : renderAdminAuth();
}
