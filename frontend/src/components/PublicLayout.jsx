import { Link } from "react-router-dom";
import { ScanLine, LogIn } from "lucide-react";
import Logo from "./Logo.jsx";

/** Header + footer shell for public pages (verification portal, scanner). */
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/"><Logo size="sm" /></Link>
          <nav className="flex items-center gap-2">
            <Link to="/scan" className="btn-ghost text-sm">
              <ScanLine className="h-4 w-4" /> Scan QR
            </Link>
            <Link to="/login" className="btn-outline text-sm">
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-center text-xs text-brand-muted">
          VeriChain · Blockchain-verified academic credentials · ©{" "}
          {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
