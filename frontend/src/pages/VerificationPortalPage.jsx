import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, UploadCloud, FileText, ExternalLink, Calendar, Building2, User, RefreshCw } from "lucide-react";
import PublicLayout from "../components/PublicLayout.jsx";
import VerificationBadge from "../components/VerificationBadge.jsx";
import BlockchainStatus from "../components/BlockchainStatus.jsx";
import FileDropzone from "../components/FileDropzone.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { verifyApi } from "../api/verify.js";
import { apiError } from "../api/client.js";
import { sha256File } from "../lib/clientHash.js";
import { formatDate, truncate } from "../lib/format.js";

export default function VerificationPortalPage() {
  const { transcriptId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("id"); // id | upload
  const [idInput, setIdInput] = useState(transcriptId || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto-verify when arriving at /verify/:transcriptId
  useEffect(() => {
    if (transcriptId) {
      setIdInput(transcriptId);
      runById(transcriptId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptId]);

  const runById = async (id) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await verifyApi.byId(id);
      setResult(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitId = (e) => {
    e.preventDefault();
    if (!idInput.trim()) return;
    navigate(`/verify/${idInput.trim()}`);
    runById(idInput.trim());
  };

  const onVerifyUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const computedHash = await sha256File(file); // client-side fingerprint
      const data = await verifyApi.byUpload(file);
      setResult({ computedHash, ...data });
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-brand-navy">
            Verify a transcript
          </h1>
          <p className="mx-auto mt-2 max-w-md text-brand-muted">
            Confirm a credential is authentic and unaltered — checked directly
            against the blockchain. No account required.
          </p>
        </div>

        {/* Tabs */}
        <div className="mx-auto mt-8 flex w-fit rounded-xl border border-slate-200 bg-white p-1">
          <TabBtn active={tab === "id"} onClick={() => setTab("id")} icon={Search}>By ID</TabBtn>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={UploadCloud}>Upload PDF</TabBtn>
        </div>

        <div className="mt-6">
          {tab === "id" ? (
            <form onSubmit={onSubmitId} className="card flex flex-col gap-3 p-4 sm:flex-row">
              <input
                className="input"
                placeholder="Enter transcript ID…"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
              />
              <button type="submit" className="btn-primary shrink-0" disabled={loading || !idInput.trim()}>
                <Search className="h-4 w-4" /> Verify
              </button>
            </form>
          ) : (
            <div className="card space-y-4 p-5">
              <FileDropzone file={file} onFile={setFile} disabled={loading} />
              <button onClick={onVerifyUpload} className="btn-primary w-full" disabled={loading || !file}>
                <UploadCloud className="h-4 w-4" /> Verify document
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="mt-8">
          {loading && (
            <div className="card flex flex-col items-center gap-3 p-10">
              <LoadingSpinner size={28} />
              <p className="text-sm font-medium text-brand-muted">Checking blockchain…</p>
            </div>
          )}

          {!loading && error && (
            <div className="card p-6 text-center text-sm text-brand-danger">{error}</div>
          )}

          {!loading && result && <ResultPanel result={result} onRecheck={() => runById(result.transcriptId || idInput)} />}
        </div>
      </div>
    </PublicLayout>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        active ? "bg-brand-navy text-white" : "text-brand-muted hover:text-brand-navy",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function ResultPanel({ result, onRecheck }) {
  const status = result.status || (result.isValid ? "VALID" : "INVALID");
  const found = status !== "NOT_FOUND";

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 px-6 py-8">
        <VerificationBadge status={status} />
      </div>

      {found && (
        <div className="space-y-5 p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail icon={User} label="Student" value={result.studentName} />
            <Detail icon={Building2} label="Institution" value={result.institutionName} />
            <Detail icon={Calendar} label="Issued" value={formatDate(result.issuedAt)} />
            <Detail icon={FileText} label="Transcript ID" value={truncate(result.transcriptId, 8, 6)} mono />
          </dl>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">
              On-chain proof
            </p>
            <BlockchainStatus
              txHash={result.transactionHash}
              blockNumber={result.blockNumber}
              sha256={result.sha256Hash}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {result.transcriptId && (
              <a
                href={verifyApi.documentUrl(result.transcriptId)}
                target="_blank"
                rel="noreferrer"
                className="btn-outline text-sm"
              >
                <ExternalLink className="h-4 w-4" /> View document
              </a>
            )}
            <button onClick={onRecheck} className="btn-ghost text-sm">
              <RefreshCw className="h-4 w-4" /> Re-check
            </button>
          </div>

          {result.computedHash && (
            <p className="rounded-lg bg-slate-50 p-3 font-mono text-xs text-brand-muted">
              Your file&apos;s fingerprint: {truncate(result.computedHash, 12, 10)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-brand-muted">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <dt className="text-xs text-brand-muted">{label}</dt>
        <dd className={`font-medium text-brand-navy ${mono ? "font-mono text-sm" : ""}`}>{value || "—"}</dd>
      </div>
    </div>
  );
}
