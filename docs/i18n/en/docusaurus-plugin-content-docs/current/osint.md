---
sidebar_position: 7
title: OSINT
---

# OSINT

Tracr integrates OSINT (Open Source Intelligence) enrichment tools to facilitate pivoting on indicators of compromise (IoC).

## IoC Panel

The **IoC** (Indicators of Compromise) panel allows you to quickly list and enrich indicators:

- IP addresses
- Domain names
- File hashes (MD5, SHA1, SHA256)
- URLs
- Email addresses

## Enrichment pivots

For each IoC, the **Enrichment** panel offers quick pivot links to public sources:

| Type | Available sources |
|---|---|
| IP | Shodan, VirusTotal, AbuseIPDB, Censys |
| Domain | VirusTotal, URLScan, DomainTools, Whois |
| Hash | VirusTotal, MalwareBazaar, Any.run |
| URL | URLScan, VirusTotal |
| Email | HaveIBeenPwned, Hunter.io |

Click a pivot link to open the search in a new tab.

:::tip
After enriching an IoC, create a corresponding entity in the investigation graph to keep a structured record.
:::
