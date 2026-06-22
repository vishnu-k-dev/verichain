import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Building2, KeyRound, Search, GraduationCap, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError } from "../api/client.js";

const ROLE_OPTIONS = [
  { value: "verifier", label: "Verifier", icon: Search, hint: "Employer / checker" },
  { value: "student", label: "Student", icon: GraduationCap, hint: "Own my transcripts" },
  { value: "institution", label: "Institution", icon: Building2, hint: "Issue transcripts" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("verifier");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    institutionCode: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password, role };
      if (role === "student") {
        payload.institutionCode = form.institutionCode;
        payload.name = form.name;
      }
      if (role === "institution") {
        payload.name = form.name;
        payload.institutionCode = form.institutionCode;
      }
      await register(payload);
      toast.success("Account created!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const needsName = role === "student" || role === "institution";
  const needsCode = role === "student" || role === "institution";

  return (
    <AuthLayout title="Create your account" subtitle="Join VeriChain in under a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Role selector */}
        <div>
          <span className="label">I am a…</span>
          <div className="grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  className={[
                    "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition",
                    active
                      ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/40"
                      : "border-slate-200 hover:border-slate-300",
                  ].join(" ")}
                >
                  <opt.icon className={`h-5 w-5 ${active ? "text-brand-accent" : "text-brand-muted"}`} />
                  <span className="text-xs font-semibold text-brand-navy">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {needsName && (
          <Field
            icon={role === "institution" ? Building2 : User}
            id="name"
            label={role === "institution" ? "Institution name" : "Full name"}
            placeholder={role === "institution" ? "Alpha University" : "Ada Lovelace"}
            value={form.name}
            onChange={set("name")}
            required
          />
        )}

        <Field icon={Mail} id="email" type="email" label="Email" placeholder="you@example.com"
          value={form.email} onChange={set("email")} required autoComplete="email" />

        <Field icon={Lock} id="password" type="password" label="Password"
          placeholder="At least 8 characters" value={form.password} onChange={set("password")}
          required minLength={8} autoComplete="new-password" />

        {needsCode && (
          <Field
            icon={KeyRound}
            id="institutionCode"
            label={role === "institution" ? "Choose an institution code" : "Institution code"}
            placeholder="ALPHA-UNI"
            value={form.institutionCode}
            onChange={set("institutionCode")}
            required
            hint={
              role === "institution"
                ? "Students will use this code to join. Your account needs admin approval before issuing."
                : "Provided by your institution."
            }
          />
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <LoadingSpinner size={18} className="text-white" /> : (
            <>Create account <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function Field({ icon: Icon, id, label, hint, ...rest }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input id={id} className="input pl-9" {...rest} />
      </div>
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}
