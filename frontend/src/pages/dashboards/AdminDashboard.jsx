import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, FileCheck2, CheckCircle2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { PageSpinner } from "../../components/LoadingSpinner.jsx";
import { institutionsApi } from "../../api/institutions.js";
import { transcriptsApi } from "../../api/transcripts.js";
import { apiError } from "../../api/client.js";
import { truncate, formatDateTime } from "../../lib/format.js";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState([]);
  const [transcripts, setTranscripts] = useState([]);

  const load = async () => {
    try {
      const [inst, usr, tx] = await Promise.all([
        institutionsApi.list().catch(() => ({ institutions: [] })),
        institutionsApi.allUsers().catch(() => ({ users: [] })),
        transcriptsApi.list().catch(() => ({ transcripts: [] })),
      ]);
      setInstitutions(inst.institutions || []);
      setUsers(usr.users || []);
      setTranscripts(tx.transcripts || []);
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

  const approve = async (id) => {
    try {
      const { institution } = await institutionsApi.approve(id);
      setInstitutions((list) => list.map((i) => (i.institutionId === id ? institution : i)));
      toast.success("Institution approved & registered on-chain");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (loading) return <PageSpinner />;

  const pending = institutions.filter((i) => !i.isApproved);
  const txLog = transcripts.filter((t) => t.transactionHash).slice(0, 8);

  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Platform overview & approvals">
        <Link to="/admin/institutions" className="btn-primary">
          <Building2 className="h-4 w-4" /> Manage institutions
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Institutions" value={institutions.length} />
        <StatCard
          icon={CheckCircle2}
          label="Pending approval"
          value={pending.length}
          accent="text-brand-gold bg-brand-gold/10"
        />
        <StatCard icon={Users} label="Users" value={users.length} accent="text-brand-blue bg-brand-blue/10" />
        <StatCard
          icon={FileCheck2}
          label="Transcripts"
          value={transcripts.length}
          accent="text-brand-success bg-brand-success/10"
        />
      </div>

      {/* Pending approvals */}
      <h2 className="mb-3 mt-8 font-heading text-lg font-semibold text-brand-navy">
        Pending approvals
      </h2>
      {pending.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All caught up" desc="No institutions awaiting approval." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {pending.map((i) => (
            <div key={i.institutionId} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-brand-navy">{i.name}</p>
                <p className="text-xs text-brand-muted">
                  {i.email} · code <span className="font-mono">{i.institutionCode}</span>
                </p>
              </div>
              <button onClick={() => approve(i.institutionId)} className="btn-primary text-sm">
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Transaction log */}
      <h2 className="mb-3 mt-8 font-heading text-lg font-semibold text-brand-navy">
        Recent on-chain activity
      </h2>
      {txLog.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No transactions yet" desc="On-chain transcript activity will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Transcript</th>
                <th className="px-4 py-3 font-medium">Tx hash</th>
                <th className="px-4 py-3 font-medium">Block</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txLog.map((t) => (
                <tr key={t.transcriptId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{truncate(t.transcriptId, 8, 4)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-accent">
                    {truncate(t.transactionHash, 10, 6)}
                  </td>
                  <td className="px-4 py-3">#{t.blockNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-muted">{formatDateTime(t.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
