export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "paid",
  "files_received",
  "in_progress",
  "ready_for_delivery",
  "revision_requested",
  "completed",
  "cancelled",
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
  completed: "Completed",
  cancelled: "Cancelled",
};

export type UploadedFileRecord = {
  path: string;
  bucket: string;
  fileName?: string | null;
  size?: number | null;
  mimeType?: string | null;
};

export type OrderRow = {
  id: string;
  status: OrderStatus;
  client_name: string | null;
  client_email: string | null;
  package_name: string | null;
  total: number | null;
  turnaround: string | null;
  add_ons: string[] | null;
  languages: string[] | null;
  source_files: UploadedFileRecord[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};