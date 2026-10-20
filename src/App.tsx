import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import { LoginPage, SignupPage, ForgotPasswordPage } from './pages/Auth';
import { AppLayout } from './pages/AppLayout';
import Dashboard from './pages/Dashboard';
import NewInspection from './pages/NewInspection';
import { HistoryPage } from './pages/History';
import { ReportsPage } from './pages/Reports';
import { DatasetsPage } from './pages/Datasets';
import { SettingsPage } from './pages/Settings';
import { ToastContainer } from './components/ToastContainer';
import { useAuthStore } from './store';

// Scroll to top helper on route navigation
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Protected route wrapper: redirects to login if unauthenticated in strict mode,
// but automatically provides seamless guest access in demo mode.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, login } = useAuthStore();

  useEffect(() => {
    // If user enters directly into /app without prior login, auto-provision guest session for smooth demo experience
    if (!isAuthenticated && !user) {
      login('guest.operator@netradrishti.ai', 'demo1234');
    }
  }, [isAuthenticated, user, login]);

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastContainer />
      <Routes>
        {/* Public Landing & Marketing */}
        <Route path="/" element={<Landing />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Application Core Suite */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inspect" element={<NewInspection />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<HistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
