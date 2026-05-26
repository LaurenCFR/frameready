export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "paid",
  "files_received",
  "in_progress",
  "ready_for_delivery",

  // FREE revisions
  "revision_requested",
  "revision_in_progress",
  "revision_ready_for_delivery",

  // PAID revisions
  "paid_revision_quote_requested",
  "awaiting_priority_revision_payment",
  "paid_revision_paid",
  "paid_revision_in_progress",
  "paid_revision_ready_for_delivery",

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
  revision_in_progress: "Revision In Progress",
  revision_ready_for_delivery: "Revision Ready for Delivery",

  paid_revision_quote_requested: "Paid Revision Quote Requested",
  awaiting_priority_revision_payment: "Awaiting Paid Revision Payment",
  paid_revision_paid: "Paid Revision Paid",
  paid_revision_in_progress: "Paid Revision In Progress",
  paid_revision_ready_for_delivery: "Paid Revision Ready for Delivery",

  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export type RevisionHistoryItem = {
  type:
    | "revision_requested"
    | "free_revision"
    | "paid_revision_quote_requested"
    | "awaiting_paid_revision_payment"
    | "paid_revision_paid";

  status?: "pending" | "in_progress" | "completed" | "paid";

  message?: string;

  createdAt: string;

  amountUsd?: number;
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
  delivery_sets?: DeliverySet[] | null;
  revision_history?: RevisionHistoryItem[] | null;
  revision_requested_at?: string | null;
  revision_request_message?: string | null;
  revision_delivery_sets?: RevisionDeliverySet[] | null;
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
  deliverySets?: DeliverySet[];
  revisionDeliverySets?: RevisionDeliverySet[];
  revisionDeliveryFiles: UploadedFileRecord[];


  // 🔥 ADD THESE (fix your errors)
  submittedAt?: string;
  addOns?: string[];
  revisionHistory?: RevisionHistoryItem[];
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

export type DeliverySet = {
  type: "initial" | "free_1" | "free_2" | "paid" | string;
  label: string;
  files: UploadedFileRecord[];
  sentAt?: string | null;
};

export type RevisionDeliverySet = {
  type: string;
  label: string;
  files: UploadedFileRecord[];
  emailSentAt?: string | null;
};
