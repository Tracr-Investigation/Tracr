---
sidebar_position: 10
title: Administration
---

# Administration

Le panneau **Administration** est accessible uniquement aux utilisateurs ayant le rôle **Administrateur** ou **Super-administrateur**.

---

## Tableau de bord admin

La page d'accueil du panneau Administration affiche des statistiques globales : nombre d'utilisateurs, d'enquêtes actives, de tâches en cours.

---

## Gestion des utilisateurs

### Créer un utilisateur
1. Administration → Utilisateurs → **Nouvel utilisateur**.
2. Renseignez le pseudo, l'e-mail et le rôle.
3. Un mot de passe temporaire est généré : l'utilisateur devra le changer à sa première connexion.

### Modifier un utilisateur
Cliquez sur un utilisateur pour modifier son pseudo, son rôle ou forcer un changement de mot de passe.

### Réinitialiser le mot de passe d'un utilisateur
Depuis la fiche d'un utilisateur, le bouton **Réinitialiser le mot de passe** génère un nouveau mot de passe temporaire et force l'utilisateur à le changer à sa prochaine connexion.

### Désactiver un compte
Un compte désactivé ne peut plus se connecter. Les données associées (enquêtes, documents) sont conservées.

### Supprimer un utilisateur
Le bouton **Supprimer** (icône corbeille) supprime définitivement le compte. Cette action est irréversible.

---

## Gestion des statuts d'enquête

Administration → **Statuts d'enquête**. Créez, renommez ou supprimez les statuts disponibles pour les enquêtes.

Chaque statut possède :
- Un **nom**
- Une **couleur** (sélecteur de couleur)

---

## Catégories d'enquête

Administration → **Catégories**. Organisez les enquêtes par catégories thématiques.

Chaque catégorie possède :
- Un **nom**
- Une **couleur**
- Une **icône** (choisie parmi une liste d'icônes Lucide)

---

## Catégories de logs

Administration → **Catégories de logs**. Gérez les catégories d'événements utilisées dans la chronologie des enquêtes.

---

## Catégories de modèles

Administration → **Catégories de modèles**. Organisez les templates de documents par catégorie.

---

## Journal des logs

Administration → **Logs**. Consultez l'historique de toutes les actions effectuées sur la plateforme.

**Fonctionnalités du journal :**
- Recherche textuelle dans les détails des logs
- Filtre par catégorie de log
- Option pour masquer les actions de consultation (lecture seule) - **activée par défaut**
- Pagination (15 entrées par page)

---

## Mises à jour de l'application

*Onglet réservé au **super-administrateur**.*

L'onglet **Mises à jour** compare le code déployé à la branche du dépôt GitHub du projet et affiche :
- l'état : à jour, ou nombre de commits de retard ;
- la liste des commits à appliquer ;
- les impacts détectés : migrations de base de données, dépendances, reconstruction d'image.

**Appliquer une mise à jour :**
1. Cliquez sur **Vérifier** pour rafraîchir l'état.
2. Si des changements sont disponibles, cliquez sur **Mettre à jour** et confirmez dans le panneau latéral.
3. L'application sauvegarde la base, récupère le code et redémarre. Une **page de maintenance** s'affiche pour tous les utilisateurs pendant l'opération, puis l'application revient automatiquement.

Lorsqu'une mise à jour modifie les **dépendances** ou l'**infrastructure** (Dockerfile, docker-compose), elle ne peut pas être appliquée en un clic : un avertissement indique la commande à exécuter manuellement sur le serveur (`git pull && docker compose up -d --build`).
