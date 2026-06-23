---
sidebar_position: 6
title: OSINT
---

# OSINT

Tracr intègre deux outils d'enrichissement OSINT accessibles directement depuis l'interface, sans aucun appel réseau côté serveur. Tous les liens s'ouvrent dans un nouvel onglet à l'initiative de l'utilisateur.

---

## Pivots d'enrichissement (graphe d'entités)

Depuis l'onglet **Graphe** d'une enquête, cliquez sur n'importe quel nœud pour ouvrir son panneau de détail. La section **Enrichissement** affiche des liens directs vers des outils publics adaptés au type de l'entité.

| Type d'entité | Outils |
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

Tous les types bénéficient également des pivots génériques : **Google**, **DuckDuckGo** et **Wayback Machine**.

La recherche est construite automatiquement à partir de la valeur de l'entité (ou du libellé si la valeur est vide).

---

## Panneau IoC (Indicateurs de Compromission)

Le panneau IoC est intégré à l'**éditeur de documents**. Il analyse le texte du document ouvert et extrait automatiquement les indicateurs techniques.

**Types d'indicateurs détectés :**

| Type | Description |
|---|---|
| IP | Adresses IPv4 et IPv6 |
| Domaines | Noms de domaine valides |
| E-mails | Adresses e-mail |
| Hashes | MD5, SHA1, SHA256 et autres empreintes hexadécimales |
| CVE | Identifiants de vulnérabilités (CVE-XXXX-XXXXX) |
| Crypto | Adresses de portefeuilles Bitcoin, Ethereum, etc. |

**Utilisation :**

1. Ouvrez un document dans l'éditeur.
2. Cliquez sur le bouton **Indicateurs (IOC)** dans la barre d'outils.
3. Le panneau s'ouvre à droite et liste tous les indicateurs détectés, groupés par type.
4. Pour chaque indicateur, cliquez sur **Entité** pour l'ajouter directement au graphe de l'enquête.
5. Les indicateurs déjà présents dans le graphe affichent une coche verte.
6. Cliquez sur l'icône de copie pour copier un indicateur dans le presse-papiers.
