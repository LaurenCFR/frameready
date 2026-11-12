import assert from "node:assert/strict";
import test from "node:test";
import { createAdminCleanupHandlers } from "../lib/admin-cleanup-policy.ts";

test("unauthenticated POST cannot delete or archive orders", async () => {
  let cleanupCalls = 0;
  const handlers = createAdminCleanupHandlers({
    authenticate: async () => ({ authenticated: false }),
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
    readStatus: async () => ({ lastRun: null }),
  });

  const result = await handlers.post();

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "Unauthorized" });
  assert.equal(cleanupCalls, 0);
});

test("unauthenticated GET cannot run cleanup or read status", async () => {
  let cleanupCalls = 0;
  let statusCalls = 0;
  const handlers = createAdminCleanupHandlers({
    authenticate: async () => ({ authenticated: false }),
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
    readStatus: async () => {
      statusCalls += 1;
      return { lastRun: null };
    },
  });

  const result = await handlers.get();

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "Unauthorized" });
  assert.equal(cleanupCalls, 0);
  assert.equal(statusCalls, 0);
});

test("authenticated GET is read-only", async () => {
  let cleanupCalls = 0;
  let statusCalls = 0;
  const handlers = createAdminCleanupHandlers({
    authenticate: async () => ({ authenticated: true }),
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
    readStatus: async () => {
      statusCalls += 1;
      return { lastRun: "2026-11-12T00:00:00.000Z" };
    },
  });

  const result = await handlers.get();

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { lastRun: "2026-11-12T00:00:00.000Z" });
  assert.equal(cleanupCalls, 0);
  assert.equal(statusCalls, 1);
});

test("authenticated POST preserves the cleanup action", async () => {
  let cleanupCalls = 0;
  const handlers = createAdminCleanupHandlers({
    authenticate: async () => ({ authenticated: true }),
    cleanup: async () => {
      cleanupCalls += 1;
      return { success: true };
    },
    readStatus: async () => ({ lastRun: null }),
  });

  const result = await handlers.post();

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true });
  assert.equal(cleanupCalls, 1);
});
