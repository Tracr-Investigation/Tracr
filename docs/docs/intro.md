---
sidebar_position: -1
title: Introduction
slug: /
---

# Tracr

Tracr est une plateforme de gestion d'enquêtes et d'investigations. Elle est conçue pour centraliser toutes les informations liées à une investigation : documents collaboratifs, tâches, entités et leurs relations, sources web archivées, et journal d'activité.

---

## Fonctionnalités principales

| Fonctionnalité | Description |
|---|---|
| Enquêtes | Conteneur principal regroupant tous les éléments d'une investigation |
| Documents | Éditeur de texte riche collaboratif en temps réel avec Yjs |
| Tâches | Gestion de tâches avec priorités, assignations et échéances |
| Graphe d'entités | Visualisation des relations entre entités (personnes, IPs, domaines…) |
| Sources | Captures et archives de pages web avec empreinte SHA-256 |
| Carte | Visualisation géographique des entités de type Localisation |
| Chronologie | Journal chronologique des activités d'une enquête |
| Templates | Modèles de documents réutilisables |
| OSINT | Pivots d'enrichissement vers des outils publics et extraction automatique d'IoCs |
| Calendrier | Vue calendrier de toutes vos tâches assignées |
| Codes de récupération | Phrase de récupération BIP39 (12 mots) pour retrouver l'accès en cas d'oubli de mot de passe |

---

## Rôles de la plateforme

| Rôle | Accès |
|---|---|
| **Utilisateur** | Accès aux enquêtes dont il est membre, aux templates, aux notifications |
| **Administrateur** | Accès complet + panneau Administration (utilisateurs, statuts, catégories, logs) |
| **Super-administrateur** | Contrôle total de la plateforme |

Les rôles de plateforme sont distincts des permissions par enquête (Propriétaire, Manager, Éditeur, Lecteur) qui sont gérées enquête par enquête.
