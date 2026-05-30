/// <reference types="cypress" />

export const PASSWORD = 'Testpassword1!';

export const apiUrl = (): string => Cypress.env('apiUrl') || 'http://localhost:8000';

export const uniquePseudo = (prefix = 'e2e'): string => `${prefix}_${Date.now()}`;

export const getToken = (): string => window.localStorage.getItem('token') || '';

export const authHeader = (): { Authorization: string } => ({
  Authorization: `Bearer ${getToken()}`,
});
