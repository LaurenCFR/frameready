import type { AddOnId, CurrencyCode, PackageId, PricingBreakdown } from "@/types/order";

export const CURRENCY: CurrencyCode = "usd";

export const PACKAGE_CONFIG: Record<
  PackageId,
  {
    id: PackageId;
    name: string;
    priceCents: number;
  }
> = {
  essential: {
    id: "essential",
    name: "🧱 Essential",
    priceCents: 4900,
  },
  pro: {
    id: "pro",
    name: "🔥 Pro",
    priceCents: 9900,
  },
  studio: {
    id: "studio",
    name: "💎 Studio",
    priceCents: 22900,
  },
};

export const ADD_ON_CONFIG: Record<
  AddOnId,
  {
    id: AddOnId;
    label: string;
    priceCents: number;
    isPerLanguage?: boolean;
  }
> = {
  variation: {
    id: "variation",
    label: "🎨 Artwork Variation Pack",
    priceCents: 7500,
  },
  localized: {
    id: "localized",
    label: "🌍 Localised Versions Pack",
    priceCents: 5000,
    isPerLanguage: true,
  },
  logo_pack: {
    id: "logo_pack",
    label: "🔤 Title Treatment Pack",
    priceCents: 10000,
  },
  express: {
    id: "express",
    label: "⚡ Express Delivery",
    priceCents: 5000,
  },
};

export function normalizeLocalizedQuantity(count: number): number {
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.max(1, Math.floor(count));
}

export function calculatePricing(params: {
  packageId: PackageId;
  addOnIds: AddOnId[];
  localizedLanguageCount?: number;
}): PricingBreakdown {
  const pkg = PACKAGE_CONFIG[params.packageId];
  if (!pkg) {
    throw new Error(`Unknown package: ${params.packageId}`);
  }

  const localizedQty = normalizeLocalizedQuantity(params.localizedLanguageCount ?? 1);

  const addOns = params.addOnIds.map((id) => {
    const config = ADD_ON_CONFIG[id];
    if (!config) {
      throw new Error(`Unknown add-on: ${id}`);
    }

    const quantity = config.isPerLanguage ? localizedQty : 1;
    const totalPriceCents = config.priceCents * quantity;

    return {
      id: config.id,
      label: config.label,
      unitPriceCents: config.priceCents,
      quantity,
      totalPriceCents,
    };
  });

  const subtotalCents =
    pkg.priceCents + addOns.reduce((sum, addOn) => sum + addOn.totalPriceCents, 0);

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packagePriceCents: pkg.priceCents,
    addOns,
    subtotalCents,
    totalCents: subtotalCents,
    currency: CURRENCY,
  };
}

export function calculatePricingFromStoredPackagePrice(params: {
  packageId: PackageId;
  packageName: string;
  packagePriceCents: number;
  addOnIds: AddOnId[];
  localizedLanguageCount?: number;
}): PricingBreakdown {
  const current = calculatePricing({
    packageId: params.packageId,
    addOnIds: params.addOnIds,
    localizedLanguageCount: params.localizedLanguageCount,
  });

  if (!Number.isInteger(params.packagePriceCents) || params.packagePriceCents < 0) {
    throw new Error("Stored package price is invalid.");
  }

  const addOnTotal = current.addOns.reduce(
    (sum, addOn) => sum + addOn.unitPriceCents * addOn.quantity,
    0
  );
  const totalCents = params.packagePriceCents + addOnTotal;

  return {
    ...current,
    packageName: params.packageName,
    packagePriceCents: params.packagePriceCents,
    subtotalCents: totalCents,
    totalCents,
  };
}

export function getStoredPackagePriceCents(params: {
  storedTotalCents: number;
  packageId: PackageId;
  addOnIds: AddOnId[];
  localizedLanguageCount?: number;
}): number {
  const currentAddOns = calculatePricing({
    packageId: params.packageId,
    addOnIds: params.addOnIds,
    localizedLanguageCount: params.localizedLanguageCount,
  }).addOns;
  const addOnTotal = currentAddOns.reduce(
    (sum, addOn) => sum + addOn.unitPriceCents * addOn.quantity,
    0
  );
  const packagePriceCents = params.storedTotalCents - addOnTotal;

  if (!Number.isInteger(packagePriceCents) || packagePriceCents < 0) {
    throw new Error("Stored order total is inconsistent with its add-ons.");
  }

  return packagePriceCents;
}

export function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

function runPricingChecks(): void {
  console.assert(calculatePricing({ packageId: "essential", addOnIds: [] }).totalCents === 4900);
  console.assert(
    calculatePricing({ packageId: "pro", addOnIds: ["express"] }).totalCents === 14900
  );
  console.assert(
    calculatePricing({
      packageId: "pro",
      addOnIds: ["localized"],
      localizedLanguageCount: 3,
    }).totalCents === 24900
  );
  console.assert(
    calculatePricing({
      packageId: "studio",
      addOnIds: ["variation", "logo_pack"],
    }).totalCents === 40400
  );
}

runPricingChecks();
