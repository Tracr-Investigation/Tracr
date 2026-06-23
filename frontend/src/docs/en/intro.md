---
sidebar_position: -1
title: Introduction
slug: /
---

# Tracr

Tracr is an investigation and enquiry management platform. It is designed to centralize all information related to an investigation: collaborative documents, tasks, entities and their relationships, archived web sources, and an activity log.

---

## Main features

| Feature | Description |
|---|---|
| Investigations | Main container grouping all elements of an investigation |
| Documents | Real-time collaborative rich text editor with Yjs |
| Tasks | Task management with priorities, assignments, and due dates |
| Entity graph | Visualization of relationships between entities (people, IPs, domains…) |
| Sources | Web page captures and archives with SHA-256 hash, extracted text (OCR) |
| Selectors | Watch identifiers (email, username…) within source text, with occurrence detection (hits) |
| Map | Geographic visualization of Location-type entities |
| Timeline | Chronological activity log for an investigation |
| Templates | Reusable document models |
| OSINT | Enrichment pivots to public tools and automatic IoC extraction |
| Calendar | Calendar view of all your assigned tasks |
| Account security | Two-factor authentication (2FA/TOTP) and BIP39 recovery phrase (12 words) |

---

## Platform roles

| Role | Access |
|---|---|
| **User** | Access to investigations they are a member of, templates, notifications |
| **Administrator** | Full access + Administration panel (users, statuses, categories, logs) |
| **Super-administrator** | Full platform control, including application updates |

Platform roles are distinct from per-investigation permissions (Owner, Manager, Editor, Reader) which are managed investigation by investigation.
