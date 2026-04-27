"use client";

import { useState } from "react";

type DeliveryRevisionFormProps = {
  token: string;
  revisionCount: number;
  revisionLimit: number;
  orderId: string;
  clientName: string;
  clientEmail: string;
};

export default function DeliveryRevisionForm({
  token,
  revisionCount,
  revisionLimit,
  orderId,
  clientName,
  clientEmail,
}: DeliveryRevisionFormProps) {

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const revisionLimitReached = revisionCount >= revisionLimit;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setStatus("idle");
      setErrorMessage("");

      const response = await fetch(`/api/delivery/${token}/request-revision`, {
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
      setMessage("");
      window.location.reload();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to request revision."
      );
    } finally {
      setIsSubmitting(false);
    }
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
              You’ve used all included revisions ({revisionCount} of{" "}
              {revisionLimit}).
            </p>
            <p>
              Need more changes? You can request a priority paid revision below.
            </p>
          </>
        ) : (
          <p>
            Let us know what needs adjusting. {revisionCount} of {revisionLimit}{" "}
            revisions used.
          </p>
        )}
      </div>

      {!revisionLimitReached && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Example: Please reduce the title size on the 16:9 key art and adjust the safe zone spacing."
          className="mt-3 min-h-[110px] w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
      )}

      {revisionLimitReached && (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-500/10 p-4">
          <p className="text-sm font-medium text-orange-200">
            Priority revision
          </p>
          <p className="mt-1 text-sm text-orange-100/80">
            Additional revisions can be reviewed and priced separately.
          </p>

        <button
  type="button"
  onClick={async () => {
    await fetch(`/api/delivery/${token}/request-priority-revision`, {
      method: "POST",
    });

    const subject = encodeURIComponent(`Paid revision request — ${orderId}`);
    const body = encodeURIComponent(`Order: ${orderId}
Client: ${clientName}
Client email: ${clientEmail}
Delivery token: ${token}

Revision request:
`);

    window.location.href = `mailto:admin@framereadystudio.com?subject=${subject}&body=${body}`;
  }}
  className="mt-3 inline-flex rounded-lg bg-orange-300 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-orange-200"
>
  Request paid revision
</button>

        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!revisionLimitReached && (
  <button
    type="button"
    onClick={handleSubmit}
    disabled={isSubmitting}
    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isSubmitting ? "Sending..." : "Request revision"}
  </button>
)}

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