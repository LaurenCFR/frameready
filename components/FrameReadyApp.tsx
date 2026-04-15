"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";
type View = "home" | "dashboard" | "upload" | "admin";

type AdminOrder = {
  id: string;
  dbId?: string;
  clientName: string;
  clientEmail: string;
  packageName: string;
  total: number;
  status: string;
  paid: boolean;
  turnaround: string;
  submittedAt: string;
  languages: string[];
  addOns: string[];
  sourceFiles: string[];
  deliveryFiles: string[];
  notes: string;
};

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

const initialAdminOrders: AdminOrder[] = [
  {
    id: "FR-1001",
    clientName: "Lauren Clifton",
    clientEmail: "admin@framereadystudio.com",
    packageName: "🔥 Pro",
    total: 299,
    status: "In Progress",
    paid: true,
    turnaround: "Due in 1 day",
    submittedAt: "Today, 9:42 AM",
    languages: ["Spanish", "French"],
    addOns: ["🌍 Localised Versions Pack", "⚡ Express Delivery"],
    sourceFiles: ["poster-master.psd", "filmhub-key-art.png"],
    deliveryFiles: ["2x3-poster-final.jpg", "16x9-keyart-final.jpg"],
    notes: "Waiting on final localized title spacing review before delivery.",
  },
  {
    id: "FR-1002",
    clientName: "Northlight Pictures",
    clientEmail: "deliveries@northlightpictures.com",
    packageName: "🧱 Essential",
    total: 99,
    status: "Ready for Delivery",
    paid: true,
    turnaround: "Due today",
    submittedAt: "Yesterday, 4:15 PM",
    languages: [],
    addOns: [],
    sourceFiles: ["master-poster.jpg"],
    deliveryFiles: ["2x3-poster-final.jpg", "3x4-filmhub-final.jpg", "16x9-keyart-final.jpg"],
    notes: "All exports completed. Ready to send delivery link.",
  },
  {
    id: "FR-1003",
    clientName: "Blue Harbor Media",
    clientEmail: "ops@blueharbor.media",
    packageName: "💎 Studio",
    total: 524,
    status: "Files Received",
    paid: true,
    turnaround: "Due in 3 days",
    submittedAt: "May 2, 11:08 AM",
    languages: ["German", "Japanese", "Italian"],
    addOns: ["🌍 Localised Versions Pack", "🔤 Title Treatment Pack", "🎨 Artwork Variation Pack"],
    sourceFiles: ["master-key-art.psd", "title-treatment.ai", "font-reference.zip"],
    deliveryFiles: [],
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

export default function FrameReadyApp({ initialView = "home" }: { initialView?: View }) {
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
  const [fileMessages, setFileMessages] = useState<FileMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
const [adminOrdersError, setAdminOrdersError] = useState("");
  const [adminFilter, setAdminFilter] = useState("All");
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState("FR-1001");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(initialView !== "admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
const [clientName, setClientName] = useState("");
const [clientEmail, setClientEmail] = useState("");
const [clientNotes, setClientNotes] = useState("");
const [checkoutError, setCheckoutError] = useState("");
const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const selectedPackageData = packageOptions.find((pkg) => pkg.id === selectedPackage) ?? packageOptions[1];

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

    setAdminOrders(json.orders || []);

    if (json.orders?.length > 0) {
      setSelectedAdminOrderId((current) =>
        current && json.orders.some((order: AdminOrder) => order.id === current)
          ? current
          : json.orders[0].id
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

useEffect(() => {
  if (view === "admin" && isAdminAuthenticated) {
    void loadAdminOrders();
  }
}, [view, isAdminAuthenticated]);

  const totalPrice = useMemo(
    () => calculateTotal(selectedPackage, selectedAddOns, localizedLanguageCount),
    [selectedPackage, selectedAddOns, localizedLanguageCount]
  );

  const filteredAdminOrders =
    adminFilter === "All" ? adminOrders : adminOrders.filter((order) => order.status === adminFilter);

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

  const selectedAdminOrder = adminOrders.find((order) => order.id === selectedAdminOrderId) ?? adminOrders[0];

  const adminSummary = {
  total: adminOrders.length,
  active: adminOrders.filter((order) =>
    ["Paid", "Files Received", "In Progress", "Ready for Delivery"].includes(order.status)
  ).length,
  ready: adminOrders.filter((order) => order.status === "Ready for Delivery").length,
  delivered: adminOrders.filter((order) => order.status === "Completed").length,
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
    await validateFiles(Array.from(e.target.files || []));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    await validateFiles(Array.from(e.dataTransfer?.files || []));
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
  };

  const updateAdminOrder = async (
  id: string,
  updates: Partial<AdminOrder>
) => {
  try {
    const response = await fetch("/api/admin/update-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: id,
        status: updates.status,
        notes: updates.notes,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to update order.");
    }

    setAdminOrders((prev: AdminOrder[]) =>
  prev.map((order) =>
    (order.dbId ?? order.id) === id
      ? {
          ...order,
          ...updates,
        }
      : order
  )
);

    await loadAdminOrders();
  } catch (error) {
    console.error("Failed to update order", error);
  }
};

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminAuthError("Enter your admin email and password to continue.");
      return;
    }
    if (adminEmail.trim().toLowerCase() !== "admin@framereadystudio.com") {
      setAdminAuthError("This preview is limited to admin@framereadystudio.com.");
      return;
    }
    setAdminAuthError("");
    setIsAdminAuthenticated(true);
    setAdminPassword("");
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminEmail("");
    setAdminPassword("");
    navigateTo("home");
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
  kind: "artwork" | "font"
) => {
  if (!uploadFiles.length) return [];

  const formData = new FormData();
  formData.append("kind", kind);

  for (const file of uploadFiles) {
    formData.append("files", file);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error || "Failed to upload files.");
  }

  return json.files ?? [];
};

const handleProceedToPayment = async () => {
  if (!files.length) {
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

    const uploadedArtworkFiles = await uploadFilesToStorage(files, "artwork");
    const uploadedFontFiles = await uploadFilesToStorage(packageFontFiles, "font");

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        notes: clientNotes.trim(),
        packageId: selectedPackage,
        addOnIds: selectedAddOns,
        localizedLanguages,
        localizedTitles,
        localizedRegionGuidelines,
        packageFontInfo,
        uploadedFiles: uploadedArtworkFiles,
        uploadedFontFiles,
      }),
    });

    const orderJson = await orderRes.json();

    if (!orderRes.ok) {
      throw new Error(orderJson?.error || "Failed to create order.");
    }

    const checkoutRes = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderJson?.order?.id }),
    });

    const checkoutJson = await checkoutRes.json();

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
};
  const renderHome = () => (
    <div className={theme.heroPage}>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-10">
        <img src="/frameready-logo.png" alt="FrameReady logo" className="mb-4 w-20 cursor-pointer" onClick={() => navigateTo("home")} />
        <h1 className="mb-2 text-4xl font-bold">FrameReady</h1>
        <p className={`mb-4 max-w-md ${theme.mutedText}`}>
          <span className="font-semibold text-white">Professional Artwork QC & Formatting for Streaming Platforms.</span>
        </p>
        <div className={`mb-6 max-w-md space-y-2 text-sm ${theme.mutedText}`}>
          <p>✔ Get your artwork approved the first time</p>
          <p>✔ Avoid costly rejections and delays</p>
          <p>✔ Save hours of guesswork on platform specs</p>
          <p>✔ Delivery-ready assets for Filmhub, Amazon, Netflix & more</p>
        </div>
        <button onClick={() => navigateTo("dashboard")} className={`rounded-xl px-8 py-3 ${theme.buttonPrimary}`}>Get Started</button>
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Scroll to case studies</p>
          <div className="animate-bounce text-lg text-indigo-200/80">↓</div>
        </div>
      </div>

      <div className="px-6 py-10 -mt-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className={`mb-2 text-sm font-medium uppercase tracking-[0.2em] ${theme.accentLine}`}>Real fixes. Real approvals.</p>
            <h2 className="mb-3 text-3xl font-bold">Case Studies</h2>
            <p className={`mx-auto max-w-2xl text-sm ${theme.mutedText}`}>
              These are real examples of artwork that failed platform QC before being corrected, reformatted, and approved after our fixes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className={`rounded-2xl p-6 ${theme.panel}`}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">Rejected by Filmhub → Approved First Pass</h3>
                <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300">BEFORE ❌ / AFTER ✅</span>
              </div>
              <div className="mb-4 grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-300">Before</p>
                  <img src="/before-filmhub.jpg" alt="Filmhub before" className="rounded-xl border border-white/8" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300">After</p>
                  <img src="/after-filmhub.jpg" alt="Filmhub after" className="rounded-xl border border-white/8" />
                </div>
              </div>
              <div className="mb-4 rounded-xl border border-white/6 bg-black/20 p-4">
                <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${theme.mutedText}`}>What we fixed</p>
                <p className={`text-sm ${theme.softText}`}>Safe zones, title legibility, layout balance, and platform delivery formatting.</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-300">Result</p>
                <p className="text-sm text-slate-200">Approved for Filmhub delivery on first submission.</p>
              </div>
            </div>

            <div className={`rounded-2xl p-6 ${theme.panel}`}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">Failed Amazon QC → Approved for Prime Video</h3>
                <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300">BEFORE ❌ / AFTER ✅</span>
              </div>
              <div className="mb-4 grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-300">Before</p>
                  <img src="/before-amazon.jpg" alt="Amazon before" className="rounded-xl border border-white/8" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300">After</p>
                  <img src="/after-amazon.jpg" alt="Amazon after" className="rounded-xl border border-white/8" />
                </div>
              </div>
              <div className="mb-4 rounded-xl border border-white/6 bg-black/20 p-4">
                <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${theme.mutedText}`}>What we fixed</p>
                <p className={`text-sm ${theme.softText}`}>Padding, composition, title contrast, and storefront-safe readability.</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-300">Result</p>
                <p className="text-sm text-slate-200">Approved for Amazon Prime Video with no revision request.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className={`mb-4 text-sm ${theme.mutedText}`}>
              Have a unique project or questions? We can help. Email us at{" "}
              <a href="mailto:admin@framereadystudio.com" className="underline text-slate-300 hover:text-white">admin@framereadystudio.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const selectedLocalizedCount = Math.max(localizedLanguages.length, localizedLanguageCount);

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

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Step 1</p>
                    <h2 className="text-2xl font-semibold">Choose your package</h2>
                    <p className={`mt-2 max-w-2xl text-sm ${theme.mutedText}`}>Start with the package that matches your release, then add only the upgrades you actually need.</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${theme.panel}`}>
                    <p className="font-medium text-white">Compatible with Filmhub, Amazon, Apple TV, Netflix, Roku, Tubi & YouTube</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  {packageOptions.map((pkg) => {
                    const isSelected = selectedPackage === pkg.id;
                    return (
                      <button key={pkg.id} type="button" onClick={() => setSelectedPackage(pkg.id)} className={`h-full rounded-3xl border p-6 text-left align-top transition-all duration-200 ${isSelected ? theme.selectedCard : theme.card}`}>
                        <div className="flex h-full flex-col items-start justify-start">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                              <p className="mt-1 text-2xl font-bold text-white">
  {formatUsd(pkg.price)}
</p>
                            </div>
                            {isSelected && <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Selected</span>}
                          </div>
                          <p className={`mb-4 text-sm ${theme.mutedText}`}>{pkg.description}</p>
                          {pkg.note && <p className={`mb-4 text-xs ${theme.accentLine}`}>{pkg.note}</p>}
                          <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Includes</p>
                            <ul className={`space-y-1.5 text-sm ${theme.softText}`}>
                              {pkg.features.map((feature) => <li key={feature}>• {feature}</li>)}
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
                    <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Step 2</p>
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
                      <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Step 3</p>
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
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
  <div className={`rounded-3xl p-6 ${theme.panel}`}>
    <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>
      Client details
    </p>
    <h2 className="text-xl font-semibold">Who should we deliver to?</h2>
    <p className={`mt-2 text-sm ${theme.mutedText}`}>
      Add the client contact details so the order can be created and tied to checkout.
    </p>

    <div className="mt-5 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-white">Client name</label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Full name or company name"
          className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white">Client email</label>
        <input
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="name@email.com"
          className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white">Project notes (optional)</label>
        <textarea
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
          placeholder="Anything we should know before we begin"
          className={`min-h-[96px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
        />
      </div>
    </div>
  </div>

  <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
                <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Live summary</p>
                <h2 className="text-xl font-semibold">Your package</h2>
                <p className={`mt-2 text-sm ${theme.mutedText}`}>Everything below updates live as you build your order.</p>

                <div className="mt-5 rounded-2xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedPackageData.name}</p>
                      <p className={`mt-1 text-sm ${theme.mutedText}`}>{selectedPackageData.description}</p>
                    </div>
                    <p className="text-xl font-bold text-white">{formatUsd(selectedPackageData.price)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-white">What you receive</p>
                  <ul className={`space-y-2 text-sm ${theme.softText}`}>
                    {expandedPackageFeatures.map((feature) => <li key={feature}>• {feature}</li>)}
                    {selectedAddOnObjects.map((addOn) => <li key={addOn.id}>• {addOn.label}</li>)}
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

                <button onClick={() => navigateTo("upload")} className={`mt-6 w-full rounded-xl py-3 ${theme.buttonPrimary}`}>Continue to Upload</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUpload = () => {
    const selectedLocalizedCount = Math.max(localizedLanguages.length, localizedLanguageCount);

    return (
      <div className={`min-h-screen p-6 ${theme.page}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/frameready-logo.png" alt="FrameReady logo" className="w-14 cursor-pointer" onClick={() => navigateTo("home")} />
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${theme.accentLine}`}>Final step</p>
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

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Step 4</p>
                    <h2 className="text-xl font-semibold">Add your source files</h2>
                    <p className={`mt-2 text-sm ${theme.mutedText}`}>Upload the main artwork you want us to fix, format, and deliver across your selected platforms.</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${theme.panel}`}>
                    <p className="font-medium text-white">Minimum resolution: {MIN_DIMENSION_PX}px</p>
                    <p className={`mt-1 text-xs ${theme.mutedText}`}>Recommended: 3000px+ for best results</p>
                  </div>
                </div>

                <div className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all ${isDragging ? "border-cyan-300/70 bg-cyan-400/8 shadow-[0_0_30px_rgba(56,189,248,0.16)]" : "border-white/10 bg-white/[0.03]"}`} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}>
                  <p className="mb-2 text-lg font-medium text-white">Drag & drop your files here</p>
                  <p className={`mb-4 text-sm ${theme.mutedText}`}>PNG, JPG, TIFF • up to {MAX_FILE_SIZE_MB}MB per file</p>
                  <input type="file" multiple accept="image/png,image/jpeg,image/jpg,image/tiff" onChange={handleFileUpload} className="mx-auto" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-2xl p-4 ${theme.panel}`}><p className="text-sm font-semibold text-white">Accepted formats</p><p className={`mt-1 text-sm ${theme.mutedText}`}>PNG, JPG, TIFF</p></div>
                  <div className={`rounded-2xl p-4 ${theme.panel}`}><p className="text-sm font-semibold text-white">Validation</p><p className={`mt-1 text-sm ${theme.mutedText}`}>Checks size, file type, and minimum resolution for PNG/JPG</p></div>
                </div>
              </div>

              {files.length > 0 && (
                <div className={`rounded-3xl p-6 ${theme.panel}`}>
                  <div className="mb-4"><h2 className="text-lg font-semibold">Uploaded files</h2><p className={`mt-1 text-sm ${theme.mutedText}`}>{files.length} file{files.length !== 1 ? "s" : ""} ready for review</p></div>
                  <div className="space-y-2">
                    {files.map((file) => <div key={`${file.name}-${file.size}`} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${theme.card}`}><div><p className="font-medium text-white">{file.name}</p><p className={`mt-1 text-xs ${theme.mutedText}`}>{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><button onClick={() => removeFile(file.name)} className="text-sm text-slate-300 hover:text-white">Remove</button></div>)}
                  </div>
                </div>
              )}

              {fileMessages.filter((message) => message.type === "error").length > 0 && (
                <div className={`rounded-2xl p-4 text-sm ${theme.errorPanel}`}><p className="mb-2 font-semibold">Files blocked</p>{fileMessages.filter((message) => message.type === "error").map((message, i) => <p key={`${message.text}-${i}`}>• {message.text}</p>)}</div>
              )}

              {fileMessages.filter((message) => message.type === "warning").length > 0 && (
                <div className={`rounded-2xl p-4 text-sm ${theme.warnPanel}`}><p className="mb-2 font-semibold">Accepted with review notes</p>{fileMessages.filter((message) => message.type === "warning").map((message, i) => <p key={`${message.text}-${i}`}>• {message.text}</p>)}</div>
              )}

              <div className={`rounded-3xl p-6 ${theme.panel}`}>
                <h2 className="mb-4 text-lg font-semibold">What to upload</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={`rounded-2xl p-4 ${theme.card}`}><p className="mb-2 text-sm font-semibold text-white">Required</p><ul className={`list-disc space-y-1 pl-5 text-sm ${theme.mutedText}`}><li><span className="font-semibold text-white">Primary artwork / poster art</span></li><li>Preferred formats: PSD, PNG, JPG, or TIFF</li></ul></div>
                  <div className={`rounded-2xl p-4 ${theme.card}`}><p className="mb-2 text-sm font-semibold text-white">Optional</p><ul className={`list-disc space-y-1 pl-5 text-sm ${theme.mutedText}`}><li>Separate title treatment file if available</li><li>Layered PSD for faster and more accurate adjustments</li><li>Alternate artwork versions you want us to optimize</li></ul></div>
                </div>
                {selectedAddOns.includes("localized") && (
                  <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 p-4">
                    <p className="mb-2 text-sm font-semibold text-white">Localised Versions Pack — what client must provide</p>
                    <div className={`grid gap-4 text-sm ${theme.mutedText} md:grid-cols-2`}>
                      <div><p className="font-semibold text-white">Required</p><ul className="mt-1 list-disc space-y-1 pl-5"><li>Translated title (This is what we will use)</li><li>Language list</li></ul></div>
                      <div><p className="font-semibold text-white">Optional but important</p><ul className="mt-1 list-disc space-y-1 pl-5"><li>Region-specific guidelines</li></ul></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <div className={`rounded-3xl p-6 ${theme.panelStrong}`}>
                <div className={`rounded-3xl p-6 ${theme.panel}`}>
  <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>
    Client details
  </p>

  <h2 className="text-xl font-semibold">Who should we deliver to?</h2>

  <p className={`mt-2 text-sm ${theme.mutedText}`}>
    Add the client contact details so we can process and deliver your order.
  </p>

  <div className="mt-5 space-y-4">
    <div>
      <label className="mb-1 block text-xs font-medium text-white">
        Client name
      </label>
      <input
        type="text"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        placeholder="Full name or company"
        className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
      />
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-white">
        Client email
      </label>
      <input
        type="email"
        value={clientEmail}
        onChange={(e) => setClientEmail(e.target.value)}
        placeholder="name@email.com"
        className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
      />
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-white">
        Notes (optional)
      </label>
      <textarea
        value={clientNotes}
        onChange={(e) => setClientNotes(e.target.value)}
        placeholder="Anything we should know"
        className={`min-h-[90px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`}
      />
    </div>
  </div>
</div>
                <p className={`mb-2 text-[11px] font-medium uppercase tracking-[0.22em] ${theme.accentLine}`}>Order summary</p>
                <h2 className="text-xl font-semibold">Ready to submit</h2>
                <p className={`mt-2 text-sm ${theme.mutedText}`}>Review your order before checkout. Your files and selections will be attached to this package.</p>
                <div className="mt-5 rounded-2xl border border-white/6 bg-black/20 p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">{selectedPackageData.name}</span><span className="text-lg font-bold text-white">{formatUsd(selectedPackageData.price)}</span></div><p className={`mt-2 text-sm ${theme.mutedText}`}>{selectedPackageData.description}</p></div>
                <div className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-white">Selected upgrades</p>
                  <div className="space-y-2">
                    {selectedAddOns.length === 0 ? <p className={`text-sm ${theme.mutedText}`}>No add-ons selected</p> : selectedAddOns.map((addOnId) => {
                      const addOn = addOns.find((item) => item.id === addOnId);
                      if (!addOn) return null;
                      const price = addOn.id === "localized" ? addOn.price * selectedLocalizedCount : addOn.price;
                      return <div key={addOn.id} className="flex items-center justify-between rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-sm"><span className={theme.softText}>{addOn.label}{addOn.id === "localized" ? ` (${selectedLocalizedCount} language${selectedLocalizedCount !== 1 ? "s" : ""})` : ""}</span><span className="font-medium text-white">{formatUsd(price)}</span></div>;
                    })}
                  </div>
                </div>
                <div className="mt-5"><p className="mb-3 text-sm font-semibold text-white">Files added</p><div className={`rounded-2xl p-4 ${theme.panel}`}><p className="text-2xl font-bold text-white">{files.length}</p><p className={`mt-1 text-sm ${theme.mutedText}`}>file{files.length !== 1 ? "s" : ""} uploaded</p></div></div>
                <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between"><span className="text-base font-semibold text-white">Total</span><span className="text-2xl font-bold text-white">{formatUsd(totalPrice)}</span></div>
                <div className="mt-6">
  <button
    onClick={handleProceedToPayment}
    className={`w-full rounded-xl py-3 ${theme.buttonPrimary}`}
    disabled={!canProceedToCheckout || isSubmittingCheckout}
  >
    {isSubmittingCheckout
      ? "Uploading files and redirecting..."
      : !files.length
      ? "Upload artwork to continue"
      : "Proceed to Payment"}
  </button>

  {!files.length && (
    <p className={`mt-2 text-center text-xs ${theme.mutedText}`}>
      You must upload artwork before continuing to payment.
    </p>
  )}

  {files.length > 0 && !clientName.trim() && (
    <p className={`mt-2 text-center text-xs ${theme.mutedText}`}>
      Add the client name before continuing.
    </p>
  )}

  {files.length > 0 &&
    clientName.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()) && (
      <p className={`mt-2 text-center text-xs ${theme.mutedText}`}>
        Add a valid client email before continuing.
      </p>
    )}

  {checkoutError && (
    <div className={`mt-3 rounded-xl p-3 text-sm ${theme.errorPanel}`}>
      {checkoutError}
    </div>
  )}
</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminAuth = () => (
    <div className={`min-h-screen p-6 ${theme.page}`}>
      <div className="mx-auto max-w-md pt-10">
        <div className="mb-8 flex items-center justify-center"><img src="/frameready-logo.png" alt="FrameReady logo" className="w-14 cursor-pointer" onClick={() => navigateTo("home")} /></div>
        <div className={`rounded-2xl p-6 ${theme.panelStrong}`}>
          <p className={`mb-2 text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>Admin access</p>
          <h1 className="mb-3 text-2xl font-semibold">Sign in to Admin</h1>
          <p className={`mb-6 text-sm ${theme.mutedText}`}>This is a preview-only admin gate. We’ll replace this with real Supabase auth in the next step.</p>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div><label className="mb-1 block text-xs font-medium text-white">Email</label><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@framereadystudio.com" className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} autoComplete="email" /></div>
            <div><label className="mb-1 block text-xs font-medium text-white">Password</label><input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter your admin password" className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} autoComplete="current-password" /></div>
            {adminAuthError && <div className={`rounded-xl p-3 text-sm ${theme.errorPanel}`}><p className="font-semibold">Sign-in failed</p><p className="mt-1 text-rose-100">{adminAuthError}</p></div>}
            <button type="submit" className={`w-full rounded-xl py-3 ${theme.buttonPrimary}`}>Sign in to Admin</button>
          </form>
        </div>
      </div>
    </div>
  );

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
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
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

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className={`rounded-2xl p-4 ${theme.panelStrong}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Total orders</p><p className="mt-2 text-3xl font-semibold">{adminSummary.total}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Active</p><p className="mt-2 text-3xl font-semibold">{adminSummary.active}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Ready to deliver</p><p className="mt-2 text-3xl font-semibold">{adminSummary.ready}</p></div>
          <div className={`rounded-2xl p-4 ${theme.panel}`}><p className={`text-xs uppercase tracking-[0.18em] ${theme.mutedText}`}>Completed</p><p className="mt-2 text-3xl font-semibold">{adminSummary.delivered}</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={`rounded-2xl p-4 ${theme.panel}`}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>Orders</p><h2 className="text-lg font-semibold">Track and manage client deliveries</h2></div>
              <div className="flex flex-wrap gap-2">{["All", "Files Received", "In Progress", "Ready for Delivery", "Completed"].map((filter) => <button key={filter} type="button" onClick={() => setAdminFilter(filter)} className={`rounded-full px-3 py-2 text-xs ${adminFilter === filter ? theme.selectedAddon : theme.pill}`}>{filter}</button>)}</div>
            </div>

            <div className="space-y-3">
  {adminOrdersLoading && (
    <div className={`rounded-2xl p-4 text-sm ${theme.panel}`}>
      Loading real orders...
    </div>
  )}

  {adminOrdersError && (
    <div className={`rounded-2xl p-4 text-sm ${theme.errorPanel}`}>
      {adminOrdersError}
    </div>
  )}

  {!adminOrdersLoading && filteredAdminOrders.length === 0 && (
    <div className={`rounded-2xl p-4 text-sm ${theme.panel}`}>
      No real orders found yet.
    </div>
  )}

  {!adminOrdersLoading &&
    filteredAdminOrders.map((order) => {
      const isSelected = order.id === selectedAdminOrderId;
      return (
        <button
          key={order.id}
          type="button"
          onClick={() => setSelectedAdminOrderId(order.id)}
          className={`w-full rounded-2xl p-4 text-left transition-all ${
            isSelected ? theme.selectedCard : theme.card
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">{order.id}</p>
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
                order.status === "Ready for Delivery"
                  ? "border border-emerald-400/20 bg-emerald-500/10"
                  : order.status === "In Progress"
                  ? theme.selectedAddon
                  : theme.pill
              }`}
            >
              {order.status}
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

          <div className={`rounded-2xl p-4 ${theme.panelStrong}`}>
            {selectedAdminOrder ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-4"><div><p className={`text-xs uppercase tracking-[0.18em] ${theme.accentLine}`}>Selected order</p><h2 className="text-xl font-semibold">{selectedAdminOrder.id}</h2><p className={`mt-1 text-sm ${theme.softText}`}>{selectedAdminOrder.clientName}</p><p className={`text-xs ${theme.mutedText}`}>{selectedAdminOrder.clientEmail}</p></div><span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>{selectedAdminOrder.packageName}</span></div>
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
                <div className="mb-4 grid gap-4 lg:grid-cols-2"><div className={`rounded-xl p-4 ${theme.panel}`}><p className="mb-2 font-medium text-white">Add-ons</p>{selectedAdminOrder.addOns.length > 0 ? <ul className={`space-y-1 text-sm ${theme.softText}`}>{selectedAdminOrder.addOns.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className={`text-sm ${theme.mutedText}`}>No add-ons selected</p>}</div><div className={`rounded-xl p-4 ${theme.panel}`}><p className="mb-2 font-medium text-white">Languages</p>{selectedAdminOrder.languages.length > 0 ? <div className="flex flex-wrap gap-2">{selectedAdminOrder.languages.map((language) => <span key={language} className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>{language}</span>)}</div> : <p className={`text-sm ${theme.mutedText}`}>No localized versions on this order</p>}</div></div>
                <div className="mb-4 grid gap-4 lg:grid-cols-2"><div className={`rounded-xl p-4 ${theme.panel}`}><div className="mb-3 flex items-center justify-between"><p className="font-medium text-white">Source files</p><button type="button" className="text-xs underline text-slate-300 hover:text-white">Upload more</button></div><ul className={`space-y-2 text-sm ${theme.softText}`}>{selectedAdminOrder.sourceFiles.map((file: any) => (
  <li
    key={file.path || file.fileName}
    className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 px-3 py-2"
  >
    <span>{file.fileName || file.path}</span>
    <button
      type="button"
      className="text-xs underline text-slate-300 hover:text-white"
    >
      Download
    </button>
  </li>
))}</ul></div><div className={`rounded-xl p-4 ${theme.panel}`}><div className="mb-3 flex items-center justify-between"><p className="font-medium text-white">Delivery files</p><button type="button" className="text-xs underline text-slate-300 hover:text-white">Upload finals</button></div>{selectedAdminOrder.deliveryFiles.length > 0 ? <ul className={`space-y-2 text-sm ${theme.softText}`}>{selectedAdminOrder.deliveryFiles.map((file) => <li key={file} className="flex items-center justify-between rounded-lg border border-white/6 bg-black/20 px-3 py-2"><span>{file}</span><button type="button" className="text-xs underline text-slate-300 hover:text-white">Copy link</button></li>)}</ul> : <div className={`rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-6 text-sm ${theme.mutedText}`}>No delivery files uploaded yet.</div>}</div></div>
                <div className={`rounded-xl p-4 ${theme.panel}`}><div className="mb-3 flex items-center justify-between"><p className="font-medium text-white">Internal notes</p><button type="button" className="text-xs underline text-slate-300 hover:text-white">Save notes</button></div><textarea value={selectedAdminOrder.notes} onChange={(e) => updateAdminOrder(selectedAdminOrder.id, { notes: e.target.value })} className={`min-h-[120px] w-full rounded-xl px-3 py-2 text-sm outline-none ${theme.input}`} /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><button className={`rounded-xl py-3 ${theme.buttonPrimary}`} type="button">Send delivery email</button><button className={`rounded-xl py-3 ${theme.panel}`} type="button">Mark as completed</button></div>
              </>
            ) : (
              <p className={theme.mutedText}>No order selected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (view === "home") return renderHome();
  if (view === "dashboard") return renderDashboard();
  if (view === "upload") return renderUpload();
  return isAdminAuthenticated ? renderAdmin() : renderAdminAuth();
}
