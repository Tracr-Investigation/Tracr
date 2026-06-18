import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  // Le MFA n'est pas obligatoire : on ne force plus l'enrolement. Tant qu'il n'est
  // pas active, un « ! » est affiche sur l'entree Reglages de la sidebar (cf. Sidebar).
  // L'ecran /setup-mfa reste accessible volontairement depuis les reglages.

  return <>{children}</>;
};