export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "paid",
  "files_received",
  "in_progress",
  "ready_for_delivery",
  "revision_requested",
  "priority_revision_requested",
  "completed",
  "cancelled",
  "archived",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  files_received: "Files Received",
  in_progress: "In Progress",
  ready_for_delivery: "Ready for Delivery",
  revision_requested: "Revision Requested",
  priority_revision_requested: "Priority Revision Requested",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export type UploadedFileRecord = {
  path: string;
  bucket: string;
  fileName?: string | null;
  size?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  publicUrl?: string | null;
  signedUrl?: string | null;
};

export type OrderRow = {
  id: string;
  public_order_id?: string | null;

  client_name: string | null;
  client_email: string | null;
  package_name: string | null;

  package_id?: PackageId | null;
  add_on_ids?: AddOnId[] | null;

  total_cents: number | null;
  payment_status: string | null;
  order_status: OrderStatus;

  localized_languages: string[] | null;
  add_on_labels: string[] | null;
  uploaded_files: UploadedFileRecord[] | null;

  localized_titles?: Record<string, string> | null;
  localized_region_guidelines?: string | null;
  package_font_info?: string | null;
  uploaded_font_files?: UploadedFileRecord[] | null;

  delivery_files?: UploadedFileRecord[] | null;
  delivered_at?: string | null;
  delivered_by?: string | null;
  delivery_email_sent_at?: string | null;
  delivery_status?: "not_sent" | "ready_to_send" | "sent" | null;
  revision_requested_at?: string | null;
  revision_request_message?: string | null;
  revision_count?: number | null;
  revision_limit?: number | null;
  revision_delivery_files?: UploadedFileRecord[] | null;
  revision_email_sent_at?: string | null;

  notes?: string | null;

  turnaround?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  delivery_token?: string | null;
};

export type PackageId = "essential" | "pro" | "studio";

export type AddOnId =
  | "variation"
  | "localized"
  | "logo_pack"
  | "express";

export type OrderCreateInput = {
  clientName: string;
  clientEmail: string;
  packageId: PackageId;
  addOnIds: AddOnId[];
  localizedLanguages: string[];
  localizedTitles?: Record<string, string> | null;
  localizedRegionGuidelines?: string | null;
  packageFontInfo?: string | null;
  uploadedFiles?: UploadedFileRecord[] | null;
  uploadedFontFiles?: UploadedFileRecord[] | null;
  notes?: string | null;
};

export type CurrencyCode = "usd" | "aud";

export type PricingBreakdown = {
  currency: CurrencyCode;
  packageId: PackageId;
  packageName: string;
  packagePriceCents: number;
  addOns: Array<{
    id: AddOnId;
    label: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  subtotalCents: number;
  totalCents: number;
};

export type AdminOrder = {
  id: string;
  dbId?: string;

  clientName: string;
  clientEmail: string;

  packageName: string;
  total: number;

  status: OrderStatus;
  paid: boolean;

  turnaround?: string;

  // Localised pack
  languages: string[];
  localizedTitles: Record<string, string>;

  // Optional extras
  regionGuidelines?: string;
  packageFontInfo?: string;
  fontFiles?: UploadedFileRecord[];

  // Files
  sourceFiles: UploadedFileRecord[];
  deliveryFiles: UploadedFileRecord[];
  revisionDeliveryFiles: UploadedFileRecord[];

  // 🔥 ADD THESE (fix your errors)
  submittedAt?: string;
  addOns?: string[];

  revisionRequestedAt?: string;
  revisionRequestMessage?: string;
  revisionEmailSentAt?: string;

  // Misc
  notes?: string;

  // Delivery metadata
  deliveredAt?: string;
  deliveredBy?: string;
  deliveryEmailSentAt?: string;
  deliveryStatus?: "not_sent" | "ready_to_send" | "sent" | null;
};