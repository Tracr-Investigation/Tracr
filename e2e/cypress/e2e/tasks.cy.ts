/// <reference types="cypress" />

import { PASSWORD, authHeader, apiUrl, uniquePseudo } from '../support/constants';

describe('Tâches (Tasks)', () => {

  let invId: number;

  before(() => {
    cy.registerByApi(uniquePseudo('task'), PASSWORD);
    cy.apiCreateInvestigation('Investigation Tâches').then((inv) => {
      invId = inv.id_investigation;
    });
  });

  beforeEach(() => {
    cy.visit('/investigations');
  });

  describe('Liste des tâches', () => {
    it('navigue vers l\'onglet tâches d\'une investigation', () => {
      cy.contains('Investigation Tâches').click();
      cy.url().should('match', /\/investigations\/.+/);
      cy.get('body').contains(/tâches|tasks/i).should('exist');
    });

    it('affiche les tâches créées', () => {
      cy.apiCreateTask(invId, 'Tâche visible Cypress');
      cy.contains('Investigation Tâches').click();
      cy.get('[data-cy="tab-tasks"]').click();
      cy.contains('Tâche visible Cypress').should('be.visible');
    });
  });

  describe('Création de tâche', () => {
    it('crée une tâche via l\'API avec priorité haute', () => {
      cy.apiCreateTask(invId, 'Tâche haute priorité', { priority: 'haute' }).then((task) => {
        expect(task.priority).to.eq('haute');
        expect(task.status).to.eq('todo');
      });
    });

    it('crée une tâche urgente', () => {
      cy.apiCreateTask(invId, 'Incident critique', { priority: 'urgente', status: 'en_cours' }).then((task) => {
        expect(task.priority).to.eq('urgente');
        expect(task.status).to.eq('en_cours');
      });
    });

    it('crée une tâche privée', () => {
      cy.apiCreateTask(invId, 'Tâche privée', { is_private: true }).then((task) => {
        expect(task.is_private).to.be.true;
      });
    });
  });

  describe('Modification de tâche', () => {
    it('met à jour le statut d\'une tâche', () => {
      cy.apiCreateTask(invId, 'Tâche à mettre à jour').then((task) => {
        cy.apiUpdateTask(invId, task.id_task, { status: 'en_cours' }).then((resp) => {
          expect(resp.body.status).to.eq('en_cours');
        });
      });
    });

    it('marque une tâche comme terminée', () => {
      cy.apiCreateTask(invId, 'Tâche à terminer').then((task) => {
        cy.apiUpdateTask(invId, task.id_task, { status: 'termine' }).then((resp) => {
          expect(resp.body.status).to.eq('termine');
        });
      });
    });

    it('met à jour le titre d\'une tâche', () => {
      cy.apiCreateTask(invId, 'Ancien titre').then((task) => {
        cy.apiUpdateTask(invId, task.id_task, { title: 'Nouveau titre' }).then((resp) => {
          expect(resp.body.title).to.eq('Nouveau titre');
        });
      });
    });
  });

  describe('Réponses aux tâches', () => {
    it('ajoute une réponse à une tâche', () => {
      cy.apiCreateTask(invId, 'Tâche avec réponse').then((task) => {
        cy.apiCreateTaskResponse(invId, task.id_task, 'Réponse Cypress : investigation terminée.').then((resp) => {
          expect(resp.status).to.eq(200);
          expect(resp.body.content).to.include('Réponse Cypress');
        });
      });
    });

    it('liste les réponses d\'une tâche', () => {
      cy.apiCreateTask(invId, 'Tâche listing réponses').then((task) => {
        cy.apiCreateTaskResponse(invId, task.id_task, 'Réponse 1');
        cy.apiListTaskResponses(invId, task.id_task).then((resp) => {
          expect(resp.body.responses.length).to.be.at.least(1);
        });
      });
    });
  });

  describe('Suppression de tâche', () => {
    it('supprime une tâche via l\'API', () => {
      cy.apiCreateTask(invId, 'Tâche à supprimer').then((task) => {
        cy.apiDeleteTask(invId, task.id_task).then((resp) => {
          expect(resp.status).to.eq(200);
        });

        cy.apiListTasks(invId).then((resp) => {
          const ids = resp.body.tasks.map((t) => t.id_task);
          expect(ids).not.to.include(task.id_task);
        });
      });
    });
  });

  describe('Mes tâches', () => {
    it('récupère les tâches assignées à l\'utilisateur courant', () => {
      cy.request({ method: 'GET', url: `${apiUrl()}/tasks/me`, headers: authHeader() }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('tasks');
      });
    });
  });

});
