import {forwardRef, useEffect, useImperativeHandle, useState} from 'react';

export interface EntityItem {
    id: number;
    label: string;
    type: string;
    value: string | null;
}

export interface MentionListRef {
    onKeyDown: (props: {event: KeyboardEvent}) => boolean;
}

interface Props {
    items: EntityItem[];
    command: (item: EntityItem) => void;
}

// Color per entity type (aligned with ENTITY_TYPES in GraphTab).
const TYPE_COLOR: Record<string, string> = {
    person: '#f59e0b', organization: '#3b82f6', ip: '#ef4444', domain: '#10b981',
    phone: '#8b5cf6', email: '#ec4899', account: '#06b6d4', location: '#84cc16',
    event: '#f97316', other: '#6b7280',
};

export const MentionList = forwardRef<MentionListRef, Props>(({items, command}, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => { setSelected(0); }, [items]);

    const select = (index: number) => {
        const item = items[index];
        if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({event}) => {
            if (items.length === 0) return false;
            if (event.key === 'ArrowUp') {
                setSelected(s => (s + items.length - 1) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelected(s => (s + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                select(selected);
                return true;
            }
            return false;
        },
    }));

    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card shadow-xl px-3 py-2 text-xs text-text-dim">
                Aucune entité
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card shadow-xl py-1 min-w-[200px] max-w-[280px] max-h-[260px] overflow-y-auto">
            {items.map((item, index) => (
                <button
                    key={item.id}
                    onClick={() => select(index)}
                    onMouseEnter={() => setSelected(index)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                        index === selected ? 'bg-primary/10' : ''
                    }`}
                >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background: TYPE_COLOR[item.type] ?? '#6b7280'}}/>
                    <span className="text-sm text-text-default truncate flex-1">{item.label}</span>
                    {item.value && (
                        <span className="text-[10px] font-mono text-text-dim truncate max-w-[90px]">{item.value}</span>
                    )}
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';
