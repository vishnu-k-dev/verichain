import { useEffect, useState } from "react";
import { UserPlus, Users, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../components/AppLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusDot from "../components/StatusDot.jsx";
import LoadingSpinner, { PageSpinner } from "../components/LoadingSpinner.jsx";
import { institutionsApi } from "../api/institutions.js";
import { studentsApi } from "../api/students.js";
import { apiError } from "../api/client.js";
import { formatDate } from "../lib/format.js";

export default function InstitutionStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { institution } = await institutionsApi.me();
      setInstitution(institution);
      const { students } = await institutionsApi.students(institution.institutionId);
      setStudents(students);
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { student } = await studentsApi.register({
        name: form.name,
        email: form.email,
        password: form.password || undefined,
      });
      setStudents((s) => [student, ...s]);
      setForm({ name: "", email: "", password: "" });
      toast.success("Student registered on-chain");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout><PageSpinner /></AppLayout>;

  const approved = institution?.isApproved;

  return (
    <AppLayout>
      <PageHeader title="Students" subtitle={institution?.name} />

      {!approved && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your institution is pending approval — students can be added once approved.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Register form */}
        <form onSubmit={onSubmit} className="card h-fit space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-brand-navy">
            <UserPlus className="h-5 w-5 text-brand-accent" /> Register student
          </h2>
          <Field icon={User} label="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ada Lovelace" />
          <Field icon={Mail} type="email" label="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="ada@school.edu" />
          <div>
            <label className="label">Initial password <span className="font-normal text-brand-muted">(optional)</span></label>
            <input
              type="text"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Lets them log in to see transcripts"
              minLength={8}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving || !approved}>
            {saving ? <LoadingSpinner size={18} className="text-white" /> : (<><UserPlus className="h-4 w-4" /> Register</>)}
          </button>
        </form>

        {/* List */}
        <div className="lg:col-span-2">
          {students.length === 0 ? (
            <EmptyState icon={Users} title="No students yet" desc="Register your first student to start issuing transcripts." />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">On-chain</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-brand-navy">{s.name}</td>
                      <td className="px-4 py-3 text-brand-muted">{s.email}</td>
                      <td className="px-4 py-3"><StatusDot ok={s.onChain} okText="Yes" badText="Off-chain" /></td>
                      <td className="px-4 py-3 text-brand-muted">{formatDate(s.createdAt)}</td>
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

function Field({ icon: Icon, label, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input className="input pl-9" {...rest} />
      </div>
    </div>
  );
}
