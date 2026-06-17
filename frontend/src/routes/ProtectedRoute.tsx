import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
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

  // MFA obligatoire : tant que l'utilisateur n'a pas enrole le TOTP, on le force
  // vers l'ecran d'enrolement (apres l'eventuelle config de la phrase de recuperation).
  if (user?.mfa_enabled === false && location.pathname !== '/setup-mfa') {
    return <Navigate to="/setup-mfa" replace />;
  }

  return <>{children}</>;
};