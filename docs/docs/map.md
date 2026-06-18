---
sidebar_position: 7
title: Carte
---

# Carte

L'onglet **Carte** d'une enquête affiche une carte interactive (Leaflet) de toutes les entités de type **Localisation** présentes dans le graphe d'entités.

---

## Fonctionnement

Les entités de type Localisation sont géocodées automatiquement à partir de leur valeur textuelle (adresse, nom de lieu, coordonnées). Chaque entité géocodée apparaît comme un marqueur sur la carte.

Au survol d'un marqueur, une popup affiche le libellé et la valeur de l'entité.

---

## Ajustement automatique de la vue

Quand la carte charge :
- Si une seule localisation est présente, la carte se centre sur ce point avec un niveau de zoom adapté
- Si plusieurs localisations sont présentes, la carte s'ajuste automatiquement pour les englober toutes

---

## Entités non géocodées

Les entités de type Localisation dont la valeur n'a pas pu être géocodée sont listées sous la carte. Cela peut arriver si la valeur est trop vague, mal orthographiée ou non reconnue par le service de géocodage.

---

## Ajouter des localisations

Pour ajouter un point à la carte, créez une entité de type **Localisation** dans l'onglet Graphe de l'enquête. Renseignez une adresse ou un nom de lieu dans le champ valeur. L'entité apparaîtra sur la carte après le prochain chargement de l'onglet.
