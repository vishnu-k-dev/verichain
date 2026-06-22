import { useEffect, useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import TranscriptCard from "../../components/TranscriptCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { PageSpinner } from "../../components/LoadingSpinner.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { transcriptsApi } from "../../api/transcripts.js";
import { apiError } from "../../api/client.js";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState([]);

  useEffect(() => {
    transcriptsApi
      .list()
      .then(({ transcripts }) => setTranscripts(transcripts))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const active = transcripts.filter((t) => !t.isRevoked).length;

  return (
    <div>
      <PageHeader title="My transcripts" subtitle={user?.email} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={FileText} label="Total transcripts" value={transcripts.length} />
        <StatCard
          icon={ShieldCheck}
          label="Active & verifiable"
          value={active}
          accent="text-brand-success bg-brand-success/10"
        />
      </div>

      <h2 className="mb-3 mt-8 font-heading text-lg font-semibold text-brand-navy">
        Documents
      </h2>
      {transcripts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No transcripts yet"
          desc="When your institution issues a transcript, it will appear here, ready to download and share."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {transcripts.map((t) => (
            <TranscriptCard key={t.transcriptId} transcript={t} />
          ))}
        </div>
      )}
    </div>
  );
}
