/// <reference types="cypress" />

import { PASSWORD, uniquePseudo } from '../support/constants';

describe('Documents', () => {

  let invId: number;

  before(() => {
    cy.registerByApi(uniquePseudo('doc'), PASSWORD);
    cy.apiCreateInvestigation('Investigation Documents').then((inv) => {
      invId = inv.id_investigation;
    });
  });

  beforeEach(() => {
    cy.visit('/investigations');
  });

  describe('Liste des documents', () => {
    it('navigue vers la liste des documents d\'une investigation', () => {
      cy.contains('Investigation Documents').click();
      cy.url().should('match', /\/investigations\/.+/);
      cy.get('body').contains(/documents/i).should('exist');
    });
  });

  describe('Création de document', () => {
    it('crée un document via l\'API et le voit dans la liste', () => {
      cy.apiCreateDocument(invId, 'Document Cypress');

      cy.contains('Investigation Documents').click();
      cy.get('[data-cy="tab-documents"]').click();
      cy.contains('Document Cypress').should('be.visible');
    });
  });

  describe('Éditeur de document', () => {
    let docId: number;

    beforeEach(() => {
      cy.apiCreateDocument(invId, 'Doc Éditeur').then((doc) => {
        docId = doc.id_document;
      });
    });

    const openEditor = () => {
      cy.visit('/investigations');
      cy.contains('Investigation Documents').click();
      cy.get('[data-cy="tab-documents"]').click();
      cy.contains('Doc Éditeur').click();
    };

    it('ouvre le document dans l\'éditeur', () => {
      openEditor();
      cy.url().should('match', /\/documents\/\d+/);
    });

    it('l\'éditeur Tiptap est interactif', () => {
      openEditor();
      cy.get('[contenteditable="true"]').should('be.visible').click();
      cy.get('[contenteditable="true"]').type(' Texte ajouté par Cypress');
    });

    it('sauvegarde le contenu du document', () => {
      cy.apiUpdateDocument(docId, { content_html: '<p>Contenu mis à jour par Cypress</p>' }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.content_html).to.include('Contenu mis à jour');
      });
    });
  });

  describe('Commentaires', () => {
    let docId: number;

    beforeEach(() => {
      cy.apiCreateDocument(invId, 'Doc Commentaires').then((doc) => {
        docId = doc.id_document;
      });
    });

    it('crée un commentaire via l\'API', () => {
      cy.apiCreateComment(docId, { comment_id: 'cmt-cypress-01', quote: 'texte cité', content: 'Commentaire Cypress' }).then((cmt) => {
        expect(cmt.content).to.eq('Commentaire Cypress');
      });
    });

    it('résout un commentaire via l\'API', () => {
      cy.apiCreateComment(docId, { comment_id: 'cmt-cypress-02', content: 'À résoudre' }).then((cmt) => {
        cy.apiResolveComment(docId, cmt.id_comment).then((resp) => {
          expect(resp.body.resolved).to.be.true;
        });
      });
    });
  });

  describe('Backups', () => {
    let docId: number;

    beforeEach(() => {
      cy.apiCreateDocument(invId, 'Doc Backup').then((doc) => {
        docId = doc.id_document;
      });
    });

    it('crée et restaure un backup via l\'API', () => {
      cy.apiCreateBackup(docId).then((backup) => {
        cy.apiUpdateDocument(docId, { content_html: '<p>Modification après backup</p>' });
        cy.apiRestoreBackup(docId, backup.id_backup).then((resp) => {
          expect(resp.status).to.eq(200);
        });
      });
    });
  });

});
