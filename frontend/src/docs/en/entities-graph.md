---
sidebar_position: 4
title: Entity graph
---

# Entity graph

The **Graph** tab of an investigation lets you visually model relationships between people, organizations, infrastructure, and other elements involved in the investigation.

---

## Entity types

| Type | Examples |
|---|---|
| Person | Individual, suspect, witness |
| Organization | Company, association, criminal group |
| IP address | Server, network device |
| Domain | Domain name, website |
| Phone | Landline or mobile number |
| Email | Email address |
| Account | Username, social media account |
| Location | Physical address, GPS coordinates |
| Event | Dated fact, incident |
| Other | Any element not matching other types |

---

## Create an entity

1. Click **Add entity**.
2. Choose the type from the list.
3. Enter a label (required) and a value (optional, for example an IP address or domain name).
4. Confirm: the node appears on the graph.

---

## Create a link between two entities

1. Hover over a node until the connection handles appear on its edges.
2. Drag from a handle to the target node.
3. Release: a dialog box allows you to add a relationship label (optional).

---

## Edit or delete

Click a node or edge to open its detail panel. You can edit the label, the value, or delete the element.

---

## OSINT enrichment

Click a node to display, in the detail panel, the available **enrichment pivots** for that entity type. These are direct links to public tools that open the search in a new tab.

All types also benefit from generic pivots: Google, DuckDuckGo, and Wayback Machine.

| Type | Available tools |
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

---

## Export the graph

The **Export** button offers two formats:

- **PNG**: image capture of the graph in its current state, to include in a report
- **JSON**: complete data (nodes and relations) to reimport or share the graph

---

## Graph navigation

- **Minimap**: thumbnail overview of the full graph in the bottom right, clickable to navigate quickly
- **Zoom controls**: + and - buttons in the interface, or mouse wheel
- **Reset view**: button to re-center the graph on all nodes
