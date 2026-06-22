import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, FileCheck2, Ban, FilePlus2, UserPlus, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import TranscriptCard from "../../components/TranscriptCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { PageSpinner } from "../../components/LoadingSpinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { institutionsApi } from "../../api/institutions.js";
import { transcriptsApi } from "../../api/transcripts.js";
import { apiError } from "../../api/client.js";
import { copyToClipboard } from "../../lib/format.js";

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [students, setStudents] = useState([]);
  const [transcripts, setTranscripts] = useState([]);

  const load = async () => {
    try {
      const me = await institutionsApi.me().catch(() => ({ institution: null }));
      const inst = me.institution;
      setInstitution(inst);
      const [studRes, txRes] = await Promise.all([
        inst ? institutionsApi.students(inst.institutionId).catch(() => ({ students: [] })) : { students: [] },
        transcriptsApi.list().catch(() => ({ transcripts: [] })),
      ]);
      setStudents(studRes.students || []);
      setTranscripts(txRes.transcripts || []);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRevoke = async (id) => {
    if (!confirm("Revoke this transcript? This cannot be undone.")) return;
    try {
      const { transcript } = await transcriptsApi.revoke(id);
      setTranscripts((list) => list.map((t) => (t.transcriptId === id ? transcript : t)));
      toast.success("Transcript revoked");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const copyCode = async () => {
    if (institution?.institutionCode && (await copyToClipboard(institution.institutionCode))) {
      toast.success("Institution code copied");
    }
  };

  if (loading) return <PageSpinner />;

  const issued = transcripts.length;
  const revoked = transcripts.filter((t) => t.isRevoked).length;

  return (
    <div>
      <PageHeader
        title="Institution dashboard"
        subtitle={institution?.name || user?.email}
      >
        <Link to="/institution/students" className="btn-outline">
          <UserPlus className="h-4 w-4" /> Register Student
        </Link>
        <Link to="/institution/issue" className="btn-primary">
          <FilePlus2 className="h-4 w-4" /> Issue Transcript
        </Link>
      </PageHeader>

      {institution && !institution.isApproved && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your institution is <strong>pending admin approval</strong>. You can
          explore the dashboard, but issuing transcripts unlocks once approved.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Students" value={students.length} />
        <StatCard
          icon={FileCheck2}
          label="Transcripts issued"
          value={issued}
          accent="text-brand-success bg-brand-success/10"
        />
        <StatCard
          icon={Ban}
          label="Revoked"
          value={revoked}
          accent="text-brand-danger bg-brand-danger/10"
        />
      </div>

      {institution?.institutionCode && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-brand-muted">Student join code</p>
              <p className="font-mono text-lg font-bold text-brand-navy">
                {institution.institutionCode}
              </p>
            </div>
          </div>
          <button onClick={copyCode} className="btn-ghost text-sm">Copy</button>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-heading text-lg font-semibold text-brand-navy">
        Recent transcripts
      </h2>
      {transcripts.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No transcripts issued yet"
          desc="Issue your first transcript to anchor it on the blockchain."
        >
          <Link to="/institution/issue" className="btn-primary">
            <FilePlus2 className="h-4 w-4" /> Issue Transcript
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {transcripts.slice(0, 6).map((t) => (
            <TranscriptCard key={t.transcriptId} transcript={t} showRevoke onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}
