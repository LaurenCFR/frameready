import assert from "node:assert/strict";
import test from "node:test";
import { createCronCleanupHandler } from "../lib/cron-cleanup-policy.ts";
import { executeOrderCleanup } from "../lib/order-cleanup-policy.ts";

const CRON_SECRET = "local-test-cron-secret";

test("an unauthenticated cron request cannot run cleanup", async () => {
  let cleanupCalls = 0;
  const handle = createCronCleanupHandler({
    getSecret: () => CRON_SECRET,
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
  });

  for (const authorization of [null, "Bearer wrong-secret"]) {
    const headers = authorization ? { authorization } : undefined;
    const result = await handle(
      new Request("https://example.test/api/cron/cleanup-orders", { headers })
    );

    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: "Unauthorized" });
  }

  assert.equal(cleanupCalls, 0);
});

test("a missing server secret fails closed", async () => {
  let cleanupCalls = 0;
  const handle = createCronCleanupHandler({
    getSecret: () => undefined,
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
  });

  const result = await handle(
    new Request("https://example.test/api/cron/cleanup-orders", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    })
  );

  assert.equal(result.status, 401);
  assert.equal(cleanupCalls, 0);
});

test("an authorized Vercel cron request runs cleanup", async () => {
  let cleanupCalls = 0;
  const handle = createCronCleanupHandler({
    getSecret: () => CRON_SECRET,
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
  });

  const result = await handle(
    new Request("https://example.test/api/cron/cleanup-orders", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    })
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true });
  assert.equal(cleanupCalls, 1);
});

test("repeat cleanup runs preserve the deletion and archival rules", async () => {
  const now = new Date("2026-11-12T03:00:00.000Z");
  const orders = [
    { id: "old-draft", status: "draft", createdAt: "2026-11-11T02:59:59.000Z", updatedAt: "2026-11-11T02:59:59.000Z" },
    { id: "new-draft", status: "draft", createdAt: "2026-11-11T03:00:01.000Z", updatedAt: "2026-11-11T03:00:01.000Z" },
    { id: "old-completed", status: "completed", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-09T02:59:59.000Z" },
    { id: "new-completed", status: "completed", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-09T03:00:01.000Z" },
    { id: "paid", status: "paid", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
  ];
  const recordedRuns: string[] = [];

  const operations = {
    async deleteDraftsBefore(cutoff: Date) {
      for (let index = orders.length - 1; index >= 0; index -= 1) {
        if (
          orders[index].status === "draft" &&
          orders[index].createdAt < cutoff.toISOString()
        ) {
          orders.splice(index, 1);
        }
      }
    },
    async archiveCompletedBefore(cutoff: Date, archivedAt: Date) {
      for (const order of orders) {
        if (
          order.status === "completed" &&
          order.updatedAt < cutoff.toISOString()
        ) {
          order.status = "archived";
          order.updatedAt = archivedAt.toISOString();
        }
      }
    },
    async recordRun(ranAt: Date) {
      recordedRuns.push(ranAt.toISOString());
    },
  };

  await executeOrderCleanup(operations, now);
  const afterFirstRun = structuredClone(orders);
  await executeOrderCleanup(operations, now);

  assert.deepEqual(orders, afterFirstRun);
  assert.deepEqual(
    orders.map(({ id, status }) => ({ id, status })),
    [
      { id: "new-draft", status: "draft" },
      { id: "old-completed", status: "archived" },
      { id: "new-completed", status: "completed" },
      { id: "paid", status: "paid" },
    ]
  );
  assert.deepEqual(recordedRuns, [now.toISOString(), now.toISOString()]);
});
