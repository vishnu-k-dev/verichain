import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, FileSignature, ListChecks, Upload, Link2, Copy, Check,
  CircleCheck, CircleSlash, CircleHelp, Loader2, Ban, RefreshCw,
} from "lucide-react";
import { api } from "./api.js";
import { sha256File, shorten, formatDate, copy } from "./lib.js";

const TABS = [
  { id: "issue", label: "Issue", icon: FileSignature },
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "records", label: "Records", icon: ListChecks },
];

export default function App() {
  const [tab, setTab] = useState("issue");
  const [health, setHealth] = useState(null);
  const [records, setRecords] = useState([]);
  const [prefillId, setPrefillId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { transcripts } = await api.list();
      setRecords(transcripts);
    } catch {
      /* server may not be up yet */
    }
  }, []);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ connected: false }));
    refresh();
    // Deep link from a QR code: ?verify=VC-XXXX
    const id = new URLSearchParams(window.location.search).get("verify");
    if (id) {
      setPrefillId(id);
      setTab("verify");
    }
  }, [refresh]);

  return (
    <div className="min-h-screen">
      <Header health={health} />

      <main className="mx-auto max-w-2xl px-5 pb-24">
        <Hero />

        <nav className="mb-6 flex gap-1 rounded-xl border border-line bg-white p-1 shadow-soft">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn flex-1 ${tab === t.id ? "bg-ink text-paper" : "text-muted hover:bg-black/[.04] hover:text-ink"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "issue" && <IssueView onIssued={refresh} />}
        {tab === "verify" && <VerifyView prefillId={prefillId} />}
        {tab === "records" && (
          <RecordsView
            records={records}
            onRefresh={refresh}
            onVerify={(id) => { setPrefillId(id); setTab("verify"); }}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------- chrome -------------------------------- */

function Header({ health }) {
  const connected = health?.connected;
  return (
    <header className="border-b border-line/80">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-paper">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="font-serif text-xl font-600">Ledgr</span>
        </div>
        <span
          className={`pill border ${
            connected
              ? "border-valid/20 bg-valid/5 text-valid"
              : "border-line bg-black/[.03] text-muted"
          }`}
          title={health?.contract ? `Contract ${health.contract}` : ""}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-valid" : "bg-muted"}`} />
          {connected ? `On-chain · ${shorten(health.contract, 6, 4)}` : "Offline"}
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="py-10 text-center">
      <h1 className="font-serif text-[34px] leading-tight text-ink sm:text-[40px]">
        Transcripts you can trust.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
        Issue academic transcripts to the blockchain and verify any of them in
        seconds — tamper-proof, no central authority to trust.
      </p>
    </div>
  );
}

/* ------------------------------- issue --------------------------------- */

const EMPTY = { studentName: "", rollNo: "", course: "", grade: "" };

function IssueView({ onIssued }) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fileHash = file ? await sha256File(file) : undefined;
      const data = await api.issue({ ...form, fileHash });
      setResult(data);
      setForm(EMPTY);
      setFile(null);
      onIssued();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) return <IssueSuccess data={result} onAgain={() => setResult(null)} />;

  return (
    <form onSubmit={submit} className="card animate-rise space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Student name" value={form.studentName} onChange={set("studentName")} placeholder="Ada Lovelace" required />
        <Field label="Roll number" value={form.rollNo} onChange={set("rollNo")} placeholder="CS-2021-014" required />
        <Field label="Course / Programme" value={form.course} onChange={set("course")} placeholder="B.Sc. Computer Science" required />
        <Field label="Grade / CGPA" value={form.grade} onChange={set("grade")} placeholder="First Class (8.7)" required />
      </div>

      <div>
        <span className="lbl">Transcript PDF <span className="text-muted/60">(optional — enables file verification)</span></span>
        <FilePicker file={file} onFile={setFile} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setForm(SAMPLE)} className="btn-ghost text-xs">
          Fill sample data
        </button>
        <button type="submit" className="btn-solid" disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing to chain…</> : <><FileSignature className="h-4 w-4" /> Issue transcript</>}
        </button>
      </div>
    </form>
  );
}

