import { Resend } from "resend";
import {
  getFrameReadyEnvironment,
  getRequiredEnvironmentVariable,
} from "@/lib/environment";
import { resolveEmailPolicy } from "@/lib/email-policy";

type EmailMessage = {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(getRequiredEnvironmentVariable("RESEND_API_KEY"));
  }

  return resend;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(message: EmailMessage) {
  const environment = getFrameReadyEnvironment();
  const deliveryMode = getRequiredEnvironmentVariable("EMAIL_DELIVERY_MODE");
  const intendedRecipients = Array.isArray(message.to)
    ? message.to.join(", ")
    : message.to;

  const policy = resolveEmailPolicy({
    environment,
    deliveryMode,
    intendedRecipients: message.to,
    subject: message.subject,
    testRecipient: process.env.EMAIL_TEST_RECIPIENT,
  });
  const { isRedirected, subject, to } = policy;
  const previewNotice = isRedirected
    ? `<p style="padding:12px;background:#fef3c7;color:#78350f"><strong>Non-production email.</strong> Intended recipient: ${escapeHtml(intendedRecipients)}</p>`
    : "";

  return getResend().emails.send({
    from:
      message.from ||
      getRequiredEnvironmentVariable("DELIVERY_FROM_EMAIL"),
    to,
    subject,
    html: `${previewNotice}${message.html}`,
    ...(message.text
      ? {
          text: isRedirected
            ? `NON-PRODUCTION EMAIL\nIntended recipient: ${intendedRecipients}\n\n${message.text}`
            : message.text,
        }
      : {}),
  });
}
