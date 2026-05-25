"use client";

import { useState } from "react";

type DeliveryRevisionFormProps = {
  token: string;
  revisionCount: number;
  revisionLimit: number;
  canRequestPaidRevision?: boolean;
  orderId: string;
  clientName: string;
  clientEmail: string;
  orderStatus?: string;
};

export default function DeliveryRevisionForm({
  token,
  revisionCount,
  revisionLimit,
  canRequestPaidRevision = false,
  orderId,
  clientName,
  clientEmail,
  orderStatus,
}: DeliveryRevisionFormProps) {

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [paidRevisionQuoteSent, setPaidRevisionQuoteSent] = useState(false);
const [localRevisionCount, setLocalRevisionCount] = useState(revisionCount);
const [localOrderStatus, setLocalOrderStatus] = useState(orderStatus);

const revisionLimitReached = localRevisionCount >= revisionLimit;

const isFreeRevisionActive =
  localOrderStatus === "revision_requested" ||
  localOrderStatus === "revision_in_progress" ||
  localOrderStatus === "revision_ready_for_delivery";

const canRequestFreeRevision =
  localRevisionCount < revisionLimit && !isFreeRevisionActive;

  const isPaidRevisionActive =
  localOrderStatus === "paid_revision_quote_requested" ||
  localOrderStatus === "awaiting_priority_revision_payment" ||
  localOrderStatus === "paid_revision_paid" ||
  localOrderStatus === "paid_revision_in_progress" ||
  localOrderStatus === "paid_revision_ready_for_delivery";

const canRequestPaidRevisionForm =
  localRevisionCount >= revisionLimit &&
  !isFreeRevisionActive &&
  !isPaidRevisionActive &&
  !paidRevisionQuoteSent;

  const submitRevisionRequest = async (endpoint: string, successMessage?: () => void) => {
  try {
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.error || "Failed to request revision.");
    }

    setStatus("success");
    successMessage?.();
    setMessage("");
  } catch (error) {
    setStatus("error");
    setErrorMessage(
      error instanceof Error ? error.message : "Failed to request revision."
    );
  } finally {
    setIsSubmitting(false);
  }
};

const handleSubmitRevision = async () => {
  await submitRevisionRequest(`/api/delivery/${token}/request-revision`);

  setLocalRevisionCount((count) => count + 1);
  setLocalOrderStatus("revision_requested");
};

const handleSubmitPaidRevisionQuote = async () => {
  await submitRevisionRequest(
    `/api/delivery/${token}/request-priority-revision`,
    () => {
      setPaidRevisionQuoteSent(true);
      setLocalOrderStatus("paid_revision_quote_requested");
    }
  );
};

const priorityRevisionSubject = encodeURIComponent(
  `Priority revision request — ${orderId}`
);

const priorityRevisionBody = encodeURIComponent(
  `Order: ${orderId}
Client: ${clientName}
Client email: ${clientEmail}
Delivery token: ${token}

Revision request:
`
);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <h2 className="text-lg font-medium text-white">Need a revision?</h2>

      <div className="mt-2 space-y-1 text-sm text-slate-400">
        {revisionLimitReached ? (
          <>
            <p>
              You’ve used all included revisions ({localRevisionCount} of{" "}
{revisionLimit}).
            </p>
            <p>
              Need more changes? You can request a priority paid revision below.
            </p>
          </>
        ) : (
          <p>
  Let us know what needs adjusting. {localRevisionCount} of{" "}
  {revisionLimit} revisions used.
</p>
        )}
      </div>

      {canRequestFreeRevision && (
      <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Example: Please reduce the title size on the 16:9 key art and adjust the safe zone spacing."
          className="mt-3 min-h-[110px] w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
      )}

      {canRequestPaidRevisionForm && (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-500/10 p-4">
          <p className="text-sm font-medium text-orange-200">
            Priority revision
          </p>
          <p className="mt-1 text-sm text-orange-100/80">
            Additional revisions can be reviewed and priced separately.
          </p>

{paidRevisionQuoteSent || localOrderStatus === "paid_revision_quote_requested" ? (
  <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-200">
    <p className="font-medium">Your paid revision request has been sent.</p>

    <p className="mt-2 text-sm text-emerald-100/90">
      We’ll review the scope and email you a custom revision quote with payment
      instructions if you’d like to proceed.
    </p>
  </div>
) : (
  <>
    <textarea
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder="Describe the changes you need..."
      className="mt-4 min-h-32 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
    />

    <button
      type="button"
      onClick={handleSubmitPaidRevisionQuote}
      className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-black transition hover:bg-amber-300"
    >
      Request paid revision quote
    </button>
  </>
)}

        </div>
      )}

      {(isPaidRevisionActive || paidRevisionQuoteSent) && (
  <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
    Your paid revision quote is currently being processed.
  </div>
)}

  <div className="mt-4 flex flex-col gap-3">
  {isFreeRevisionActive && (
  <p className="text-sm text-amber-300">
    Your revision request has been received. You’ll be able to request another revision after the revised artwork is delivered.
  </p>
)}

{canRequestFreeRevision && (
  <button
    type="button"
    onClick={handleSubmitRevision}
    disabled={isSubmitting}
      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? "Sending..." : "Request revision"}
    </button>
  )}
</div>

<div className="mt-4 flex flex-col gap-2">
  {status === "success" && (
          <span className="text-sm text-emerald-400">
            Revision request sent.
          </span>
        )}

        {status === "error" && (
          <span className="text-sm text-red-400">{errorMessage}</span>
        )}
      </div>
      
    </div>
  );
}