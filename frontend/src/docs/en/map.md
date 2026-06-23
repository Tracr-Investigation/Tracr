---
sidebar_position: 7
title: Map
---

# Map

The **Map** tab of an investigation displays an interactive map (Leaflet) of all entities of type **Location** present in the entity graph.

---

## How it works

Location-type entities are automatically geocoded from their text value (address, place name, coordinates). Each successfully geocoded entity appears as a marker on the map.

Hovering over a marker shows a popup with the entity's label and value.

---

## Automatic view adjustment

When the map loads:
- If only one location is present, the map centers on that point with an appropriate zoom level
- If multiple locations are present, the map automatically adjusts to fit them all

---

## Ungeocoded entities

Location-type entities whose value could not be geocoded are listed below the map. This can happen if the value is too vague, misspelled, or not recognized by the geocoding service.

---

## Adding locations

To add a point to the map, create a **Location** entity in the investigation's Graph tab. Enter an address or place name in the value field. The entity will appear on the map after the next tab load.
