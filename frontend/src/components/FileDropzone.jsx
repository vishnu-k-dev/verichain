import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { formatBytes } from "../lib/format.js";

/**
 * Drag-and-drop PDF dropzone.
 * @param {{ file: File|null, onFile: (f: File|null) => void, accept?: string, maxBytes?: number, disabled?: boolean }} props
 */
export default function FileDropzone({
  file,
  onFile,
  accept = "application/pdf",
  maxBytes = 10 * 1024 * 1024,
  disabled = false,
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validate = useCallback(
    (f) => {
      if (!f) return;
      if (accept && f.type !== accept) {
        setError("Only PDF files are allowed.");
        return;
      }
      if (f.size > maxBytes) {
        setError(`File exceeds ${formatBytes(maxBytes)} limit.`);
        return;
      }
      setError(null);
      onFile(f);
    },
    [accept, maxBytes, onFile]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    validate(e.dataTransfer.files?.[0]);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card animate-fade-in">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-accent/10 text-brand-accent">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-navy">{file.name}</p>
            <p className="text-xs text-brand-muted">{formatBytes(file.size)} · PDF</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onFile(null);
            setError(null);
          }}
          disabled={disabled}
          className="rounded-full p-1.5 text-brand-muted transition hover:bg-slate-100 hover:text-brand-danger"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          !disabled && setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={disabled}
        className={[
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition",
          dragging
            ? "border-brand-accent bg-brand-accent/5"
            : "border-slate-300 bg-slate-50 hover:border-brand-accent hover:bg-brand-accent/5",
          disabled && "cursor-not-allowed opacity-60",
        ].join(" ")}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-accent shadow-card">
          <UploadCloud className="h-6 w-6" />
        </span>
        <span className="text-sm font-semibold text-brand-navy">
          Drag &amp; drop a PDF, or <span className="text-brand-accent">browse</span>
        </span>
        <span className="text-xs text-brand-muted">PDF up to {formatBytes(maxBytes)}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => validate(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
    </div>
  );
}
