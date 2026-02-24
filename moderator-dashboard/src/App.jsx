import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "react-hot-toast";
import Layout from "./layouts/Layout";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import LawEnforcement from "./pages/LawEnforcement";
import AdminPanel from "./pages/AdminPanel";
import DataAnalysisCenter from "./pages/DataAnalysisCenter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ROUTES } from "./constants/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function FullPageLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageLoading />;
  }

  return isAuthenticated ? children : <Navigate to={ROUTES.LOGIN} />;
}

function RoleProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoading />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.HOME} replace state={{ forbidden: true }} />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.forbidden) return;

    toast.error("Access denied.");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path={ROUTES.HOME} element={<Dashboard />} />
                <Route
                  path={ROUTES.DATA_ANALYSIS}
                  element={<DataAnalysisCenter />}
                />
                <Route
                  path={ROUTES.REPORTS}
                  element={
                    <RoleProtectedRoute allowedRoles={["moderator", "admin"]}>
                      <Reports />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.LEI}
                  element={
                    <RoleProtectedRoute
                      allowedRoles={["law_enforcement", "admin"]}
                    >
                      <LawEnforcement />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.USERS}
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "moderator"]}>
                      <Users />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ADMIN}
                  element={
                    <RoleProtectedRoute allowedRoles={["admin"]}>
                      <AdminPanel />
                    </RoleProtectedRoute>
                  }
                />
                <Route path={ROUTES.SETTINGS} element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
