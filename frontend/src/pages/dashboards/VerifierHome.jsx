import { Link } from "react-router-dom";
import { ShieldCheck, ScanLine, UploadCloud } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function VerifierHome() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Verify transcripts" subtitle={user?.email} />
      <div className="grid gap-4 md:grid-cols-3">
        <Action
          to="/verify"
          icon={ShieldCheck}
          title="Verify by ID"
          desc="Enter a transcript ID to check authenticity against the blockchain."
        />
        <Action
          to="/verify"
          icon={UploadCloud}
          title="Verify a PDF"
          desc="Upload a transcript PDF and we'll match its fingerprint on-chain."
        />
        <Action
          to="/scan"
          icon={ScanLine}
          title="Scan a QR code"
          desc="Use your camera to scan the QR printed on a transcript."
        />
      </div>
    </div>
  );
}

function Action({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="card group p-6 transition hover:shadow-soft">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent transition group-hover:bg-brand-accent group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-1 text-sm text-brand-muted">{desc}</p>
    </Link>
  );
}
