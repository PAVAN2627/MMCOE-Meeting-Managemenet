import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/shared/RoleGuard";
import ScrollToTop from "@/components/ScrollToTop";
import { DashboardRedirect } from "@/components/DashboardRedirect";
import { UserRole } from "@/types/user.types";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";
import PrincipalDashboard from "./pages/dashboard/PrincipalDashboard";
import PrincipalMeetings from "./pages/dashboard/principal/Meetings";
import PrincipalTasks from "./pages/dashboard/principal/Tasks";
import PrincipalReports from "./pages/dashboard/principal/Reports";
import PrincipalUsers from "./pages/dashboard/principal/Users";
import PrincipalMoM from "./pages/dashboard/principal/MoM";
import PrincipalSettings from "./pages/dashboard/principal/Settings";
import HODDashboard from "./pages/dashboard/HODDashboard";
import HODMeetings from "./pages/dashboard/hod/Meetings";
import HODTasks from "./pages/dashboard/hod/Tasks";
import HODUsers from "./pages/dashboard/hod/Users";
import HODMoM from "./pages/dashboard/hod/MoM";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import StaffDashboard from "./pages/dashboard/StaffDashboard";
import StaffTasks from "./pages/dashboard/staff/Tasks";
import StaffMeetings from "./pages/dashboard/staff/Meetings";
import StaffDocuments from "./pages/dashboard/staff/Documents";
import HODSettings from "./pages/dashboard/hod/Settings";
import StaffSettings from "./pages/dashboard/staff/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            
            {/* Dashboard Redirect - redirects to role-specific dashboard */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            
            {/* Dashboard Routes with Role Guards */}
            <Route
              path="/dashboard/principal"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/meetings"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalMeetings />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/tasks"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalTasks />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/reports"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalReports />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/users"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalUsers />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/mom"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalMoM />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/principal/settings"
              element={
                <RoleGuard allowedRoles={[UserRole.PRINCIPAL]}>
                  <PrincipalSettings />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod/meetings"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODMeetings />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod/tasks"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODTasks />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod/users"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODUsers />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod/mom"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODMoM />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <RoleGuard allowedRoles={[UserRole.ADMIN_STAFF]}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff"
              element={
                <RoleGuard allowedRoles={[UserRole.GENERAL_STAFF]}>
                  <StaffDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff/tasks"
              element={
                <RoleGuard allowedRoles={[UserRole.GENERAL_STAFF]}>
                  <StaffTasks />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff/meetings"
              element={
                <RoleGuard allowedRoles={[UserRole.GENERAL_STAFF]}>
                  <StaffMeetings />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff/documents"
              element={
                <RoleGuard allowedRoles={[UserRole.GENERAL_STAFF]}>
                  <StaffDocuments />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff/settings"
              element={
                <RoleGuard allowedRoles={[UserRole.GENERAL_STAFF]}>
                  <StaffSettings />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/hod/settings"
              element={
                <RoleGuard allowedRoles={[UserRole.HOD]}>
                  <HODSettings />
                </RoleGuard>
              }
            />
            
            {/* Fallback Routes */}
            <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl">Unauthorized Access</h1></div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
