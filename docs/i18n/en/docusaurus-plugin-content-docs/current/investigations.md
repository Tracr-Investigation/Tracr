---
sidebar_position: 2
title: Investigations
---

# Investigations

An investigation is the main container in Tracr. It groups documents, tasks, archived web sources, an entity graph, a map, and an activity log.

---

## Investigation list

The **Investigations** page shows all investigations you have access to, whether you created them or were invited as a collaborator.

**Available filters:**

- Search by title
- Filter by status
- Filter by category
- Quick reset of all filters

The status of an investigation can be changed directly from the list by clicking its status badge.

---

## Create an investigation

1. From the dashboard or the Investigations page, click **New investigation**.
2. Enter a title (required) and an optional description.
3. Select an initial status.
4. Confirm: you are automatically added as the owner.

---

## Investigation header

Each investigation shows at the top of the page:

- The **title** and **description**
- The **status badge**: clickable for users with *editor*, *manager*, or *owner* permission
- **Categories**: colored labels with icons, addable and removable by *editor*, *manager*, and *owner*
- The **owner**, creation date, last modification date, and internal identifier

---

## Permission levels

Each collaborator on an investigation has a permission level:

| Level | Access |
|---|---|
| **Owner** | Full access, Settings tab, ownership transfer, deletion |
| **Manager** | Invites and manages collaborators, edits title, description, status, categories, creates and edits documents and tasks |
| **Editor** | Creates and edits documents and tasks, edits status and categories |
| **Reader** | Read-only access on all tabs |

Invitations are pending until accepted by the recipient. A *Pending* badge indicates this in the collaborator list.

---

## Tabs

### Details

Displays the full description of the investigation. If no description was entered, a message indicates it.

---

### Tasks

Tasks let you organize and assign work to the team.

**Task fields:**

| Field | Description |
|---|---|
| Title | Short label for the task (required) |
| Description | Details or instructions (optional) |
| Status | To do / In progress / Done |
| Priority | Low / Normal / High / Urgent |
| Assigned to | A team member or nobody |
| Due date | Deadline (optional) |
| Visibility | Private (visible to you only) or Shared (visible to all) |

**Priorities and colors:**

- Low: grey
- Normal: blue
- High: orange
- Urgent: red (overdue tasks are also highlighted in red)

**Task tab filters:**

- Visibility: all, shared, private
- Status: all, to do, in progress, done

**Comments:** each task can receive comments from all members of the investigation.

---

### Documents

The Documents tab lists the rich-text documents of the investigation.

**Create a document:**
1. Click **New document**.
2. Optionally choose a template to pre-fill the content.
3. Enter a title.
4. Confirm to open the editor.

**Document editor:**
- Rich text editor (TipTap) with full formatting: headings, lists, tables, bold, italic, links, etc.
- **Real-time collaborative editing**: multiple users can edit the same document simultaneously, with other users' cursors visible.
- Auto-save.

**Document actions:**
- Quick preview from the list without opening the editor
- Full-screen editing
- PDF export
- Deletion (investigation owner or document creator)

---

### Sources

The Sources tab stores captures and web page archives associated with the investigation.

**Source types:**

| Type | Description |
|---|---|
| Screenshot | Screenshot of a web page (image) |
| MHTML page | Complete page saved in MHTML format |
| Archived page | Interactive web archive |
| Media | Image, video, or other file |

**File integrity:** each source includes a SHA-256 hash to verify it has not been modified since it was saved. Click the hash to copy it.

**Adding sources:** sources are added from the browser via the Tracr extension. An installation link is shown in the tab if the extension is not detected.

**Available filters:** screenshots, MHTML pages, archives, media, or show all.

**Actions:** download, full-screen preview, deletion (investigation owner or source creator).

---

### Collaborators

Team management for the investigation.

**Invite a collaborator:**
1. Type the user's username in the search field.
2. Select the permission level to assign.
3. Click the user in the results to send the invitation.

The invitation appears with *Pending* status until the user accepts it from their notifications.

**Edit permissions:** the owner can change each collaborator's permission level using the dropdown next to their name.

**Remove a collaborator:** the owner can remove a collaborator at any time. Data created by that collaborator (documents, tasks) is kept.

**Who can invite:** owners and managers. A manager can invite editors and readers, but not other managers.

---

### Graph

The graph visualizes relationships between entities involved in the investigation.

**Supported entity types:**

| Type | Examples |
|---|---|
| Person | Individual, suspect, witness |
| Organization | Company, association, group |
| IP address | Server, network device |
| Domain | Domain name, website |
| Phone | Landline or mobile phone number |
| Email | Email address |
| Account | Social media account, username |
| Location | Physical address, GPS coordinates |
| Event | Dated fact, incident |
| Other | Any element not matching other types |

**Create an entity:**
1. Click **Add entity**.
2. Choose the type, enter a label (required) and a value (optional).
3. Confirm to see the node appear on the graph.

**Create a link between two entities:**
1. Hover over a node until the connection handles appear.
2. Drag from a handle to the target node.
3. Optionally add a relationship label in the dialog box.

**Edit or delete:** click on a node or edge to open its detail panel.

**OSINT enrichment:** click a node to display available enrichment pivots depending on the entity type (search engines, public databases, etc.).

**Export the graph:**
- PNG: image to include in a report
- JSON: complete data to reimport or share the graph

The graph also offers a navigation minimap and zoom controls.

---

### Timeline

Chronological log of all activity in the investigation: documents created or modified, tasks added, collaborators invited, statuses changed, entities created, etc.

Each entry shows the author, date, and a description of the event. Icons identify the event category. Scroll down to load older events.

---

### Map

Interactive map (Leaflet) displaying entities of type **Location** from the graph.

Location-type entities are geocoded automatically from their text value. Each marker shows the entity's label and value on hover.

If multiple locations are present, the map automatically adjusts to fit them all.

Entities whose geocoding failed are listed below the map.

---

### Settings

*Tab visible to the investigation owner only.*

**Edit title and description:**
Modify the fields and click **Save changes**, which appears as soon as a change is detected.

**Transfer ownership:**
1. Search for a user by username.
2. Select them in the results.
3. Click **Transfer** and confirm.
After the transfer, you lose access to the Settings tab.

**Delete the investigation:**
1. Click **Delete**.
2. Type the exact title of the investigation to confirm.
3. Click **Confirm deletion**.

Deletion is **permanent** and removes all associated documents, tasks, sources, entities, and relations.
