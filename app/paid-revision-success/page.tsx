export default function PaidRevisionSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Payment successful
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          Your paid revision has been approved
        </h1>

        <p className="mt-4 text-slate-300">
          Thanks — your payment was received. We’ll begin the revision work and
          email you once the updated files are ready.
        </p>
      </div>
    </main>
  );
}