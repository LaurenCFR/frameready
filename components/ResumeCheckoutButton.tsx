"use client";

import { useState } from "react";

type ResumeCheckoutButtonProps = {
  orderId: string;
};

export default function ResumeCheckoutButton({
  orderId,
}: ResumeCheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resumeCheckout() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = (await response.json()) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Unable to restart checkout.");
      }

      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to restart checkout."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={resumeCheckout}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Opening secure checkout…" : "Return to secure checkout"}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
