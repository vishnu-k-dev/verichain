import { Download } from "lucide-react";

/**
 * Renders a QR code from a data URL with an optional download button.
 * @param {{ dataUrl: string, caption?: string, filename?: string, size?: number }} props
 */
export default function QRPreview({ dataUrl, caption = "Scan to verify", filename = "transcript-qr.png", size = 160 }) {
  if (!dataUrl) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <img
          src={dataUrl}
          alt="Verification QR code"
          width={size}
          height={size}
          className="rounded-lg"
        />
      </div>
      <p className="text-xs font-medium text-brand-muted">{caption}</p>
      <a href={dataUrl} download={filename} className="btn-ghost text-xs">
        <Download className="h-3.5 w-3.5" /> Download QR
      </a>
    </div>
  );
}
