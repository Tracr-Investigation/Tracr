from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from models.entity import Entity
from models.entity_relation import EntityRelation
from models.user import User


def _entity_to_dict(entity: Entity, pseudo: str | None = None) -> dict:
    """Goal: serialize an Entity to a dict (with optional creator pseudo). Input: entity, pseudo. Output: dict."""
    return {
        "id_entity": entity.id_entity,
        "id_investigation": entity.id_investigation,
        "type": entity.type,
        "label": entity.label,
        "value": entity.value,
        "notes": entity.notes,
        "color": entity.color,
        "pos_x": entity.pos_x,
        "pos_y": entity.pos_y,
        "created_by": entity.created_by,
        "created_by_pseudo": pseudo,
        "created_at": entity.created_at.isoformat() if entity.created_at else None,
        "updated_at": entity.updated_at.isoformat() if entity.updated_at else None,
    }


def _relation_to_dict(relation: EntityRelation, pseudo: str | None = None) -> dict:
    """Goal: serialize an EntityRelation to a dict (with optional creator pseudo). Input: relation, pseudo. Output: dict."""
    return {
        "id_relation": relation.id_relation,
        "id_investigation": relation.id_investigation,
        "source_id": relation.source_id,
        "target_id": relation.target_id,
        "label": relation.label,
        "created_by": relation.created_by,
        "created_by_pseudo": pseudo,
        "created_at": relation.created_at.isoformat() if relation.created_at else None,
    }


def get_entities(db: Session, investigation_id: int) -> list[dict]:
    """Goal: list an investigation's entities (with creator pseudo). Input: db, investigation_id. Output: list of entity dicts."""
    rows = (
        db.query(Entity, User.pseudo)
        .outerjoin(User, Entity.created_by == User.id_user)
        .filter(Entity.id_investigation == investigation_id)
        .order_by(Entity.created_at.asc())
        .all()
    )
    return [_entity_to_dict(e, pseudo) for e, pseudo in rows]


def get_entity_by_id(db: Session, entity_id: int) -> Optional[Entity]:
    """Goal: fetch an entity by id. Input: db, entity_id. Output: Entity or None."""
    return db.query(Entity).filter(Entity.id_entity == entity_id).first()


def create_entity(
    db: Session,
    id_investigation: int,
    type: str,
    label: str,
    created_by: int,
    value: Optional[str] = None,
    notes: Optional[str] = None,
    color: Optional[str] = None,
    pos_x: Optional[float] = None,
    pos_y: Optional[float] = None,
) -> Entity:
    """Goal: create a graph entity. Input: db, id_investigation, type, label, created_by, value, notes, color, pos_x, pos_y. Output: the created Entity."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    entity = Entity(
        id_investigation=id_investigation,
        type=type,
        label=label,
        value=value,
        notes=notes,
        color=color,
        pos_x=pos_x,
        pos_y=pos_y,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def update_entity(
    db: Session,
    entity: Entity,
    label: Optional[str] = None,
    value: Optional[str] = None,
    notes: Optional[str] = None,
    color: Optional[str] = None,
    pos_x: Optional[float] = None,
    pos_y: Optional[float] = None,
    clear_value: bool = False,
    clear_notes: bool = False,
) -> Entity:
    """Goal: update an entity's fields (clear_* to null value/notes). Input: db, entity, label, value, notes, color, pos_x, pos_y, clear_value, clear_notes. Output: the updated Entity."""
    if label is not None:
        entity.label = label
    if clear_value:
        entity.value = None
    elif value is not None:
        entity.value = value
    if clear_notes:
        entity.notes = None
    elif notes is not None:
        entity.notes = notes
    if color is not None:
        entity.color = color
    if pos_x is not None:
        entity.pos_x = pos_x
    if pos_y is not None:
        entity.pos_y = pos_y
    entity.updated_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_entity(db: Session, entity: Entity) -> None:
    """Goal: delete an entity. Input: db, entity. Output: None."""
    db.delete(entity)
    db.commit()


def reset_positions(db: Session, investigation_id: int) -> int:
    """Goal: clear all entities' positions for an investigation. Input: db, investigation_id. Output: count of reset entities."""
    entities = db.query(Entity).filter(Entity.id_investigation == investigation_id).all()
    for entity in entities:
        entity.pos_x = None
        entity.pos_y = None
    db.commit()
    return len(entities)


def get_relations(db: Session, investigation_id: int) -> list[dict]:
    """Goal: list an investigation's relations (with creator pseudo). Input: db, investigation_id. Output: list of relation dicts."""
    rows = (
        db.query(EntityRelation, User.pseudo)
        .outerjoin(User, EntityRelation.created_by == User.id_user)
        .filter(EntityRelation.id_investigation == investigation_id)
        .order_by(EntityRelation.created_at.asc())
        .all()
    )
    return [_relation_to_dict(r, pseudo) for r, pseudo in rows]


def get_relation_by_id(db: Session, relation_id: int) -> Optional[EntityRelation]:
    """Goal: fetch a relation by id. Input: db, relation_id. Output: EntityRelation or None."""
    return db.query(EntityRelation).filter(EntityRelation.id_relation == relation_id).first()


def create_relation(
    db: Session,
    id_investigation: int,
    source_id: int,
    target_id: int,
    created_by: int,
    label: Optional[str] = None,
) -> EntityRelation:
    """Goal: create a relation between two entities. Input: db, id_investigation, source_id, target_id, created_by, label. Output: the created EntityRelation."""
    relation = EntityRelation(
        id_investigation=id_investigation,
        source_id=source_id,
        target_id=target_id,
        label=label,
        created_by=created_by,
        created_at=datetime.now(ZoneInfo("Europe/Paris")),
    )
    db.add(relation)
    db.commit()
    db.refresh(relation)
    return relation


def update_relation(db: Session, relation: EntityRelation, label: Optional[str] = None) -> EntityRelation:
    """Goal: update a relation's label. Input: db, relation, label. Output: the updated EntityRelation."""
    if label is not None:
        relation.label = label
    db.add(relation)
    db.commit()
    db.refresh(relation)
    return relation


def delete_relation(db: Session, relation: EntityRelation) -> None:
    """Goal: delete a relation. Input: db, relation. Output: None."""
    db.delete(relation)
    db.commit()


def get_graph(db: Session, investigation_id: int) -> dict:
    """Goal: build the investigation's graph (nodes + edges). Input: db, investigation_id. Output: {"nodes", "edges"}."""
    entities = get_entities(db, investigation_id)
    relations = get_relations(db, investigation_id)
    return {"nodes": entities, "edges": relations}
