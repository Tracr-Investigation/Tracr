---
sidebar_position: 5
title: Entities & Graph
---

# Entities & Graph

The **Graph** tab of an investigation allows you to model relationships between different entities (people, organizations, IP addresses, domains, etc.).

## Entity types

You can create entities of any free type, for example:
- `person`: individual involved in the investigation
- `organization`: company, group
- `ip`: IP address
- `domain`: domain name
- `email`: email address
- `url`: web link
- `hash`: file hash

## Create an entity

In the **Graph** tab:
1. Click **Add entity** (button or double-click on the canvas).
2. Fill in the type, label, value (optional), and notes.
3. Choose a color to visually distinguish entities.

## Create a relationship

1. Hover over the edge of an entity - a connection handle appears.
2. Drag the handle to another entity.
3. Give the relationship a label (e.g. "is linked to", "owns", "sends to").

## Navigating the graph

- **Move**: click-drag on the canvas background
- **Zoom**: scroll wheel or pinch
- **Select**: click on a node or draw a selection
- **Reposition**: drag nodes

## Mentions in documents

From the document editor, type `@` to mention an entity. The mention creates a contextual link between the text and the graph entity.
