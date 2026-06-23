---
sidebar_position: 4
title: Graphe d'entités
---

# Graphe d'entités

L'onglet **Graphe** d'une enquête permet de modéliser visuellement les relations entre les personnes, organisations, infrastructures et autres éléments impliqués dans l'investigation.

---

## Types d'entités

| Type | Exemples |
|---|---|
| Personne | Individu, suspect, témoin |
| Organisation | Entreprise, association, groupe criminel |
| Adresse IP | Serveur, équipement réseau |
| Domaine | Nom de domaine, site web |
| Téléphone | Numéro fixe ou mobile |
| E-mail | Adresse e-mail |
| Compte | Pseudonyme, compte sur un réseau social |
| Localisation | Adresse physique, coordonnées GPS |
| Événement | Fait daté, incident |
| Autre | Tout élément ne correspondant pas aux types précédents |

---

## Créer une entité

1. Cliquez sur **Ajouter une entité**.
2. Choisissez le type dans la liste.
3. Renseignez un libellé (obligatoire) et une valeur (facultative, par exemple une adresse IP ou un nom de domaine).
4. Validez : le nœud apparaît sur le graphe.

---

## Créer un lien entre deux entités

1. Survolez un nœud jusqu'à faire apparaître les poignées de connexion sur ses bords.
2. Faites glisser depuis une poignée vers le nœud cible.
3. Relâchez : une boîte de dialogue permet d'ajouter un libellé de relation (facultatif).

---

## Modifier ou supprimer

Cliquez sur un nœud ou une arête pour ouvrir son panneau de détail. Vous pouvez y modifier le libellé, la valeur ou supprimer l'élément.

---

## Enrichissement OSINT

Cliquez sur un nœud pour afficher, dans le panneau de détail, les **pivots d'enrichissement** disponibles pour ce type d'entité. Ce sont des liens directs vers des outils publics qui ouvrent la recherche dans un nouvel onglet.

Tous les types bénéficient également des pivots génériques : Google, DuckDuckGo et Wayback Machine.

| Type | Outils disponibles |
|---|---|
| Adresse IP | Shodan, VirusTotal, AbuseIPDB, Censys, GreyNoise |
| Domaine | VirusTotal, urlscan.io, crt.sh, SecurityTrails, Whois |
| E-mail | Epieos, EmailRep, Have I Been Pwned, Hunter |
| Compte | X/Twitter, Instagram, GitHub, Reddit, TikTok, WhatsMyName |
| Téléphone | Google dork, Sync.me |
| Personne | LinkedIn, Google dork |
| Organisation | LinkedIn, OpenCorporates |
| Localisation | Google Maps, OpenStreetMap |
| Autre | VirusTotal |

---

## Exporter le graphe

Le bouton **Exporter** propose deux formats :

- **PNG** : capture image du graphe dans son état actuel, à inclure dans un rapport
- **JSON** : données complètes (nœuds et relations) pour réimporter ou partager le graphe

---

## Navigation dans le graphe

- **Minimap** : aperçu miniature du graphe complet en bas à droite, cliquable pour naviguer rapidement
- **Contrôles de zoom** : boutons + et - dans l'interface, ou molette de la souris
- **Réinitialisation de la vue** : bouton pour recentrer le graphe sur l'ensemble des nœuds