const SAMPLE = {
  studentName: "Ada Lovelace",
  rollNo: "CS-2021-014",
  course: "B.Sc. Computer Science",
  grade: "First Class (8.7)",
};

function IssueSuccess({ data, onAgain }) {
  const t = data.transcript;
  return (
    <div className="card animate-rise overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-valid/5 px-6 py-4">
        <CircleCheck className="h-5 w-5 text-valid" />
        <div>
          <p className="font-medium">Issued on-chain</p>
          <p className="text-sm text-muted">Certificate <span className="font-mono text-ink">{t.id}</span></p>
        </div>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <DetailGrid t={t} />
          <Proof txHash={data.txHash} blockNumber={data.blockNumber} fileHash={t.fileHash} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <img src={data.qr} alt="Verification QR" className="h-36 w-36 rounded-xl border border-line" />
          <span className="text-xs text-muted">Scan to verify</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-6 py-4">
        <CopyButton text={`${window.location.origin}/?verify=${t.id}`} label="Copy verify link" />
        <button onClick={onAgain} className="btn-outline text-sm">Issue another</button>
      </div>
    </div>
  );
}

/* ------------------------------- verify -------------------------------- */

function VerifyView({ prefillId }) {
  const [mode, setMode] = useState("id");
  const [id, setId] = useState(prefillId || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = useCallback(async (payload) => {
    setBusy(true); setError(""); setResult(null);
    try {
      setResult(await api.verify(payload));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Auto-verify when arriving from a QR deep link.
  useEffect(() => {
    if (prefillId) { setId(prefillId); run({ id: prefillId }); }
  }, [prefillId, run]);

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "id") {
      if (id.trim()) run({ id: id.trim() });
    } else if (file) {
      run({ fileHash: await sha256File(file) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="card animate-rise p-6">
        <div className="mb-4 flex gap-1 rounded-lg border border-line bg-paper p-1">
          <SegBtn active={mode === "id"} onClick={() => setMode("id")}>By certificate ID</SegBtn>
          <SegBtn active={mode === "file"} onClick={() => setMode("file")}>By PDF file</SegBtn>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "id" ? (
            <Field label="Certificate ID" value={id} onChange={(e) => setId(e.target.value)} placeholder="VC-7F3A21" />
          ) : (
            <div>
              <span className="lbl">Transcript PDF</span>
              <FilePicker file={file} onFile={setFile} />
            </div>
          )}
          <button type="submit" className="btn-solid w-full" disabled={busy || (mode === "id" ? !id.trim() : !file)}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking the chain…</> : <><ShieldCheck className="h-4 w-4" /> Verify</>}
          </button>
        </form>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {result && <VerifyResult result={result} />}
    </div>
  );
}

const RESULT_META = {
  VALID: { icon: CircleCheck, tone: "text-valid", ring: "ring-valid/15", bg: "bg-valid/5", title: "Authentic", note: "This transcript is recorded on-chain and unaltered." },
  REVOKED: { icon: CircleSlash, tone: "text-revoked", ring: "ring-revoked/15", bg: "bg-revoked/5", title: "Revoked", note: "The issuing institution has revoked this transcript." },
  NOT_FOUND: { icon: CircleHelp, tone: "text-muted", ring: "ring-line", bg: "bg-black/[.02]", title: "No record", note: "Nothing on-chain matches this — it may be forged." },
};

function VerifyResult({ result }) {
  const meta = RESULT_META[result.status] || RESULT_META.NOT_FOUND;
  const Icon = meta.icon;
  const t = result.transcript;
  return (
    <div className="card animate-rise overflow-hidden">
      <div className={`flex items-center gap-4 px-6 py-6 ${meta.bg}`}>
        <span className={`grid h-14 w-14 place-items-center rounded-full bg-white ring-8 ${meta.ring}`}>
          <Icon className={`h-7 w-7 ${meta.tone}`} />
        </span>
        <div>
          <h3 className={`font-serif text-2xl ${meta.tone}`}>{meta.title}</h3>
          <p className="text-sm text-muted">{meta.note}</p>
        </div>
      </div>
      {t && (
        <div className="space-y-4 border-t border-line p-6">
          <DetailGrid t={t} />
          <Proof fileHash={t.fileHash} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------ records -------------------------------- */

function RecordsView({ records, onRefresh, onVerify }) {
  const [busyId, setBusyId] = useState(null);

  const revoke = async (id) => {
    if (!confirm(`Revoke ${id}? This is permanent.`)) return;
    setBusyId(id);
    try {
      await api.revoke(id);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card animate-rise overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="text-sm font-medium">Issued transcripts <span className="text-muted">({records.length})</span></p>
        <button onClick={onRefresh} className="btn-ghost text-xs"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      {records.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-muted">
          No transcripts issued yet. Head to <span className="text-ink">Issue</span> to create one.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {records.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.studentName}</p>
                <p className="truncate text-xs text-muted">
                  <span className="font-mono text-ink">{t.id}</span> · {t.course}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge revoked={t.revoked} />
                <button onClick={() => onVerify(t.id)} className="btn-ghost text-xs">Verify</button>
                {!t.revoked && (
                  <button onClick={() => revoke(t.id)} className="btn-ghost text-xs text-revoked hover:bg-revoked/10" disabled={busyId === t.id}>
                    {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------- shared bits ------------------------------ */

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <input className="field" {...props} />
    </label>
  );
}

function SegBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilePicker({ file, onFile }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-paper px-4 py-3.5 transition hover:border-ink/40">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-muted"><Upload className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 text-sm">
        {file ? <span className="truncate font-medium text-ink">{file.name}</span> : <span className="text-muted">Choose a PDF…</span>}
      </span>
      {file && <span className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</span>}
      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </label>
  );
}

function DetailGrid({ t }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <Detail label="Student" value={t.studentName} />
      <Detail label="Roll no." value={t.rollNo} />
      <Detail label="Course" value={t.course} />
      <Detail label="Grade" value={t.grade} />
      <Detail label="Certificate" value={t.id} mono />
      <Detail label="Issued" value={formatDate(t.issuedAt)} />
    </dl>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-[13px]" : "font-medium"}`}>{value || "—"}</dd>
    </div>
  );
}

function Proof({ txHash, blockNumber, fileHash }) {
  if (!txHash && !fileHash) return null;
  return (
    <div className="space-y-1.5 rounded-lg bg-paper p-3.5 text-xs">
      {txHash && <ProofRow icon={Link2} label="Transaction" value={shorten(txHash, 10, 8)} copyText={txHash} />}
      {Number.isFinite(blockNumber) && <ProofRow label="Block" value={`#${blockNumber}`} />}
      {fileHash && <ProofRow label="File SHA-256" value={shorten(fileHash, 10, 8)} copyText={fileHash} />}
    </div>
  );
}

function ProofRow({ icon: Icon, label, value, copyText }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => { if (await copy(copyText)) { setDone(true); setTimeout(() => setDone(false), 1200); } };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</span>
      <button
        type="button"
        onClick={copyText ? onCopy : undefined}
        className={`font-mono text-ink ${copyText ? "hover:text-accent" : "cursor-default"}`}
      >
        {done ? "copied ✓" : value}
      </button>
    </div>
  );
}

function StatusBadge({ revoked }) {
  return revoked ? (
    <span className="pill bg-revoked/10 text-revoked"><CircleSlash className="h-3.5 w-3.5" /> Revoked</span>
  ) : (
    <span className="pill bg-valid/10 text-valid"><CircleCheck className="h-3.5 w-3.5" /> Valid</span>
  );
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { if (await copy(text)) { setDone(true); setTimeout(() => setDone(false), 1400); } }}
      className="btn-outline text-sm"
    >
      {done ? <><Check className="h-4 w-4 text-valid" /> Copied</> : <><Copy className="h-4 w-4" /> {label}</>}
    </button>
  );
}

function Notice({ tone, children }) {
  const tones = { error: "border-revoked/20 bg-revoked/5 text-revoked" };
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${tones[tone]}`}>{children}</div>;
}
