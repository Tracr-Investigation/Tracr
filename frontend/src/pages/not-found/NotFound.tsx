import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

export const NotFound = () => {
  const navigate = useNavigate();
  usePageTitle('Page introuvable');

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{background: 'var(--bg-surface)'}}>
      <div className="text-center">
        <p className="text-8xl font-bold text-text-default/10 select-none">404</p>
        <h1 className="text-2xl font-bold text-text-default mt-4">Page introuvable</h1>
        <p className="text-text-muted mt-2 max-w-md mx-auto text-sm">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-input-bg border border-border text-text-default hover:text-text-default rounded-xl transition-all text-sm"
          >
            <ArrowLeft size={16}/>
            Retour
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-text-default font-semibold text-sm hover:opacity-90 transition-all"
            style={{background: 'var(--theme-primary)'}}
          >
            <Home size={16}/>
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
};
