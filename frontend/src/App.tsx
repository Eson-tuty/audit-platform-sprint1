import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SiteLayout from "./site/SiteLayout";
import HomePage from "./site/HomePage";
import UniversityIndex from "./site/UniversityIndex";
import UniversityResourcePage from "./site/UniversityResourcePage";
import ContactPage from "./site/ContactPage";
import CmsPageView from "./site/CmsPageView";
import NotFound from "./site/NotFound";
import AdminLayout from "./admin/AdminLayout";
import LoginPage from "./admin/LoginPage";
import Dashboard from "./admin/Dashboard";
import PagesList from "./admin/PagesList";
import PageEditor from "./admin/PageEditor";
import UniversityList from "./admin/UniversityList";
import UniversityEditor from "./admin/UniversityEditor";
import Leads from "./admin/Leads";
import Settings from "./admin/Settings";
import Users from "./admin/Users";
import AuditLog from "./admin/AuditLog";
import { RequireAuth, RequirePermission } from "./admin/auth";
import ScrollToTop from "./components/ScrollToTop";
import AppLayout from "./audit/AppLayout";
import AuditDashboard from "./audit/Dashboard";
import Engagements from "./audit/Engagements";
import EngagementDetail from "./audit/EngagementDetail";
import ProcessTesting from "./audit/ProcessTesting";
import Queries from "./audit/Queries";
import MyWork from "./audit/MyWork";
import Clients from "./audit/Clients";
import Library from "./audit/Library";

const AUDIT_ANY = "audit.view|audit.test|audit.manage";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Admin panel */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="pages" element={<RequirePermission perm="cms.pages.manage"><PagesList /></RequirePermission>} />
          <Route path="pages/:id" element={<RequirePermission perm="cms.pages.manage"><PageEditor /></RequirePermission>} />
          <Route path="university" element={<RequirePermission perm="cms.university.manage"><UniversityList /></RequirePermission>} />
          <Route path="university/:id" element={<RequirePermission perm="cms.university.manage"><UniversityEditor /></RequirePermission>} />
          <Route path="leads" element={<RequirePermission perm="cms.leads.manage"><Leads /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission perm="cms.settings.manage"><Settings /></RequirePermission>} />
          <Route path="users" element={<RequirePermission perm="users.manage"><Users /></RequirePermission>} />
          <Route path="audit-log" element={<RequirePermission perm="audit_logs.view"><AuditLog /></RequirePermission>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Audit workspace */}
        <Route path="/app" element={<RequireAuth><RequirePermission perm={AUDIT_ANY}><AppLayout /></RequirePermission></RequireAuth>}>
          <Route index element={<AuditDashboard />} />
          <Route path="my-work" element={<MyWork />} />
          <Route path="engagements" element={<Engagements />} />
          <Route path="engagements/:id" element={<EngagementDetail />} />
          <Route path="testing/:id" element={<ProcessTesting />} />
          <Route path="queries" element={<Queries />} />
          <Route path="clients" element={<RequirePermission perm="audit.manage"><Clients /></RequirePermission>} />
          <Route path="library" element={<Library />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />

        {/* Public website */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/university" element={<UniversityIndex />} />
          <Route path="/university/:slug" element={<UniversityResourcePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/:slug" element={<CmsPageView />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
