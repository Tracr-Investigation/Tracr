import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          404
        </p>
        <h1 className="text-2xl font-semibold text-accent mt-4">
          Page not found
        </h1>
        <p className="text-secondary mt-2 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 border border-primary/20 text-accent rounded-xl hover:bg-primary/10 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            <Home size={18} />
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
