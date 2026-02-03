const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_URL };

export const api = {
  login: async (pseudo: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Erreur de connexion');
    }

    return data;
  },

  register: async (pseudo: string, password: string) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Erreur lors de l'inscription");
    }

    return data;
  },
};
