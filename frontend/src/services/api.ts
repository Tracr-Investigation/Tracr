const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_URL };

function parseApiError(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((err: { msg?: string }) => err.msg || fallback).join(', ');
  }
  return fallback;
}

export const api = {
  login: async (pseudo: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(parseApiError(data.detail, 'Erreur de connexion'));
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
      throw new Error(parseApiError(data.detail, "Erreur lors de l'inscription"));
    }

    return data;
  },
};
