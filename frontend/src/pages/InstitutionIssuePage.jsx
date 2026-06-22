import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, FilePlus2, CheckCircle2, ArrowLeft, Download } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../components/AppLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import FileDropzone from "../components/FileDropzone.jsx";
import StepProgress from "../components/StepProgress.jsx";
import QRPreview from "../components/QRPreview.jsx";
import BlockchainStatus from "../components/BlockchainStatus.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { institutionsApi } from "../api/institutions.js";
import { transcriptsApi } from "../api/transcripts.js";
import { apiError } from "../api/client.js";

const STEPS = ["Uploading to IPFS", "Recording on Blockchain", "Generating QR code"];

export default function InstitutionIssuePage() {
  const [institution, setInstitution] = useState(null);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("Academic Transcript");
  const [file, setFile] = useState(null);

  const [step, setStep] = useState(-1); // -1 idle, 0..2 active, 3 done
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { institution } = await institutionsApi.me();
        setInstitution(institution);
        const { students } = await institutionsApi.students(institution.institutionId);
        setStudents(students);
      } catch (e) {
        toast.error(apiError(e));
      }
    })();
  }, []);

  const reset = () => {
    setStep(-1);
    setResult(null);
    setError(false);
    setFile(null);
    setSelected(null);
    setTitle("Academic Transcript");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a student");
    if (!file) return toast.error("Attach a PDF");

    setSubmitting(true);
    setError(false);
    setStep(0);
    try {
      const data = await transcriptsApi.issue(
        { studentId: selected.studentId, title, file },
        (evt) => {
          // While bytes are uploading we're on step 0.
          if (evt.total && evt.loaded >= evt.total) setStep(1);
        }
      );
      setStep(2);
      await new Promise((r) => setTimeout(r, 400)); // brief beat for the QR step
      setStep(3);
      setResult(data);
      toast.success("Transcript issued & anchored");
    } catch (err) {
      setError(true);
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (institution && !institution.isApproved) {
    return (
      <AppLayout>
        <PageHeader title="Issue transcript" />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          Your institution must be <strong>approved by an admin</strong> before you
          can issue transcripts.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Issue transcript" subtitle="Anchor a transcript to the blockchain in one step.">
        <Link to="/dashboard" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </PageHeader>

      {result ? (
        <SuccessPanel result={result} student={selected} onAnother={reset} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <form onSubmit={onSubmit} className="card space-y-5 p-6 lg:col-span-2">
            <div>
              <span className="label">Student</span>
              <StudentSelect students={students} selected={selected} onSelect={setSelected} />
            </div>

            <div>
              <label className="label" htmlFor="title">Document title</label>
              <input
                id="title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Academic Transcript"
              />
            </div>

            <div>
              <span className="label">Transcript PDF</span>
              <FileDropzone file={file} onFile={setFile} disabled={submitting} />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <LoadingSpinner size={18} className="text-white" label="Issuing…" />
              ) : (
                <><FilePlus2 className="h-4 w-4" /> Issue transcript</>
              )}
            </button>
          </form>

          {/* Progress / hint panel */}
          <aside className="card p-6">
            <h3 className="font-heading text-base font-semibold text-brand-navy">
              {step >= 0 ? "Progress" : "What happens next"}
            </h3>
            <p className="mt-1 text-sm text-brand-muted">
              {step >= 0
                ? "Your document is being secured."
                : "We hash the PDF, store it on IPFS, and anchor its fingerprint on-chain."}
            </p>
            <div className="mt-5">
              <StepProgress
                steps={STEPS}
                current={step < 0 ? -1 : Math.min(step, STEPS.length)}
                error={error}
              />
            </div>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}

/** Success card with QR + on-chain proof + download. */
function SuccessPanel({ result, student, onAnother }) {
  const t = result.transcript;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 bg-brand-success/10 px-6 py-4">
          <CheckCircle2 className="h-6 w-6 text-brand-success" />
          <div>
            <p className="font-heading font-semibold text-brand-navy">Transcript issued</p>
            <p className="text-sm text-brand-muted">
              {student?.name ? `For ${student.name}` : "Successfully anchored on-chain"}
            </p>
          </div>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center">
            <QRPreview dataUrl={t.qrCodeUrl} caption="Printed on the PDF · Scan to verify" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-brand-muted">Verification link</p>
              <a
                href={result.verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm font-medium text-brand-accent hover:underline"
              >
                {result.verifyUrl}
              </a>
            </div>
            <BlockchainStatus
              txHash={t.transactionHash}
              blockNumber={t.blockNumber}
              sha256={t.sha256Hash}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={transcriptsApi.downloadUrl(t.transcriptId)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
              <button onClick={onAnother} className="btn-outline text-sm">
                Issue another
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lightweight searchable student dropdown. */
function StudentSelect({ students, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected ? "text-brand-navy" : "text-slate-400"}>
          {selected ? `${selected.name} · ${selected.email}` : "Select a student…"}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              className="input pl-9"
              placeholder="Search students…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-brand-muted">No students found.</li>
            ) : (
              filtered.map((s) => (
                <li key={s.studentId}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span>
                      <span className="font-medium text-brand-navy">{s.name}</span>
                      <span className="ml-2 text-xs text-brand-muted">{s.email}</span>
                    </span>
                    {selected?.studentId === s.studentId && (
                      <CheckCircle2 className="h-4 w-4 text-brand-accent" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
