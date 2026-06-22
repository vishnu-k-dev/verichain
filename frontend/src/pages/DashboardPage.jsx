import AppLayout from "../components/AppLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import InstitutionDashboard from "./dashboards/InstitutionDashboard.jsx";
import StudentDashboard from "./dashboards/StudentDashboard.jsx";
import AdminDashboard from "./dashboards/AdminDashboard.jsx";
import VerifierHome from "./dashboards/VerifierHome.jsx";

/** Role-aware dashboard router. */
export default function DashboardPage() {
  const { role } = useAuth();

  const view = {
    institution: <InstitutionDashboard />,
    student: <StudentDashboard />,
    admin: <AdminDashboard />,
    verifier: <VerifierHome />,
  }[role] || <VerifierHome />;

  return <AppLayout>{view}</AppLayout>;
}
