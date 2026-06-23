---
sidebar_position: 6
title: OSINT
---

# OSINT

Tracr includes two OSINT enrichment tools accessible directly from the interface, with no server-side network calls. All links open in a new tab at the user's initiative.

---

## Enrichment pivots (entity graph)

From the **Graph** tab of an investigation, click any node to open its detail panel. The **Enrichment** section displays direct links to public tools adapted to the entity type.

| Entity type | Tools |
|---|---|
| IP address | Shodan, VirusTotal, AbuseIPDB, Censys, GreyNoise |
| Domain | VirusTotal, urlscan.io, crt.sh, SecurityTrails, Whois |
| Email | Epieos, EmailRep, Have I Been Pwned, Hunter |
| Account | X/Twitter, Instagram, GitHub, Reddit, TikTok, WhatsMyName |
| Phone | Google dork, Sync.me |
| Person | LinkedIn, Google dork |
| Organization | LinkedIn, OpenCorporates |
| Location | Google Maps, OpenStreetMap |
| Other | VirusTotal |

All types also benefit from generic pivots: **Google**, **DuckDuckGo**, and **Wayback Machine**.

The search query is built automatically from the entity's value (or label if the value is empty).

---

## IoC panel (Indicators of Compromise)

The IoC panel is integrated into the **document editor**. It analyzes the text of the open document and automatically extracts technical indicators.

**Detected indicator types:**

| Type | Description |
|---|---|
| IP | IPv4 and IPv6 addresses |
| Domains | Valid domain names |
| Emails | Email addresses |
| Hashes | MD5, SHA1, SHA256 and other hex digests |
| CVE | Vulnerability identifiers (CVE-XXXX-XXXXX) |
| Crypto | Bitcoin, Ethereum, and other wallet addresses |

**Usage:**

1. Open a document in the editor.
2. Click the **Indicators (IOC)** button in the toolbar.
3. The panel opens on the right and lists all detected indicators, grouped by type.
4. For each indicator, click **Entity** to add it directly to the investigation's graph.
5. Indicators already present in the graph show a green checkmark.
6. Click the copy icon to copy an indicator to the clipboard.
