import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Gate that redirects to login (or recovery setup) for unauthenticated users.
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-accent">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const recoveryPending = sessionStorage.getItem('recovery_pending') === '1';
  if (recoveryPending && location.pathname !== '/setup-recovery') {
    return <Navigate to="/setup-recovery" replace />;
  }

  return <>{children}</>;
};