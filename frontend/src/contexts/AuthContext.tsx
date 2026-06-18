import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../services/api';

interface User {
  id_user: number;
  pseudo: string;
  role: string;
  language: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      const delays = [500, 1000, 2000, 3000];
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            const language = data.language ?? 'en';
            setUser({ id_user: data.id_user, pseudo: data.pseudo, role: data.role, language });
            i18n.changeLanguage(language);
            document.cookie = `tracr_role=${data.role}; path=/; SameSite=Lax`;
          } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            document.cookie = 'tracr_role=; path=/; max-age=0; SameSite=Lax';
          }
          break;
        } catch {
          // Network error — backend not ready yet
          if (attempt < delays.length) {
            await new Promise((r) => setTimeout(r, delays[attempt]));
          }
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [i18n]);

  const login = (user: User, token: string) => {
    setUser(user);
    localStorage.setItem('token', token);
    i18n.changeLanguage(user.language ?? 'en');
    document.cookie = `tracr_role=${user.role}; path=/; SameSite=Lax`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    document.cookie = 'tracr_role=; path=/; max-age=0; SameSite=Lax';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};