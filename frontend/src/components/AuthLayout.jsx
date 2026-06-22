import { Link } from "react-router-dom";
import { ShieldCheck, Boxes, FileCheck2 } from "lucide-react";
import Logo from "./Logo.jsx";

/**
 * Centered auth card with a brand panel on the left (hidden on mobile).
 * @param {{ title: string, subtitle?: string, children: React.ReactNode }} props
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/30 blur-3xl" />
        <Logo size="lg" />
        <div className="relative z-10 max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Trust, verified on-chain.
          </h1>
          <p className="mt-4 text-slate-300">
            Issue tamper-proof academic transcripts and let anyone verify their
            authenticity in seconds — no middlemen, no forgeries.
          </p>
          <ul className="mt-8 space-y-4">
            <Feature icon={ShieldCheck} title="Cryptographically secured" desc="SHA-256 fingerprints anchored to Ethereum." />
            <Feature icon={Boxes} title="Immutable records" desc="Issued once, verifiable forever." />
            <Feature icon={FileCheck2} title="Instant verification" desc="Scan a QR or upload the PDF." />
          </ul>
        </div>
        <p className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} VeriChain. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-brand-bg p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-brand-navy">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-brand-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          <p className="mt-8 text-center text-xs text-brand-muted">
            Need to verify a transcript?{" "}
            <Link to="/verify" className="font-semibold text-brand-accent hover:underline">
              Public verification portal →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
        <Icon className="h-5 w-5 text-brand-accent" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </li>
  );
}
