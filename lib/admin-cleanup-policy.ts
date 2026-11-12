type AdminSession =
  | { authenticated: false }
  | { authenticated: true; email?: string };

type CleanupStatus = {
  lastRun: string | null;
};

type CleanupResult = {
  success: true;
};

type HandlerResult<T> = {
  body: T | { error: "Unauthorized" };
  status: 200 | 401;
};

type AdminCleanupDependencies = {
  authenticate: () => Promise<AdminSession>;
  cleanup: () => Promise<CleanupResult>;
  readStatus: () => Promise<CleanupStatus>;
};

export function createAdminCleanupHandlers(
  dependencies: AdminCleanupDependencies
) {
  const requireAuthentication = async () => {
    const session = await dependencies.authenticate();
    return session.authenticated;
  };

  return {
    async post(): Promise<HandlerResult<CleanupResult>> {
      if (!(await requireAuthentication())) {
        return { body: { error: "Unauthorized" }, status: 401 };
      }

      return { body: await dependencies.cleanup(), status: 200 };
    },

    async get(): Promise<HandlerResult<CleanupStatus>> {
      if (!(await requireAuthentication())) {
        return { body: { error: "Unauthorized" }, status: 401 };
      }

      return { body: await dependencies.readStatus(), status: 200 };
    },
  };
}
