"use client";

import { useState, useEffect } from "react";

type DeliveryArtworkFile = {
  path?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  signedUrl?: string | null;
};

type DeliveryArtworkGridProps = {
  files: DeliveryArtworkFile[];
};

function labelFromFile(file: DeliveryArtworkFile) {
  return file.fileName || file.path || "Artwork preview";
}

export default function DeliveryArtworkGrid({ files }: DeliveryArtworkGridProps) {
  const [previewFile, setPreviewFile] = useState<DeliveryArtworkFile | null>(
    null
  );
  useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setPreviewFile(null);
    }
  }

  if (previewFile) {
    window.addEventListener("keydown", handleKeyDown);
  }

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [previewFile]);

  return (
    <>
      <div>
        <h2 className="mb-3 text-sm font-medium text-white">
          Artwork previews
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.path || file.fileName || "artwork-file"}
              type="button"
              onClick={() => setPreviewFile(file)}
              className="rounded-xl border border-white/10 bg-slate-900/70 p-2 text-left transition hover:bg-slate-800/80"
            >
              {file.signedUrl ? (
                <img
                  src={file.signedUrl}
                  alt={labelFromFile(file)}
                  className="h-24 w-full rounded-md object-cover transition duration-200 hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-md bg-slate-800 text-xs text-slate-400">
                  Preview unavailable
                </div>
              )}

              <p className="mt-2 truncate text-xs text-white">
                {labelFromFile(file)}
              </p>

              <span className="mt-1 block text-[11px] text-emerald-300">
                Click to preview
              </span>
            </button>
          ))}
        </div>
      </div>

      {previewFile?.signedUrl && (
        <div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
  onClick={() => setPreviewFile(null)}
>
          <div
  className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
  onClick={(e) => e.stopPropagation()}
>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-medium text-white">
                {labelFromFile(previewFile)}
              </p>

              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-lg px-3 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex max-h-[75vh] items-center justify-center overflow-auto p-4">
              <img
                src={previewFile.signedUrl}
                alt={labelFromFile(previewFile)}
                className="max-h-[72vh] max-w-full rounded-xl object-contain"
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <p className="text-xs text-slate-500">
                Download links refresh automatically if they expire.
              </p>

              <a
                href={previewFile.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-950 hover:bg-slate-200"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}