import { CheckCircle2, Ban } from "lucide-react";

/** Issued / Revoked status chip for a transcript. */
export default function StatusBadge({ revoked }) {
  return revoked ? (
    <span className="badge bg-brand-danger/10 text-brand-danger">
      <Ban className="h-3.5 w-3.5" /> Revoked
    </span>
  ) : (
    <span className="badge bg-brand-success/10 text-brand-success">
      <CheckCircle2 className="h-3.5 w-3.5" /> Issued
    </span>
  );
}
