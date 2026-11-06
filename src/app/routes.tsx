import { Navigate, createBrowserRouter } from "react-router";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { StaffDashboard, SupervisorDashboard } from "@/pages/DashboardPages";
import { CallingCenterPage } from "@/pages/CallingCenterPage";
import {
  CallHistoryPage,
  HandoverPage,
  PatientPage,
  ReportsPage,
  SettingsPage,
  TaskManagementPage,
} from "@/pages/OperationsPages";

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="mt-3 text-xl font-bold">Page not found</h1>
        <a href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-blue-600">
          Return to dashboard
        </a>
      </div>
    </div>
  );
}
export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: SupervisorDashboard },
      { path: "doctor", element: <StaffDashboard role="doctor" /> },
      { path: "nurse", element: <StaffDashboard role="nurse" /> },
      { path: "tasks", Component: TaskManagementPage },
      { path: "calling", Component: CallingCenterPage },
      { path: "patients", Component: PatientPage },
      { path: "handover", Component: HandoverPage },
      { path: "calls", Component: CallHistoryPage },
      { path: "reports", Component: ReportsPage },
      { path: "settings", Component: SettingsPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
