import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADD_ON_CONFIG,
  calculatePricing,
  calculatePricingFromStoredPackagePrice,
  getStoredPackagePriceCents,
} from "../lib/pricing.ts";

test("uses launch package prices without changing add-on prices", () => {
  assert.equal(calculatePricing({ packageId: "essential", addOnIds: [] }).totalCents, 4900);
  assert.equal(calculatePricing({ packageId: "pro", addOnIds: [] }).totalCents, 9900);
  assert.equal(calculatePricing({ packageId: "studio", addOnIds: [] }).totalCents, 22900);
  assert.equal(ADD_ON_CONFIG.variation.priceCents, 7500);
  assert.equal(ADD_ON_CONFIG.localized.priceCents, 5000);
  assert.equal(ADD_ON_CONFIG.logo_pack.priceCents, 10000);
  assert.equal(ADD_ON_CONFIG.express.priceCents, 5000);
});

test("retains an existing order package-price snapshot", () => {
  const packagePriceCents = getStoredPackagePriceCents({
    storedTotalCents: 19900,
    packageId: "pro",
    addOnIds: [],
    localizedLanguageCount: 1,
  });
  const pricing = calculatePricingFromStoredPackagePrice({
    packageId: "pro",
    packageName: "Pro",
    packagePriceCents,
    addOnIds: [],
    localizedLanguageCount: 1,
  });

  assert.equal(packagePriceCents, 19900);
  assert.equal(pricing.totalCents, 19900);
});

test("changes only localized add-on quantity when an existing draft is updated", () => {
  const packagePriceCents = getStoredPackagePriceCents({
    storedTotalCents: 14900,
    packageId: "pro",
    addOnIds: ["localized"],
    localizedLanguageCount: 1,
  });
  const pricing = calculatePricingFromStoredPackagePrice({
    packageId: "pro",
    packageName: "Pro",
    packagePriceCents,
    addOnIds: ["localized"],
    localizedLanguageCount: 3,
  });

  assert.equal(packagePriceCents, 9900);
  assert.equal(pricing.totalCents, 24900);
});
