/// <reference types="cypress" />

import { apiUrl, authHeader } from './constants';

const setSession = (resp: { token: string; id_user: number; pseudo: string; role: string; language?: string; must_change_password?: boolean }) => {
  window.localStorage.setItem('token', resp.token);
  window.localStorage.setItem('user', JSON.stringify({ id_user: resp.id_user, pseudo: resp.pseudo, role: resp.role, language: resp.language ?? 'en', must_change_password: resp.must_change_password ?? false }));
};

Cypress.Commands.add('loginByApi', (pseudo: string, password: string) => {
  cy.request('POST', `${apiUrl()}/login`, { pseudo, password }).then((resp) => setSession(resp.body));
});

Cypress.Commands.add('registerByApi', (pseudo: string, password: string) => {
  cy.request('POST', `${apiUrl()}/register`, { pseudo, password }).then((resp) => setSession(resp.body));
});

Cypress.Commands.add('apiCreateInvestigation', (title: string, description = '') => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/investigations`, headers: authHeader(), body: { title, description } }).then((resp) => resp.body);
});

Cypress.Commands.add('apiCreateDocument', (invId: number, title: string, content_html = '<p>Contenu test</p>') => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/investigations/${invId}/documents`, headers: authHeader(), body: { title, content_html } }).then((resp) => resp.body);
});

Cypress.Commands.add('apiUpdateDocument', (docId: number, payload: Record<string, unknown>) => {
  return cy.request({ method: 'PATCH', url: `${apiUrl()}/documents/${docId}`, headers: authHeader(), body: payload });
});

Cypress.Commands.add('apiCreateComment', (docId: number, payload: { comment_id: string; quote?: string; content: string }) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/documents/${docId}/comments`, headers: authHeader(), body: { quote: '', ...payload } }).then((resp) => resp.body);
});

Cypress.Commands.add('apiResolveComment', (docId: number, commentId: number) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/documents/${docId}/comments/${commentId}/resolve`, headers: authHeader() });
});

Cypress.Commands.add('apiCreateBackup', (docId: number) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/documents/${docId}/backups`, headers: authHeader() }).then((resp) => resp.body);
});

Cypress.Commands.add('apiRestoreBackup', (docId: number, backupId: number) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/documents/${docId}/backups/${backupId}/restore`, headers: authHeader() });
});

Cypress.Commands.add('apiCreateTask', (invId: number, title: string, opts: Record<string, unknown> = {}) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/investigations/${invId}/tasks`, headers: authHeader(), body: { title, priority: 'normale', status: 'todo', ...opts } }).then((resp) => resp.body);
});

Cypress.Commands.add('apiUpdateTask', (invId: number, taskId: number, payload: Record<string, unknown>) => {
  return cy.request({ method: 'PATCH', url: `${apiUrl()}/investigations/${invId}/tasks/${taskId}`, headers: authHeader(), body: payload });
});

Cypress.Commands.add('apiDeleteTask', (invId: number, taskId: number) => {
  return cy.request({ method: 'DELETE', url: `${apiUrl()}/investigations/${invId}/tasks/${taskId}`, headers: authHeader() });
});

Cypress.Commands.add('apiListTasks', (invId: number) => {
  return cy.request({ method: 'GET', url: `${apiUrl()}/investigations/${invId}/tasks`, headers: authHeader() });
});

Cypress.Commands.add('apiCreateTaskResponse', (invId: number, taskId: number, content: string) => {
  return cy.request({ method: 'POST', url: `${apiUrl()}/investigations/${invId}/tasks/${taskId}/responses`, headers: authHeader(), body: { content } });
});

Cypress.Commands.add('apiListTaskResponses', (invId: number, taskId: number) => {
  return cy.request({ method: 'GET', url: `${apiUrl()}/investigations/${invId}/tasks/${taskId}/responses`, headers: authHeader() });
});

Cypress.Commands.add('apiListInvestigations', () => {
  return cy.request({ method: 'GET', url: `${apiUrl()}/investigations`, headers: authHeader() });
});

Cypress.Commands.add('apiUpdateInvestigation', (invId: number, payload: Record<string, unknown>) => {
  return cy.request({ method: 'PATCH', url: `${apiUrl()}/investigations/${invId}`, headers: authHeader(), body: payload });
});

Cypress.Commands.add('apiDeleteInvestigation', (invId: number) => {
  return cy.request({ method: 'DELETE', url: `${apiUrl()}/investigations/${invId}`, headers: authHeader() });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginByApi(pseudo: string, password: string): Chainable<void>;
      registerByApi(pseudo: string, password: string): Chainable<void>;

      apiCreateInvestigation(title: string, description?: string): Chainable<{ id_investigation: number; title: string; description: string }>;
      apiListInvestigations(): Chainable<Cypress.Response<{ investigations: { id_investigation: number; title: string }[]; total: number }>>;
      apiUpdateInvestigation(invId: number, payload: Record<string, unknown>): Chainable<Cypress.Response<unknown>>;
      apiDeleteInvestigation(invId: number): Chainable<Cypress.Response<unknown>>;

      apiCreateDocument(invId: number, title: string, content_html?: string): Chainable<{ id_document: number; title: string; content_html: string }>;
      apiUpdateDocument(docId: number, payload: Record<string, unknown>): Chainable<Cypress.Response<{ content_html: string; title: string }>>;

      apiCreateComment(docId: number, payload: { comment_id: string; quote?: string; content: string }): Chainable<{ id_comment: number; content: string; resolved: boolean }>;
      apiResolveComment(docId: number, commentId: number): Chainable<Cypress.Response<{ resolved: boolean }>>;

      apiCreateBackup(docId: number): Chainable<{ id_backup: number }>;
      apiRestoreBackup(docId: number, backupId: number): Chainable<Cypress.Response<unknown>>;

      apiCreateTask(invId: number, title: string, opts?: Record<string, unknown>): Chainable<{ id_task: number; title: string; status: string; priority: string; is_private?: boolean }>;
      apiUpdateTask(invId: number, taskId: number, payload: Record<string, unknown>): Chainable<Cypress.Response<{ status: string; title: string }>>;
      apiDeleteTask(invId: number, taskId: number): Chainable<Cypress.Response<unknown>>;
      apiListTasks(invId: number): Chainable<Cypress.Response<{ tasks: { id_task: number }[] }>>;

      apiCreateTaskResponse(invId: number, taskId: number, content: string): Chainable<Cypress.Response<{ content: string }>>;
      apiListTaskResponses(invId: number, taskId: number): Chainable<Cypress.Response<{ responses: unknown[] }>>;
    }
  }
}
