---
sidebar_position: 5
title: Entités & Graphe
---

# Entités & Graphe

L'onglet **Graphe** d'une enquête permet de modéliser les relations entre différentes entités (personnes, organisations, adresses IP, domaines, etc.).

## Types d'entités

Vous pouvez créer des entités de n'importe quel type libre, par exemple :
- `personne`: individu impliqué dans l'enquête
- `organisation`: entreprise, groupe
- `ip`: adresse IP
- `domaine`: nom de domaine
- `email`: adresse e-mail
- `url`: lien web
- `hash`: condensat de fichier

## Créer une entité

Dans l'onglet **Graphe** :
1. Cliquez sur **Ajouter une entité** (bouton ou double-clic sur le canvas).
2. Renseignez le type, le libellé, la valeur (optionnelle) et les notes.
3. Choisissez une couleur pour distinguer visuellement les entités.

## Créer une relation

1. Survolez le bord d'une entité: une poignée de connexion apparaît.
2. Faites glisser la poignée vers une autre entité.
3. Donnez un libellé à la relation (ex. : "est lié à", "possède", "envoie vers").

## Navigation dans le graphe

- **Déplacer**: cliquez-glissez sur le fond du canvas
- **Zoom**: molette ou pinch
- **Sélectionner**: cliquez sur un nœud ou tracez une sélection
- **Repositionner**: glissez les nœuds

## Mentions dans les documents

Depuis l'éditeur de document, tapez `@` pour mentionner une entité. La mention crée un lien contextuel entre le texte et l'entité du graphe.
