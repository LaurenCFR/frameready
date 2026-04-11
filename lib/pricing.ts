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
    priceCents: 9900,
  },
  pro: {
    id: "pro",
    name: "🔥 Pro",
    priceCents: 19900,
  },
  studio: {
    id: "studio",
    name: "💎 Studio",
    priceCents: 34900,
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

export function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

function runPricingChecks(): void {
  console.assert(calculatePricing({ packageId: "essential", addOnIds: [] }).totalCents === 9900);
  console.assert(
    calculatePricing({ packageId: "pro", addOnIds: ["express"] }).totalCents === 24900
  );
  console.assert(
    calculatePricing({
      packageId: "pro",
      addOnIds: ["localized"],
      localizedLanguageCount: 3,
    }).totalCents === 34900
  );
  console.assert(
    calculatePricing({
      packageId: "studio",
      addOnIds: ["variation", "logo_pack"],
    }).totalCents === 52400
  );
}

runPricingChecks();