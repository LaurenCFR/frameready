import type { OrderStatus } from "@/types/order";

export type OrderDueInfo = {
  label: string;
  overdue: boolean;
  dueSoon: boolean;
};

const STATUS_LABELS_WITHOUT_DEADLINES: Partial<Record<OrderStatus, string>> = {
  draft: "Draft",
  awaiting_payment: "Pending payment",
  paid: "Queued",
  ready_for_delivery: "Ready for delivery",
  completed: "Delivered",
  cancelled: "Cancelled",
  archived: "Archived",
  revision_requested: "Revision requested",
  revision_in_progress: "Revision in progress",
  revision_ready_for_delivery: "Revision ready for delivery",
  paid_revision_quote_requested: "Paid revision quote requested",
  awaiting_priority_revision_payment: "Awaiting revision payment",
  paid_revision_paid: "Paid revision queued",
  paid_revision_in_progress: "Paid revision in progress",
  paid_revision_ready_for_delivery: "Paid revision ready for delivery",
};

export function getOrderDueInfo(
  order: {
    status: OrderStatus;
    submittedAt?: string;
    hasExpressDelivery?: boolean;
  },
  nowMs = Date.now()
): OrderDueInfo {
  if (order.status !== "files_received" && order.status !== "in_progress") {
    return {
      label: STATUS_LABELS_WITHOUT_DEADLINES[order.status] || "Pending",
      overdue: false,
      dueSoon: false,
    };
  }

  if (!order.submittedAt) {
    return { label: "Due date unknown", overdue: false, dueSoon: false };
  }

  const createdAt = Date.parse(order.submittedAt);
  if (Number.isNaN(createdAt)) {
    return { label: "Due date unknown", overdue: false, dueSoon: false };
  }

  const turnaroundHours = order.hasExpressDelivery ? 24 : 72;
  const diffMs = createdAt + turnaroundHours * 60 * 60 * 1000 - nowMs;
  const diffHours = Math.ceil(Math.abs(diffMs) / (60 * 60 * 1000));

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
}
