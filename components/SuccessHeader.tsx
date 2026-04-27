export default function SuccessHeader() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300">
        ✓
      </div>

      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="FrameReady logo"
          className="h-7 w-auto opacity-95"
        />
        <span className="text-base font-semibold tracking-tight text-white">
          FrameReady
        </span>
      </div>
    </div>
  );
}