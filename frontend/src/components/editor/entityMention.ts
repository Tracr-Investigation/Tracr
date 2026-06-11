import Mention from '@tiptap/extension-mention';
import {ReactRenderer} from '@tiptap/react';
import type {SuggestionProps, SuggestionKeyDownProps} from '@tiptap/suggestion';
import {api} from '../../services/api';
import {MentionList, type EntityItem, type MentionListRef} from './MentionList';

type ClientRect = (() => DOMRect | null) | null | undefined;

const positionPopup = (popup: HTMLDivElement, clientRect: ClientRect) => {
    if (!clientRect) return;
    const rect = clientRect();
    if (!rect) return;
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 6}px`;
};

// Crée une extension Mention liée aux entités d'une enquête : taper « @ »
// propose les entités du graphe, et insère une puce reliée à l'entité.
export function createEntityMention(investigationId: number) {
    let cache: EntityItem[] | null = null;
    const fetchEntities = async (): Promise<EntityItem[]> => {
        if (cache) return cache;
        try {
            const {entities} = await api.listEntities(investigationId);
            cache = entities.map(e => ({id: e.id_entity, label: e.label, type: e.type, value: e.value}));
        } catch {
            cache = [];
        }
        return cache;
    };

    return Mention.extend({
        addAttributes() {
            return {
                id: {
                    default: null,
                    parseHTML: el => el.getAttribute('data-id'),
                    renderHTML: attrs => (attrs.id ? {'data-id': attrs.id} : {}),
                },
                label: {
                    default: null,
                    parseHTML: el => el.getAttribute('data-label'),
                    renderHTML: attrs => (attrs.label ? {'data-label': attrs.label} : {}),
                },
                entityType: {
                    default: null,
                    parseHTML: el => el.getAttribute('data-entity-type'),
                    renderHTML: attrs => (attrs.entityType ? {'data-entity-type': attrs.entityType} : {}),
                },
            };
        },
    }).configure({
        HTMLAttributes: {class: 'entity-mention'},
        renderText({node}) {
            return `@${node.attrs.label}`;
        },
        suggestion: {
            char: '@',
            items: async ({query}: {query: string}) => {
                const all = await fetchEntities();
                const q = query.toLowerCase();
                return all
                    .filter(e => e.label.toLowerCase().includes(q) || (e.value ?? '').toLowerCase().includes(q))
                    .slice(0, 8);
            },
            command: ({editor, range, props}) => {
                const item = props as unknown as EntityItem;
                editor
                    .chain()
                    .focus()
                    .insertContentAt(range, [
                        {type: 'mention', attrs: {id: item.id, label: item.label, entityType: item.type}},
                        {type: 'text', text: ' '},
                    ])
                    .run();
            },
            render: () => {
                let component: ReactRenderer<MentionListRef, {items: EntityItem[]; command: (i: EntityItem) => void}>;
                let popup: HTMLDivElement | null = null;

                const teardown = () => {
                    popup?.remove();
                    popup = null;
                    component?.destroy();
                };

                return {
                    onStart: (props: SuggestionProps<EntityItem>) => {
                        component = new ReactRenderer(MentionList, {
                            props: {items: props.items, command: (item: EntityItem) => props.command(item)},
                            editor: props.editor,
                        });
                        popup = document.createElement('div');
                        popup.style.position = 'fixed';
                        popup.style.zIndex = '9999';
                        popup.appendChild(component.element);
                        document.body.appendChild(popup);
                        positionPopup(popup, props.clientRect as ClientRect);
                    },
                    onUpdate: (props: SuggestionProps<EntityItem>) => {
                        component.updateProps({items: props.items, command: (item: EntityItem) => props.command(item)});
                        if (popup) positionPopup(popup, props.clientRect as ClientRect);
                    },
                    onKeyDown: (props: SuggestionKeyDownProps) => {
                        if (props.event.key === 'Escape') {
                            teardown();
                            return true;
                        }
                        return component.ref?.onKeyDown({event: props.event}) ?? false;
                    },
                    onExit: () => {
                        teardown();
                    },
                };
            },
        },
    });
}
