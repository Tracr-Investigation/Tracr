import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { Login } from './pages/login/Login';
import { Register } from './pages/register/Register';
import { Home } from './pages/home/Home';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Investigations } from './pages/investigations/Investigations';
import { InvestigationDetail } from './pages/investigations/InvestigationDetail';
import { Templates } from './pages/templates/Templates';
import { Settings } from './pages/settings/Settings';
import { Admin } from './pages/admin/Admin';
import { Notifications } from './pages/notifications/Notifications';
import { NotFound } from './pages/not-found/NotFound';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
            path="/investigations/:id"
            element={
              <ProtectedRoute>
                <InvestigationDetail />
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