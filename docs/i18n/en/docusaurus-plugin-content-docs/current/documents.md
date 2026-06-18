---
sidebar_position: 3
title: Documents
---

# Documents

Documents are rich-text files associated with an investigation. They can be written and edited simultaneously by multiple collaborators in real time.

---

## Create a document

1. In the **Documents** tab of an investigation, click **New document**.
2. Optionally, choose a **template** from the list to pre-fill the content.
3. Enter a title.
4. Confirm to open the editor.

Only users with *editor*, *manager*, or *owner* permission can create documents.

---

## Document editor

The editor is based on TipTap and offers rich formatting:

- Headings (H1, H2, H3)
- Bullet and numbered lists
- Tables
- Bold, italic, underline, inline code
- Hyperlinks
- Code blocks with syntax highlighting

Saving is automatic.

---

## Real-time collaboration

Multiple users can edit the same document simultaneously. Each collaborator's cursor and selection are visible in a distinct color. Changes are synchronized instantly via the Yjs protocol (CRDT).

---

## IoC panel (Indicators of Compromise)

The IoC panel is accessible from the editor via the **Indicators (IOC)** button. It automatically analyzes the document text and extracts technical indicators.

**Detected indicator types:**

| Type | Examples |
|---|---|
| IP addresses | 192.168.1.1, 8.8.8.8 |
| Domains | example.com, sub.domain.org |
| Email addresses | contact@example.com |
| Hashes | MD5, SHA1, SHA256 |
| CVEs | CVE-2024-1234 |
| Crypto addresses | Bitcoin, Ethereum, etc. |

**Add an IoC as an entity in the graph:**

For each detected indicator, an **Entity** button lets you add it directly to the investigation's graph in one click. Indicators already present in the graph show a green checkmark instead of the button.

You can also copy any indicator to the clipboard via the copy icon that appears on hover.

---

## Quick preview

From the document list, click a row to open the **side preview panel** without entering the editor. The preview shows the content in read-only mode along with metadata (author, modification date).

---

## Full-screen editing

Click the **Open** button or the direct link to access the full-screen editor.

---

## PDF export

From the editor, use the export button to generate a PDF file of the document. The PDF is rendered server-side (WeasyPrint) and includes full formatting.

---

## Delete a document

A document can be deleted by the investigation owner or its creator. Deletion is permanent.
