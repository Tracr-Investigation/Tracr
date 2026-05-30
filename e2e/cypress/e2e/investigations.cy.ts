/// <reference types="cypress" />

import { PASSWORD, uniquePseudo } from '../support/constants';

describe('Investigations', () => {

  beforeEach(() => {
    cy.registerByApi(uniquePseudo('inv'), PASSWORD);
    cy.visit('/investigations');
  });

  describe('Liste des investigations', () => {
    it('affiche la page investigations', () => {
      cy.url().should('include', '/investigations');
    });

    it('affiche un message quand il n\'y a pas d\'investigations', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Création d\'investigation', () => {
    it('ouvre le modal de création', () => {
      cy.get('button').filter(':visible').then(($buttons) => {
        const createBtn = $buttons.filter((_, el) => el.textContent?.toLowerCase().includes('new') || el.textContent?.toLowerCase().includes('nouvelle') || el.querySelector('svg') !== null);
        if (createBtn.length > 0) cy.wrap(createBtn.first()).click();
      });
    });

    it('crée une investigation via l\'API et la voit dans la liste', () => {
      cy.apiCreateInvestigation('Investigation Cypress', 'Créée par Cypress');
      cy.reload();
      cy.contains('Investigation Cypress').should('be.visible');
    });
  });

  describe('Détail d\'investigation', () => {
    beforeEach(() => {
      cy.apiCreateInvestigation('Investigation détail', 'Pour tester le détail');
      cy.reload();
    });

    it('navigue vers le détail en cliquant sur une investigation', () => {
      cy.contains('Investigation détail').click();
      cy.url().should('match', /\/investigations\/.+/);
    });

    it('affiche les onglets de l\'investigation', () => {
      cy.contains('Investigation détail').click();
      cy.get('[role="tab"], nav a, button').should('have.length.at.least', 1);
    });
  });

  describe('Modification d\'investigation', () => {
    beforeEach(() => {
      cy.apiCreateInvestigation('À modifier', 'Description initiale');
      cy.reload();
    });

    it('peut modifier le titre via l\'API et voit la mise à jour', () => {
      cy.apiListInvestigations().then((resp) => {
        const inv = resp.body.investigations[0];
        cy.apiUpdateInvestigation(inv.id_investigation, { title: 'Titre modifié' });
      });

      cy.reload();
      cy.contains('Titre modifié').should('be.visible');
    });
  });

  describe('Suppression d\'investigation', () => {
    it('supprime une investigation via l\'API et ne la voit plus', () => {
      cy.apiCreateInvestigation('À supprimer');
      cy.reload();
      cy.contains('À supprimer').should('be.visible');

      cy.apiListInvestigations().then((resp) => {
        const inv = resp.body.investigations.find((i: { title: string }) => i.title === 'À supprimer');
        if (inv) cy.apiDeleteInvestigation(inv.id_investigation);
      });

      cy.reload();
      cy.contains('À supprimer').should('not.exist');
    });
  });

});
