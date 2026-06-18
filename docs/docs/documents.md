---
sidebar_position: 3
title: Documents
---

# Documents

Les documents sont des fichiers texte riches associés à une enquête. Ils peuvent être écrits et édités simultanément par plusieurs collaborateurs en temps réel.

---

## Créer un document

1. Dans l'onglet **Documents** d'une enquête, cliquez sur **Nouveau document**.
2. Optionnellement, choisissez un **template** dans la liste pour pré-remplir le contenu.
3. Saisissez un titre.
4. Validez pour ouvrir l'éditeur.

Seuls les utilisateurs ayant la permission *éditeur*, *manager* ou *propriétaire* peuvent créer des documents.

---

## Éditeur de document

L'éditeur est basé sur TipTap et offre une mise en forme riche :

- Titres (H1, H2, H3)
- Listes à puces et numérotées
- Tableaux
- Gras, italique, souligné, code inline
- Liens hypertextes
- Blocs de code avec coloration syntaxique

La sauvegarde est automatique.

---

## Collaboration en temps réel

Plusieurs utilisateurs peuvent éditer le même document simultanément. Les curseurs et sélections de chaque collaborateur sont visibles en couleur distincte. Les modifications sont synchronisées instantanément via le protocole Yjs (CRDT).

---

## Panneau IoC (Indicateurs de Compromission)

Le panneau IoC est accessible depuis l'éditeur via le bouton **Indicateurs (IOC)**. Il analyse automatiquement le texte du document et extrait les indicateurs techniques.

**Types d'indicateurs détectés :**

| Type | Exemples |
|---|---|
| Adresses IP | 192.168.1.1, 8.8.8.8 |
| Domaines | example.com, sub.domain.org |
| Adresses e-mail | contact@example.com |
| Hashes | MD5, SHA1, SHA256 |
| CVE | CVE-2024-1234 |
| Adresses crypto | Bitcoin, Ethereum, etc. |

**Ajouter un IoC comme entité dans le graphe :**

Pour chaque indicateur détecté, un bouton **Entité** permet de l'ajouter directement au graphe de l'enquête en un clic. Les indicateurs déjà présents dans le graphe affichent une coche verte à la place du bouton.

Vous pouvez également copier n'importe quel indicateur dans le presse-papiers via l'icône de copie qui apparaît au survol.

---

## Aperçu rapide

Depuis la liste des documents, cliquez sur une ligne pour ouvrir le **panneau d'aperçu** latéral sans entrer dans l'éditeur. L'aperçu affiche le contenu en lecture seule ainsi que les métadonnées (auteur, date de modification).

---

## Ouvrir en plein écran

Cliquez sur le bouton **Ouvrir** ou sur le lien direct pour accéder à l'éditeur en plein écran.

---

## Export PDF

Depuis l'éditeur, utilisez le bouton d'export pour générer un fichier PDF du document. Le PDF est rendu côté serveur (WeasyPrint) et inclut la mise en forme complète.

---

## Supprimer un document

Un document peut être supprimé par le propriétaire de l'enquête ou par son créateur. La suppression est définitive.
