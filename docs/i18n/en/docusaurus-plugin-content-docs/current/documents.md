---
sidebar_position: 3
title: Documents
---

# Documents

Tracr documents are rich notes associated with an investigation. They support **real-time collaboration**: multiple users can write simultaneously in the same document.

## Create a document

From the **Documents** tab of an investigation, click **New document**. You can optionally choose a template to pre-fill the structure.

## Rich editor

The editor offers:

- **Formatting**: bold, italic, underline, headings H1–H3, lists, task lists
- **Links**: select text and click the link icon
- **Images**: via the image icon in the toolbar
- **Embeds**: embed external content (URL)
- **Location pins**: add a geographic point directly in the text, also visible on the investigation map
- **Entity mentions**: type `@` to mention an existing entity from the investigation

## Real-time collaboration

When multiple users open the same document, their cursors appear with their username in color. Changes are synchronized instantly via Yjs (CRDT).

:::note
If the connection is lost, pending changes are preserved locally and re-synchronized upon reconnection.
:::

## Comments

Select text in the editor and click the **Comment** icon in the floating bar. Comments appear in the right sidebar. A comment can be resolved once addressed.

## Backups

The editor automatically creates periodic backups. To view them, open the **Backups** panel (clock icon at the top right). You can compare a backup with the current version and restore it.

## Templates

If a template was applied at creation, its content is pre-loaded. See the [Templates](./templates.md) section to create your own.
