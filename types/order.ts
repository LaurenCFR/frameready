export type PackageId = "essential" | "pro" | "studio";

export type AddOnId = "variation" | "localized" | "logo_pack" | "express";

export type CurrencyCode = "usd";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "files_received"
  | "in_progress"
  | "ready_for_delivery"
  | "revision_requested"
  | "completed"
  | "cancelled";

export type UploadedFileRecord = {
  path: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl?: string | null;
};

export type LocalizedTitles = Record<string, string>;

export type OrderCreateInput = {
  clientName: string;
  clientEmail: string;
  notes?: string | null;

  packageId: PackageId;
  addOnIds: AddOnId[];

  localizedLanguages: string[];
  localizedTitles: LocalizedTitles;
  localizedRegionGuidelines?: string | null;

  packageFontInfo?: string | null;

  uploadedFiles: UploadedFileRecord[];
  uploadedFontFiles: UploadedFileRecord[];
};

export type OrderRow = {
  id: string;
  public_order_id: string | null;

  client_name: string | null;
  client_email: string | null;
  notes: string | null;

  package_id: PackageId;
  package_name: string;

  add_on_ids: AddOnId[];
  add_on_labels: string[];

  localized_languages: string[];
  localized_titles: LocalizedTitles;
  localized_region_guidelines: string | null;

  package_font_info: string | null;

  uploaded_files: UploadedFileRecord[];
  uploaded_font_files: UploadedFileRecord[];

  subtotal_cents: number;
  total_cents: number;
  currency: CurrencyCode;

  payment_status: PaymentStatus;
  order_status: OrderStatus;

  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;

  created_at: string;
  updated_at: string;
};

export type AdminOrderView = {
  id: string;
  publicOrderId: string;
  clientName: string;
  clientEmail: string;
  packageName: string;
  total: number;
  status: OrderStatus;
  paid: boolean;
  languages: string[];
  addOns: string[];
  sourceFiles: UploadedFileRecord[];
  deliveryFiles: UploadedFileRecord[];
  notes: string | null;
  submittedAt: string;
};

export type PricingBreakdown = {
  packageId: PackageId;
  packageName: string;
  packagePriceCents: number;
  addOns: Array<{
    id: AddOnId;
    label: string;
    unitPriceCents: number;
    quantity: number;
    totalPriceCents: number;
  }>;
  subtotalCents: number;
  totalCents: number;
  currency: CurrencyCode;
};