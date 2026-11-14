const DAY_MS = 24 * 60 * 60 * 1000;

export type OrderCleanupOperations = {
  deleteDraftsBefore: (cutoff: Date) => Promise<void>;
  archiveCompletedBefore: (cutoff: Date, archivedAt: Date) => Promise<void>;
  recordRun: (ranAt: Date) => Promise<void>;
};

export async function executeOrderCleanup(
  operations: OrderCleanupOperations,
  now = new Date()
) {
  await operations.deleteDraftsBefore(new Date(now.getTime() - DAY_MS));
  await operations.archiveCompletedBefore(
    new Date(now.getTime() - 3 * DAY_MS),
    now
  );
  await operations.recordRun(now);

  return { success: true as const };
}
