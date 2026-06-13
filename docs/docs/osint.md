---
sidebar_position: 7
title: OSINT
---

# OSINT

Tracr intègre des outils d'enrichissement OSINT (Open Source Intelligence) pour faciliter les pivots sur des indicateurs de compromission (IoC).

## Panneau IoC

Le panneau **IoC** (Indicators of Compromise) permet de lister et d'enrichir rapidement des indicateurs :

- Adresses IP
- Noms de domaine
- Hachages de fichiers (MD5, SHA1, SHA256)
- URLs
- Adresses e-mail

## Pivots d'enrichissement

Pour chaque IoC, le panneau **Enrichissement** propose des liens de pivot rapide vers des sources publiques :

| Type | Sources disponibles |
|---|---|
| IP | Shodan, VirusTotal, AbuseIPDB, Censys |
| Domaine | VirusTotal, URLScan, DomainTools, Whois |
| Hash | VirusTotal, MalwareBazaar, Any.run |
| URL | URLScan, VirusTotal |
| Email | HaveIBeenPwned, Hunter.io |

Cliquez sur un lien de pivot pour ouvrir la recherche dans un nouvel onglet.

:::tip
Après avoir enrichi un IoC, créez une entité correspondante dans le graphe de l'enquête pour garder une trace structurée.
:::
