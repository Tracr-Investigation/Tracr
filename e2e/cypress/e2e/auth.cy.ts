/// <reference types="cypress" />

import { PASSWORD, apiUrl, uniquePseudo } from '../support/constants';

const registerByApi = (pseudo: string) =>
  cy.request('POST', `${apiUrl()}/register`, { pseudo, password: PASSWORD });

describe('Authentification', () => {

  describe('Page de connexion', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('affiche le formulaire de connexion', () => {
      cy.get('[data-cy="login-pseudo"]').should('be.visible');
      cy.get('[data-cy="login-password"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').contains('Sign in').should('be.visible');
    });

    it('connecte un utilisateur avec des identifiants valides', () => {
      const pseudo = uniquePseudo();
      registerByApi(pseudo);

      cy.get('[data-cy="login-pseudo"]').type(pseudo);
      cy.get('[data-cy="login-password"]').type(PASSWORD);
      cy.get('[data-cy="login-submit"]').click();

      cy.url().should('not.include', '/login');
    });

    it('affiche une erreur avec un mauvais mot de passe', () => {
      const pseudo = uniquePseudo();
      registerByApi(pseudo);

      cy.get('[data-cy="login-pseudo"]').type(pseudo);
      cy.get('[data-cy="login-password"]').type('WrongPassword99!');
      cy.get('[data-cy="login-submit"]').click();

      cy.contains('Invalid credentials').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('affiche une erreur avec un utilisateur inconnu', () => {
      cy.get('[data-cy="login-pseudo"]').type('utilisateur_inexistant_xyz');
      cy.get('[data-cy="login-password"]').type(PASSWORD);
      cy.get('[data-cy="login-submit"]').click();

      cy.url().should('include', '/login');
    });

    it('redirige vers /login si non authentifié sur une route protégée', () => {
      cy.clearLocalStorage();
      cy.visit('/investigations');
      cy.url().should('include', '/login');
    });
  });

  describe('Page d\'inscription', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('affiche le formulaire d\'inscription', () => {
      cy.get('[data-cy="register-pseudo"]').should('be.visible');
      cy.get('[data-cy="register-password"]').should('be.visible');
      cy.get('[data-cy="register-confirm-password"]').should('be.visible');
      cy.get('[data-cy="register-submit"]').should('be.visible');
    });

    it('inscrit un nouvel utilisateur', () => {
      const pseudo = uniquePseudo();

      cy.get('[data-cy="register-pseudo"]').type(pseudo);
      cy.get('[data-cy="register-password"]').type(PASSWORD);
      cy.get('[data-cy="register-confirm-password"]').type(PASSWORD);
      cy.get('[data-cy="register-submit"]').click();

      cy.url().should('not.include', '/register');
    });

    it('empêche l\'inscription avec un pseudo déjà pris', () => {
      const pseudo = uniquePseudo();
      registerByApi(pseudo);

      cy.get('[data-cy="register-pseudo"]').type(pseudo);
      cy.get('[data-cy="register-password"]').type(PASSWORD);
      cy.get('[data-cy="register-confirm-password"]').type(PASSWORD);
      cy.get('[data-cy="register-submit"]').click();

      cy.contains(/already taken|déjà pris/i).should('be.visible');
    });
  });

  describe('Déconnexion', () => {
    it('déconnecte l\'utilisateur et redirige vers /login', () => {
      cy.clearLocalStorage();
      cy.window().then((win) => win.sessionStorage.clear());
      cy.registerByApi(uniquePseudo(), PASSWORD);
      cy.visit('/');

      cy.get('[data-cy="logout"]').click({ force: true });

      cy.url().should('include', '/login');
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
    });
  });

});
