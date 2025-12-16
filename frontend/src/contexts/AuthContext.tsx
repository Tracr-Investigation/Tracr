import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id_user: number;
  pseudo: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté au chargement
    const userId = localStorage.getItem('user_id');
    const pseudo = localStorage.getItem('pseudo');

    if (userId && pseudo) {
      setUser({ id_user: parseInt(userId), pseudo });
    }
  }, []);

  const login = (user: User) => {
    setUser(user);
    localStorage.setItem('user_id', user.id_user.toString());
    localStorage.setItem('pseudo', user.pseudo);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_id');
    localStorage.removeItem('pseudo');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
};