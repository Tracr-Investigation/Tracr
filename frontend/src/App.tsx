import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { Login } from './pages/login/Login';
import { Register } from './pages/register/Register';
import { Home } from './pages/home/Home';
import { Investigations } from './pages/investigations/Investigations';
import { InvestigationDetail } from './pages/investigations/InvestigationDetail';
import { DocumentDetail } from './pages/investigations/DocumentDetail';
import { Templates } from './pages/templates/Templates';
import { Settings } from './pages/settings/Settings';
import { Admin } from './pages/admin/Admin';
import { Notifications } from './pages/notifications/Notifications';
import { Calendar } from './pages/calendar/Calendar';
import { ForceChangePassword } from './pages/force-change-password/ForceChangePassword';
import { NotFound } from './pages/not-found/NotFound';
import { useThemeStore } from './stores/themeStore';

const ACCENT_CLASSES: string[] = ['accent-emerald', 'accent-blue', 'accent-rose', 'accent-amber', 'accent-cyan'];

function App() {
  const { mode, accent } = useThemeStore();

  useEffect(() => {
    const html = document.documentElement;

    if (mode === 'light') html.classList.add('light');
    else html.classList.remove('light');

    ACCENT_CLASSES.forEach((cls) => html.classList.remove(cls));
    if (accent !== 'violet') html.classList.add(`accent-${accent}`);
  }, [mode, accent]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investigations"
            element={
              <ProtectedRoute>
                <Investigations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investigations/:slug"
            element={
              <ProtectedRoute>
                <InvestigationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investigations/:slug/documents/:docId"
            element={
              <ProtectedRoute>
                <DocumentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
