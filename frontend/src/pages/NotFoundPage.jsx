import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import PublicLayout from "../components/PublicLayout.jsx";

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
          <Compass className="h-8 w-8" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold text-brand-navy">Page not found</h1>
        <p className="mt-2 text-brand-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </PublicLayout>
  );
}
