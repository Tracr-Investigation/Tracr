---
sidebar_position: 13
title: Keyboard Shortcuts
---

# Keyboard Shortcuts

## Interface

| Shortcut | Action |
|---|---|
| `Ctrl` + `B` / `Cmd` + `B` | Collapse / expand the sidebar |

## Document editor

### Text formatting

| Shortcut | Action |
|---|---|
| `Ctrl` + `B` | Bold |
| `Ctrl` + `I` | Italic |
| `Ctrl` + `U` | Underline |
| `Ctrl` + `Shift` + `X` | Strikethrough |

### Structure

| Shortcut | Action |
|---|---|
| `#` + `Space` | Heading H1 |
| `##` + `Space` | Heading H2 |
| `###` + `Space` | Heading H3 |
| `-` + `Space` | Bullet list |
| `1.` + `Space` | Numbered list |
| `[ ]` + `Space` | Checkbox |

### Links and navigation

| Shortcut | Action |
|---|---|
| `Ctrl` + `K` | Insert / edit a link |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Shift` + `Z` | Redo |
| `Ctrl` + `A` | Select all |

### Mentions

| Shortcut | Action |
|---|---|
| `@` | Mention an entity from the investigation |

:::note
`Ctrl` on Windows/Linux corresponds to `Cmd` on macOS.

The `Ctrl+B` shortcut for the sidebar is not triggered when the cursor is in the editor, to avoid conflicting with the **Bold** shortcut.
:::

## URL hash navigation

You can open a specific tab of an investigation directly by adding a hash to the URL:

| URL | Tab opened |
|---|---|
| `/investigations/my-investigation-1#tasks` | Tasks |
| `/investigations/my-investigation-1#documents` | Documents |
| `/investigations/my-investigation-1#sources` | Sources |
| `/investigations/my-investigation-1#collaborators` | Collaborators |
| `/investigations/my-investigation-1#graph` | Graph |
| `/investigations/my-investigation-1#timeline` | Timeline |
| `/investigations/my-investigation-1#map` | Map |
| `/investigations/my-investigation-1#settings` | Settings |

These links are shareable: sending a URL with a hash to a collaborator will open the corresponding tab directly for them.
