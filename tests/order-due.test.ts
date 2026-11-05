import assert from "node:assert/strict";
import { test } from "node:test";
import { getOrderDueInfo } from "../lib/order-due.ts";
import { ORDER_STATUSES } from "../types/order.ts";

const now = Date.parse("2026-11-05T16:33:00+11:00");

test("awaiting-payment orders are pending, never overdue", () => {
  const result = getOrderDueInfo(
    {
      status: "awaiting_payment",
      submittedAt: "2026-05-11T14:09:51+10:00",
    },
    now
  );

  assert.deepEqual(result, {
    label: "Pending payment",
    overdue: false,
    dueSoon: false,
  });
});

test("ISO timestamps retain 5 November semantics", () => {
  const result = getOrderDueInfo(
    {
      status: "files_received",
      submittedAt: "2026-11-05T14:09:51+11:00",
    },
    now
  );

  assert.equal(result.overdue, false);
  assert.match(result.label, /^Due in /);
});

test("active fulfilment orders become overdue after their deadline", () => {
  const result = getOrderDueInfo(
    {
      status: "in_progress",
      submittedAt: "2026-11-01T12:00:00+11:00",
    },
    now
  );

  assert.equal(result.overdue, true);
  assert.match(result.label, /^Overdue by /);
});

test("only files-received and in-progress orders receive deadlines", () => {
  for (const status of ORDER_STATUSES) {
    if (status === "files_received" || status === "in_progress") continue;

    const result = getOrderDueInfo(
      { status, submittedAt: "2026-01-01T00:00:00Z" },
      now
    );
    assert.equal(result.overdue, false);
    assert.doesNotMatch(result.label, /^(Due in|Overdue by)/);
  }
});
