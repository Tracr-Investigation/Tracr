---
sidebar_position: 3
title: Documents
---

# Documents

Les documents Tracr sont des notes enrichies associées à une enquête. Ils supportent la **collaboration en temps réel** : plusieurs utilisateurs peuvent écrire simultanément dans le même document.

## Créer un document

Depuis l'onglet **Documents** d'une enquête, cliquez sur **Nouveau document**. Vous pouvez optionnellement choisir un modèle pour pré-remplir la structure.

## Éditeur riche

L'éditeur propose :

- **Mise en forme**: gras, italique, souligné, titres H1–H3, listes, listes de tâches
- **Liens**: sélectionnez du texte et cliquez sur l'icône lien
- **Images**: via l'icône image dans la barre d'outils
- **Embeds**: intégration de contenu externe (URL)
- **Épingles de localisation**: ajoutez un point géographique directement dans le texte, visible aussi sur la carte de l'enquête
- **Mentions d'entités**: tapez `@` pour mentionner une entité existante de l'enquête

## Collaboration temps réel

Quand plusieurs utilisateurs ouvrent le même document, leurs curseurs apparaissent avec leur pseudo en couleur. Les modifications sont synchronisées instantanément via Yjs (CRDT).

:::note
Si la connexion est perdue, les modifications en attente sont préservées localement et resynchronisées à la reconnexion.
:::

## Commentaires

Sélectionnez du texte dans l'éditeur et cliquez sur l'icône **Commenter** dans la barre flottante. Les commentaires apparaissent dans le panneau latéral droit. Un commentaire peut être résolu une fois traité.

## Sauvegardes

L'éditeur crée automatiquement des sauvegardes ponctuelles. Pour les consulter, ouvrez le panneau **Sauvegardes** (icône horloge en haut à droite). Vous pouvez comparer une sauvegarde avec la version actuelle et la restaurer.

## Modèles

Si un modèle a été appliqué à la création, son contenu est pré-chargé. Voir la section [Modèles](./templates.md) pour créer les vôtres.
