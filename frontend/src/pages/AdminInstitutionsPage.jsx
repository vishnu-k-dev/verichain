import { useEffect, useState } from "react";
import { Building2, Plus, CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../components/AppLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusDot from "../components/StatusDot.jsx";
import LoadingSpinner, { PageSpinner } from "../components/LoadingSpinner.jsx";
import { institutionsApi } from "../api/institutions.js";
import { apiError } from "../api/client.js";
import { truncate, formatDate } from "../lib/format.js";

export default function AdminInstitutionsPage() {
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", institutionCode: "", approve: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { institutions } = await institutionsApi.list();
      setInstitutions(institutions);
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

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { institution } = await institutionsApi.create(form);
      setInstitutions((l) => [institution, ...l]);
      setForm({ name: "", email: "", institutionCode: "", approve: true });
      toast.success("Institution created");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id) => {
    try {
      const { institution } = await institutionsApi.approve(id);
      setInstitutions((l) => l.map((i) => (i.institutionId === id ? institution : i)));
      toast.success("Approved & registered on-chain");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (loading) return <AppLayout><PageSpinner /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Institutions" subtitle="Create and approve issuing institutions." />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={onCreate} className="card h-fit space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-brand-navy">
            <Plus className="h-5 w-5 text-brand-accent" /> New institution
          </h2>
          <div>
            <label className="label">Name</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input className="input pl-9" required placeholder="Alpha University"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Contact email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input type="email" className="input pl-9" required placeholder="registrar@alpha.edu"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Institution code</label>
            <input className="input font-mono uppercase" required placeholder="ALPHA-UNI"
              value={form.institutionCode}
              onChange={(e) => setForm({ ...form, institutionCode: e.target.value.toUpperCase() })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input type="checkbox" checked={form.approve}
              onChange={(e) => setForm({ ...form, approve: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-accent" />
            Approve & register on-chain immediately
          </label>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? <LoadingSpinner size={18} className="text-white" /> : (<><Plus className="h-4 w-4" /> Create</>)}
          </button>
        </form>

        <div className="lg:col-span-2">
          {institutions.length === 0 ? (
            <EmptyState icon={Building2} title="No institutions" desc="Create the first issuing institution." />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Institution</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Wallet</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {institutions.map((i) => (
                    <tr key={i.institutionId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-navy">{i.name}</p>
                        <p className="text-xs text-brand-muted">{i.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{i.institutionCode}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-muted">
                        {i.walletAddress ? truncate(i.walletAddress, 6, 4) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusDot ok={i.isApproved} okText={i.onChain ? "On-chain" : "Approved"} badText="Pending" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!i.isApproved && (
                          <button onClick={() => approve(i.institutionId)} className="btn-primary text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
