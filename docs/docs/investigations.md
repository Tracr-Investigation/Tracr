---
sidebar_position: 2
title: Enquêtes
---

# Enquêtes

Une enquête est le conteneur principal de Tracr. Elle regroupe des documents, des tâches, des sources web archivées, un graphe d'entités, une carte et un journal d'activité.

---

## Liste des enquêtes

La page **Enquêtes** affiche toutes les enquêtes auxquelles vous avez accès, qu'elles soient créées par vous ou partagées par un collaborateur.

**Filtres disponibles :**

- Recherche par titre
- Filtre par statut
- Filtre par catégorie
- Réinitialisation rapide des filtres

Le statut d'une enquête peut être modifié directement depuis la liste en cliquant sur le badge de statut.

---

## Créer une enquête

1. Depuis le tableau de bord ou la page Enquêtes, cliquez sur **Nouvelle enquête**.
2. Renseignez le titre (obligatoire) et la description (facultative).
3. Sélectionnez un statut initial.
4. Validez : vous êtes automatiquement ajouté comme propriétaire.

---

## En-tête d'une enquête

Chaque enquête affiche en haut de page :

- Le **titre** et la **description**
- Le **badge de statut** : cliquable pour les utilisateurs ayant la permission *editeur*, *manager* ou *owner*
- Les **catégories** : étiquettes colorées avec icône, ajoutables et retirables par *editeur*, *manager* et *owner*
- Le **propriétaire**, la date de création, la date de dernière modification et l'identifiant interne

---

## Niveaux de permission

Chaque collaborateur d'une enquête possède un niveau de permission :

| Niveau | Accès |
|---|---|
| **Propriétaire** | Accès complet, onglet Paramètres, transfert de propriété, suppression |
| **Manager** | Invite et gère les collaborateurs, modifie titre, description, statut, catégories, crée et édite documents et tâches |
| **Éditeur** | Crée et édite documents et tâches, modifie statut et catégories |
| **Lecteur** | Lecture seule sur tous les onglets |

Les invitations sont en attente jusqu'à acceptation par le destinataire. Un badge *En attente* le signale dans la liste des collaborateurs.

---

## Onglets

### Détails

Affiche la description complète de l'enquête. Si aucune description n'a été saisie, un message l'indique.

---

### Tâches

Les tâches permettent d'organiser et d'assigner du travail à l'équipe.

**Champs d'une tâche :**

| Champ | Description |
|---|---|
| Titre | Intitulé court de la tâche (obligatoire) |
| Description | Détail ou instructions (facultatif) |
| Statut | À faire / En cours / Terminé |
| Priorité | Basse / Normale / Haute / Urgente |
| Assignée à | Un membre de l'équipe ou personne |
| Date d'échéance | Date limite (facultative) |
| Visibilité | Privée (visible par vous seul) ou Partagée (visible par tous) |

**Priorités et couleurs :**

- Basse : gris
- Normale : bleu
- Haute : orange
- Urgente : rouge (les tâches en retard sont également mises en évidence en rouge)

**Filtres de l'onglet Tâches :**

- Visibilité : toutes, partagées, privées
- Statut : tout, à faire, en cours, terminé

**Commentaires :** chaque tâche peut recevoir des commentaires (réponses) de tous les membres de l'enquête.

---

### Documents

L'onglet Documents liste les documents texte riches de l'enquête.

**Créer un document :**
1. Cliquez sur **Nouveau document**.
2. Optionnellement, choisissez un template pour pré-remplir le contenu.
3. Saisissez un titre.
4. Validez pour ouvrir l'éditeur.

**Éditeur de document :**
- Éditeur de texte riche (TipTap) avec mise en forme complète : titres, listes, tableaux, gras, italique, liens, etc.
- **Édition collaborative en temps réel** : plusieurs utilisateurs peuvent éditer le même document simultanément, les curseurs des autres sont visibles.
- Sauvegarde automatique.

