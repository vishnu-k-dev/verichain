import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InstitutionIssuePage from "./pages/InstitutionIssuePage.jsx";
import InstitutionStudentsPage from "./pages/InstitutionStudentsPage.jsx";
import AdminInstitutionsPage from "./pages/AdminInstitutionsPage.jsx";
import VerificationPortalPage from "./pages/VerificationPortalPage.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/verify" element={<VerificationPortalPage />} />
      <Route path="/verify/:transcriptId" element={<VerificationPortalPage />} />
      <Route path="/scan" element={<ScanPage />} />

      {/* Guest-only */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Authenticated */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route
        path="/institution/issue"
        element={
          <ProtectedRoute roles={["institution"]}>
            <InstitutionIssuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/students"
        element={
          <ProtectedRoute roles={["institution"]}>
            <InstitutionStudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/institutions"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminInstitutionsPage />
          </ProtectedRoute>
        }
      />

      {/* Defaults */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
