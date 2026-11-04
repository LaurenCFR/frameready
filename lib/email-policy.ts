import type { FrameReadyEnvironment } from "./environment";

type EmailPolicyInput = {
  environment: FrameReadyEnvironment;
  deliveryMode: string;
  intendedRecipients: string | string[];
  subject: string;
  testRecipient?: string;
};

export function resolveEmailPolicy(input: EmailPolicyInput) {
  if (input.environment === "production" && input.deliveryMode !== "live") {
    throw new Error("Production email requires EMAIL_DELIVERY_MODE=live.");
  }

  if (input.environment !== "production" && input.deliveryMode !== "redirect") {
    throw new Error("Non-production email requires EMAIL_DELIVERY_MODE=redirect.");
  }

  if (input.deliveryMode === "redirect") {
    if (!input.testRecipient?.trim()) {
      throw new Error("Non-production email requires EMAIL_TEST_RECIPIENT.");
    }

    return {
      isRedirected: true,
      to: input.testRecipient.trim(),
      subject: `[FrameReady ${input.environment}] ${input.subject}`,
    } as const;
  }

  return {
    isRedirected: false,
    to: input.intendedRecipients,
    subject: input.subject,
  } as const;
}