**Actions sur un document :**
- Aperçu rapide depuis la liste sans ouvrir l'éditeur
- Ouverture en plein écran pour l'édition
- Export en PDF
- Suppression (propriétaire de l'enquête ou créateur du document)

---

### Sources

L'onglet Sources conserve des captures et archives de pages web associées à l'enquête.

**Types de sources :**

| Type | Description |
|---|---|
| Capture | Capture d'écran d'une page web (image) |
| Page MHTML | Page complète sauvegardée au format MHTML |
| Page archivée | Archive web interactive |
| Média | Image, vidéo ou autre fichier |

**Intégrité des fichiers :** chaque source est accompagnée d'une empreinte SHA-256 permettant de vérifier qu'elle n'a pas été modifiée depuis son enregistrement. Cliquez sur l'empreinte pour la copier.

**Ajout de sources :** les sources sont ajoutées depuis le navigateur via l'extension Tracr. Un lien d'installation est affiché dans l'onglet si l'extension n'est pas détectée.

**Filtres disponibles :** captures, pages MHTML, archives, médias ou tout afficher.

**Actions :** téléchargement, aperçu en plein écran, suppression (propriétaire de l'enquête ou créateur de la source).

---

### Collaborateurs

Gestion de l'équipe de l'enquête.

**Inviter un collaborateur :**
1. Saisissez le pseudo de l'utilisateur dans le champ de recherche.
2. Sélectionnez le niveau de permission à attribuer.
3. Cliquez sur l'utilisateur dans les résultats pour envoyer l'invitation.

L'invitation apparaît avec le statut *En attente* jusqu'à ce que l'utilisateur l'accepte depuis ses notifications.

**Modifier les permissions :** le propriétaire peut modifier le niveau de permission de chaque collaborateur via le menu déroulant à côté de son nom.

**Retirer un collaborateur :** le propriétaire peut retirer un collaborateur à tout moment. Les données créées par ce collaborateur (documents, tâches) sont conservées.

**Qui peut inviter :** propriétaire et managers. Un manager peut inviter des éditeurs et lecteurs, mais pas d'autres managers.

---

### Graphe

Le graphe visualise les relations entre les entités impliquées dans l'enquête.

**Types d'entités supportés :**

| Type | Exemples |
|---|---|
| Personne | Individu, suspect, témoin |
| Organisation | Entreprise, association, groupe |
| Adresse IP | Serveur, équipement réseau |
| Domaine | Nom de domaine, site web |
| Téléphone | Numéro de téléphone fixe ou mobile |
| E-mail | Adresse e-mail |
| Compte | Compte sur un réseau social, pseudonyme |
| Localisation | Adresse physique, coordonnées GPS |
| Événement | Fait daté, incident |
| Autre | Tout élément ne correspondant pas aux types précédents |

**Créer une entité :**
1. Cliquez sur **Ajouter une entité**.
2. Choisissez le type, saisissez un libellé (obligatoire) et une valeur (facultative).
3. Validez pour voir le nœud apparaître sur le graphe.

**Créer un lien entre deux entités :**
1. Survolez un nœud jusqu'à faire apparaître les poignées de connexion.
2. Faites glisser depuis la poignée vers le nœud cible.
3. Ajoutez optionnellement un libellé de relation dans la boîte de dialogue.

**Modifier ou supprimer :** cliquez sur un nœud ou une arête pour ouvrir son panneau de détail.

**Enrichissement OSINT :** cliquez sur un nœud pour afficher les pivots d'enrichissement disponibles selon le type d'entité (recherche sur moteurs, bases de données publiques, etc.).

**Exporter le graphe :**
- PNG : image pour l'inclure dans un rapport
- JSON : données complètes pour réimporter ou partager le graphe

Le graphe propose également une minimap de navigation et des contrôles de zoom.

---

### Chronologie

Journal chronologique de toutes les activités de l'enquête : documents créés ou modifiés, tâches ajoutées, collaborateurs invités, statuts changés, entités créées, etc.

Chaque entrée indique l'auteur, la date et une description de l'événement. Les icônes identifient la catégorie de l'événement. Faites défiler vers le bas pour charger les événements plus anciens.

---

### Carte

Carte interactive (Leaflet) affichant les entités de type **Localisation** du graphe.

Les entités de type Localisation sont géocodées automatiquement à partir de leur valeur textuelle. Chaque marqueur affiche le libellé et la valeur de l'entité au survol.

Si plusieurs localisations sont présentes, la carte s'ajuste automatiquement pour les englober toutes.

Les entités dont le géocodage a échoué sont listées sous la carte.

---

### Paramètres

*Onglet visible uniquement pour le propriétaire de l'enquête.*

**Modifier le titre et la description :**
Modifiez les champs et cliquez sur **Enregistrer les modifications** qui apparaît dès qu'une modification est détectée.

**Transférer la propriété :**
1. Recherchez un utilisateur par pseudo.
2. Sélectionnez-le dans les résultats.
3. Cliquez sur **Transférer** et confirmez.
Après le transfert, vous perdez l'accès à l'onglet Paramètres.

**Supprimer l'enquête :**
1. Cliquez sur **Supprimer**.
2. Saisissez le titre exact de l'enquête pour confirmer.
3. Cliquez sur **Confirmer la suppression**.

La suppression est **définitive** et entraîne la suppression de tous les documents, tâches, sources, entités et relations associés.
