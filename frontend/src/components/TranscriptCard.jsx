import { Download, Share2, Ban, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import StatusBadge from "./StatusBadge.jsx";
import { truncate, formatDate, copyToClipboard } from "../lib/format.js";
import { transcriptsApi } from "../api/transcripts.js";

/**
 * Compact transcript summary card with quick actions.
 * @param {{
 *   transcript: object,
 *   showRevoke?: boolean,
 *   onRevoke?: (id: string) => void,
 *   onView?: (t: object) => void,
 * }} props
 */
export default function TranscriptCard({ transcript, showRevoke = false, onRevoke, onView }) {
  const { transcriptId, title, sha256Hash, isRevoked, issuedAt, qrCodeUrl, blockNumber } = transcript;

  const verifyUrl = `${window.location.origin}/verify/${transcriptId}`;

  const share = async () => {
    if (await copyToClipboard(verifyUrl)) toast.success("Verification link copied");
  };

  return (
    <div className="card flex flex-col gap-4 p-5 transition hover:shadow-soft animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt=""
              className="h-12 w-12 rounded-lg border border-slate-200 bg-white p-0.5"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-accent/10 text-brand-accent">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <div>
            <p className="font-semibold text-brand-navy">{title || "Academic Transcript"}</p>
            <p className="font-mono text-xs text-brand-muted">{truncate(transcriptId, 8, 6)}</p>
          </div>
        </div>
        <StatusBadge revoked={isRevoked} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-brand-muted">Issued</dt>
          <dd className="font-medium text-brand-navy">{formatDate(issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-brand-muted">Hash</dt>
          <dd className="font-mono text-xs font-medium text-brand-navy">{truncate(sha256Hash, 8, 6)}</dd>
        </div>
        {Number.isFinite(blockNumber) && (
          <div>
            <dt className="text-xs text-brand-muted">Block</dt>
            <dd className="font-medium text-brand-navy">#{blockNumber}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <a
          href={transcriptsApi.downloadUrl(transcriptId)}
          className="btn-outline text-xs"
          target="_blank"
          rel="noreferrer"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button type="button" onClick={share} className="btn-ghost text-xs">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <a href={verifyUrl} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Verify
        </a>
        {onView && (
          <button type="button" onClick={() => onView(transcript)} className="btn-ghost text-xs">
            Details
          </button>
        )}
        {showRevoke && !isRevoked && onRevoke && (
          <button
            type="button"
            onClick={() => onRevoke(transcriptId)}
            className="btn-ghost ml-auto text-xs text-brand-danger hover:bg-brand-danger/10"
          >
            <Ban className="h-3.5 w-3.5" /> Revoke
          </button>
        )}
      </div>
    </div>
  );
}
