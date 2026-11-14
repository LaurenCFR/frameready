import { timingSafeEqual } from "node:crypto";

type CleanupResult = { success: true };

type CronCleanupDependencies = {
  getSecret: () => string | undefined;
  cleanup: () => Promise<CleanupResult>;
};

function secretsMatch(actual: string | null, expectedSecret: string | undefined) {
  if (!actual || !expectedSecret) return false;

  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  const provided = Buffer.from(actual);

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

export function createCronCleanupHandler(
  dependencies: CronCleanupDependencies
) {
  return async function handleCronCleanup(request: Request) {
    if (
      !secretsMatch(
        request.headers.get("authorization"),
        dependencies.getSecret()
      )
    ) {
      return { body: { error: "Unauthorized" }, status: 401 as const };
    }

    return {
      body: await dependencies.cleanup(),
      status: 200 as const,
    };
  };
}
