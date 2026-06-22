import { Link2, Boxes, Hash } from "lucide-react";
import { truncate, copyToClipboard } from "../lib/format.js";
import toast from "react-hot-toast";

/**
 * Shows on-chain anchoring metadata: tx hash, block number, network.
 * @param {{ txHash?: string, blockNumber?: number, network?: string, sha256?: string }} props
 */
export default function BlockchainStatus({ txHash, blockNumber, network = "Ethereum", sha256 }) {
  if (!txHash && !sha256) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-brand-muted">
        Not yet anchored on-chain.
      </div>
    );
  }

  const copy = async (label, value) => {
    if (await copyToClipboard(value)) toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-2.5">
      {txHash && (
        <Row
          icon={Link2}
          label="Transaction"
          value={truncate(txHash, 10, 8)}
          onClick={() => copy("Transaction hash", txHash)}
        />
      )}
      {Number.isFinite(blockNumber) && (
        <Row icon={Boxes} label="Block" value={`#${blockNumber}`} />
      )}
      {sha256 && (
        <Row
          icon={Hash}
          label="SHA-256"
          value={truncate(sha256, 10, 8)}
          onClick={() => copy("SHA-256 hash", sha256)}
        />
      )}
      <div className="flex items-center gap-2 pt-1 text-xs text-brand-muted">
        <span className="h-2 w-2 rounded-full bg-brand-success" />
        Secured on {network}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-medium text-brand-muted">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="font-mono text-xs text-brand-navy enabled:hover:text-brand-accent enabled:hover:underline"
        title={onClick ? "Click to copy" : undefined}
      >
        {value}
      </button>
    </div>
  );
}
