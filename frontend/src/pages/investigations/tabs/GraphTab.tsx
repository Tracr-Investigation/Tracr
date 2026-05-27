import {useState, useEffect, useCallback, useRef} from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Connection,
    type Edge,
    type Node,
    type NodeTypes,
    Handle,
    Position,
    MarkerType,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {toPng} from 'html-to-image';
import {
    Plus,
    Trash2,
    Edit2,
    X,
    Network,
    User,
    Building2,
    Globe,
    Server,
    Phone,
    Mail,
    AtSign,
    MapPin,
    Calendar,
    HelpCircle,
    Download,
    ChevronDown,
    RotateCcw,
} from 'lucide-react';
import {api} from '../../../services/api';
import type {EntityData, RelationData} from '../../../services/api';
import {useToast} from '../../../contexts/ToastContext';
import {useTranslation} from 'react-i18next';

// ─── Entity types config ─────────────────────────────────────────────────────

const ENTITY_TYPES = [
    {value: 'person',       label: 'Person',        icon: User,       color: '#f59e0b'},
    {value: 'organization', label: 'Organization',   icon: Building2,  color: '#3b82f6'},
    {value: 'ip',           label: 'IP',             icon: Server,     color: '#ef4444'},
    {value: 'domain',       label: 'Domain',         icon: Globe,      color: '#10b981'},
    {value: 'phone',        label: 'Phone',          icon: Phone,      color: '#8b5cf6'},
    {value: 'email',        label: 'Email',          icon: Mail,       color: '#ec4899'},
    {value: 'account',      label: 'Account',        icon: AtSign,     color: '#06b6d4'},
    {value: 'location',     label: 'Location',       icon: MapPin,     color: '#84cc16'},
    {value: 'event',        label: 'Event',          icon: Calendar,   color: '#f97316'},
    {value: 'other',        label: 'Other',          icon: HelpCircle, color: '#6b7280'},
];

function getTypeConfig(type: string) {
    return ENTITY_TYPES.find(t => t.value === type) ?? ENTITY_TYPES[ENTITY_TYPES.length - 1];
}

// ─── Custom node ─────────────────────────────────────────────────────────────

const EntityNode = ({data}: {data: {entity: EntityData; onEdit: (e: EntityData) => void; onDelete: (e: EntityData) => void}}) => {
    const {entity, onEdit, onDelete} = data;
    const cfg = getTypeConfig(entity.type);
    const Icon = cfg.icon;
    const color = entity.color || cfg.color;

    return (
        <div
            className="group relative px-3 py-2.5 rounded-xl border-2 bg-card shadow-md min-w-[120px] max-w-[200px] cursor-default"
            style={{borderColor: `${color}70`}}
        >
            <Handle type="target" position={Position.Top}    className="!w-2.5 !h-2.5 !border-2" style={{borderColor: color, background: 'var(--color-bg-card)'}}/>
            <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2" style={{borderColor: color, background: 'var(--color-bg-card)'}}/>
            <Handle type="target" position={Position.Left}   className="!w-2.5 !h-2.5 !border-2" style={{borderColor: color, background: 'var(--color-bg-card)'}}/>
            <Handle type="source" position={Position.Right}  className="!w-2.5 !h-2.5 !border-2" style={{borderColor: color, background: 'var(--color-bg-card)'}}/>

            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{backgroundColor: `${color}25`}}>
                    <Icon size={12} style={{color}}/>
                </div>
                <div className="min-w-0">
                    <p className="text-text-default font-medium text-xs leading-tight truncate">{entity.label}</p>
                    {entity.value && (
                        <p className="text-text-muted text-[10px] truncate font-mono">{entity.value}</p>
                    )}
                </div>
            </div>

            <div className="absolute -top-7 right-0 hidden group-hover:flex gap-1 z-10">
                <button
                    onClick={() => onEdit(entity)}
                    className="w-6 h-6 rounded-md bg-card/30 border border-border-subtle flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 transition-all"
                >
                    <Edit2 size={10} className="text-text-muted"/>
                </button>
                <button
                    onClick={() => onDelete(entity)}
                    className="w-6 h-6 rounded-md bg-card/30 border border-border-subtle flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                >
                    <Trash2 size={10} className="text-red-400"/>
                </button>
            </div>
        </div>
    );
};

const nodeTypes: NodeTypes = {entity: EntityNode};

// ─── Entity panel (slide-in) ──────────────────────────────────────────────────

const EntityPanel = ({
    investigationId,
    entity,
    open,
    onClose,
    onSaved,
}: {
    investigationId: number;
    entity: EntityData | null;
    open: boolean;
    onClose: () => void;
    onSaved: (e: EntityData) => void;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const [type, setType]   = useState(entity?.type  ?? 'person');
    const [label, setLabel] = useState(entity?.label ?? '');
    const [value, setValue] = useState(entity?.value ?? '');
    const [notes, setNotes] = useState(entity?.notes ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setType(entity?.type  ?? 'person');
            setLabel(entity?.label ?? '');
            setValue(entity?.value ?? '');
            setNotes(entity?.notes ?? '');
        }
    }, [open, entity]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) return;
        setSaving(true);
        try {
            let saved: EntityData;
            if (entity) {
                saved = await api.updateEntity(investigationId, entity.id_entity, {
                    label: label.trim(),
                    value: value.trim() || null,
                    notes: notes.trim() || null,
                    clear_value: !value.trim(),
                    clear_notes: !notes.trim(),
                });
            } else {
                saved = await api.createEntity(investigationId, {
                    type,
                    label: label.trim(),
                    value: value.trim() || null,
                    notes: notes.trim() || null,
                });
            }
            onSaved(saved);
            onClose();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : t('investigationDetail.graph.errorSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />
            )}
            <div
                className={`fixed top-0 right-0 h-screen w-full max-w-[440px] z-50 flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)'}}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-text-default">
                            {entity
                                ? t('investigationDetail.graph.entityModal.editTitle')
                                : t('investigationDetail.graph.entityModal.newTitle')}
                        </h2>
                        {entity && <p className="text-xs text-text-dim mt-0.5">{entity.label}</p>}
                    </div>
                    <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1">
                        <X size={18}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    <div className="px-6 py-5 space-y-5 flex-1">
                        {/* Type selector — new entity only */}
                        {!entity && (
                            <div>
                                <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                    {t('investigationDetail.graph.entityModal.typeLabel')}
                                </label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {ENTITY_TYPES.map(etype => {
                                        const TIcon = etype.icon;
                                        return (
                                            <button
                                                key={etype.value}
                                                type="button"
                                                onClick={() => setType(etype.value)}
                                                title={etype.label}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all ${
                                                    type === etype.value
                                                        ? 'border-primary/60 bg-primary/10 text-white'
                                                        : 'border-border text-text-muted hover:border-border-focus'
                                                }`}
                                            >
                                                <TIcon size={14} style={{color: etype.color}}/>
                                                <span className="truncate w-full text-center">{etype.label.split(' ')[0]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Label */}
                        <div>
                            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                {t('investigationDetail.graph.entityModal.labelLabel')}
                            </label>
                            <input
                                autoFocus={open}
                                type="text"
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder={t('investigationDetail.graph.entityModal.labelPlaceholder')}
                                required
                                className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                            />
                        </div>

                        {/* Value */}
                        <div>
                            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                {t('investigationDetail.graph.entityModal.valueLabel')}
                            </label>
                            <input
                                type="text"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder={t('investigationDetail.graph.entityModal.valuePlaceholder')}
                                className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors font-mono"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                                {t('investigationDetail.graph.entityModal.notesLabel')}
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
                        >
                            {t('investigationDetail.graph.entityModal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !label.trim()}
                            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
                            style={{background: 'var(--theme-primary)'}}
                        >
                            {saving
                                ? t('investigationDetail.graph.entityModal.saving')
                                : entity
                                    ? t('investigationDetail.graph.entityModal.save')
                                    : t('investigationDetail.graph.entityModal.add')}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

// ─── Edge label panel (slide-in) ─────────────────────────────────────────────

const EdgeLabelPanel = ({
    open,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    onConfirm: (label: string) => void;
    onCancel: () => void;
}) => {
    const {t} = useTranslation();
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (open) setLabel('');
    }, [open]);

    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onCancel} />
            )}
            <div
                className={`fixed top-0 right-0 h-screen w-full max-w-[380px] z-50 flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)'}}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
                    <h2 className="text-base font-bold text-text-default">
                        {t('investigationDetail.graph.edgeLabelModal.title')}
                    </h2>
                    <button onClick={onCancel} className="text-text-dim hover:text-text-default transition-colors p-1">
                        <X size={18}/>
                    </button>
                </div>

                <div className="px-6 py-5 flex-1">
                    <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                        Libellé
                    </label>
                    <input
                        autoFocus={open}
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') onConfirm(label);
                            if (e.key === 'Escape') onCancel();
                        }}
                        placeholder={t('investigationDetail.graph.edgeLabelModal.placeholder')}
                        className="w-full px-4 py-2.5 bg-input-bg border border-border-subtle rounded-xl text-text-default text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                    />
                </div>

                <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
                    >
                        {t('investigationDetail.graph.edgeLabelModal.cancel')}
                    </button>
                    <button
                        onClick={() => onConfirm(label)}
                        className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all"
                        style={{background: 'var(--theme-primary)'}}
                    >
                        {t('investigationDetail.graph.edgeLabelModal.confirm')}
                    </button>
                </div>
            </div>
        </>
    );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildNodes(entities: EntityData[], onEdit: (e: EntityData) => void, onDelete: (e: EntityData) => void): Node[] {
    return entities.map((entity, idx) => ({
        id: String(entity.id_entity),
        type: 'entity',
        position: {
            x: entity.pos_x ?? (idx % 5) * 220 + 60,
            y: entity.pos_y ?? Math.floor(idx / 5) * 140 + 60,
        },
        data: {entity, onEdit, onDelete},
    }));
}

function buildEdges(relations: RelationData[]): Edge[] {
    return relations.map(r => ({
        id: String(r.id_relation),
        source: String(r.source_id),
        target: String(r.target_id),
        label: r.label ?? undefined,
        type: 'smoothstep',
        markerEnd: {type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#d97706'},
        style: {stroke: '#d97706', strokeWidth: 1.5, opacity: 0.8},
        labelStyle: {fill: '#9ca3af', fontSize: 10},
        labelBgStyle: {fill: '#1a1a1a', stroke: '#333'},
        data: {id_relation: r.id_relation},
    }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const GraphTab = ({
    investigationId,
    userPermission,
}: {
    investigationId: number;
    userPermission: string | null;
}) => {
    const {t} = useTranslation();
    const {toast} = useToast();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading]       = useState(true);
    const [showEntityModal, setShowEntityModal] = useState(false);
    const [editingEntity, setEditingEntity]     = useState<EntityData | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [showExportMenu, setShowExportMenu]   = useState(false);
    const [exporting, setExporting]             = useState(false);

    const entitiesRef   = useRef<EntityData[]>([]);
    const relationsRef  = useRef<RelationData[]>([]);
    const graphWrapRef  = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const canEdit = userPermission === 'owner' || userPermission === 'manager' || userPermission === 'editeur';

    // close export dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── callbacks (stable refs) ──────────────────────────────────────────────

    const handleEdit   = useCallback((entity: EntityData) => { setEditingEntity(entity); setShowEntityModal(true); }, []);
    const handleDelete = useCallback(async (entity: EntityData) => {
        if (!confirm(t('investigationDetail.graph.deleteEntityConfirm', {label: entity.label}))) return;
        try {
            await api.deleteEntity(investigationId, entity.id_entity);
            toast('success', t('investigationDetail.graph.entityDeleted'));
            await refreshGraph();
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [investigationId, t]);

    const refreshGraph = useCallback(async () => {
        try {
            const data = await api.getGraph(investigationId);
            entitiesRef.current  = data.nodes;
            relationsRef.current = data.edges;
            setNodes(buildNodes(data.nodes, handleEdit, handleDelete));
            setEdges(buildEdges(data.edges));
        } catch (err) {
            toast('error', err instanceof Error ? err.message : t('investigationDetail.graph.errorLoad'));
        }
    }, [investigationId, handleEdit, handleDelete, t]);

    useEffect(() => {
        (async () => { setLoading(true); await refreshGraph(); setLoading(false); })();
    }, [refreshGraph]);

    // ── connections ─────────────────────────────────────────────────────────

    const onConnect = useCallback((connection: Connection) => {
        if (canEdit) setPendingConnection(connection);
    }, [canEdit]);

    const handleEdgeLabelConfirm = async (label: string) => {
        if (!pendingConnection) return;
        setPendingConnection(null);
        try {
            await api.createRelation(investigationId, {
                source_id: Number(pendingConnection.source),
                target_id: Number(pendingConnection.target),
                label: label.trim() || null,
            });
            await refreshGraph();
            toast('success', t('investigationDetail.graph.linkCreated'));
        } catch (err) {
            toast('error', err instanceof Error ? err.message : t('investigationDetail.graph.errorLink'));
        }
    };

    const onEdgeClick = useCallback(async (_: React.MouseEvent, edge: Edge) => {
        if (!canEdit) return;
        if (!confirm(t('investigationDetail.graph.deleteLinkConfirm'))) return;
        try {
            await api.deleteRelation(investigationId, Number(edge.id));
            await refreshGraph();
            toast('success', t('investigationDetail.graph.linkDeleted'));
        } catch (err) {
            toast('error', err instanceof Error ? err.message : 'Error');
        }
    }, [canEdit, investigationId, refreshGraph, t]);

    const onNodeDragStop = useCallback(async (_: React.MouseEvent, node: Node) => {
        if (!canEdit) return;
        try {
            await api.updateEntity(investigationId, Number(node.id), {pos_x: node.position.x, pos_y: node.position.y});
        } catch { /* silent */ }
    }, [canEdit, investigationId]);

    // ── export ───────────────────────────────────────────────────────────────

    const exportPng = async () => {
        setShowExportMenu(false);
        if (!graphWrapRef.current) return;
        setExporting(true);
        try {
            const dataUrl = await toPng(graphWrapRef.current, {
                backgroundColor: '#0d0d0d',
                pixelRatio: 2,
            });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `graph-${investigationId}.png`;
            a.click();
        } catch {
            toast('error', 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const exportJson = () => {
        setShowExportMenu(false);
        const payload = {
            nodes: entitiesRef.current,
            edges: relationsRef.current,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `graph-${investigationId}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // ── render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="pt-6 flex items-center justify-center h-64 text-text-muted text-sm gap-2">
                <Network size={20} className="animate-pulse"/>
                {t('investigationDetail.graph.loading')}
            </div>
        );
    }

    return (
        <div className="pt-4">
            {/* React Flow Controls dark-theme CSS override */}
            <style>{`
                .react-flow__controls { background: transparent !important; }
                .react-flow__controls-button {
                    background: #1c1c1c !important;
                    border: 1px solid #333 !important;
                    border-bottom: 1px solid #333 !important;
                    color: #e5e5e5 !important;
                    fill: #e5e5e5 !important;
                }
                .react-flow__controls-button:hover {
                    background: #2a2a2a !important;
                }
                .react-flow__controls-button svg {
                    fill: #e5e5e5 !important;
                    max-width: 14px;
                }
                .react-flow__minimap {
                    background: #1c1c1c !important;
                    border: 1px solid #333 !important;
                    border-radius: 8px !important;
                }
            `}</style>

            <div ref={graphWrapRef} className="rounded-xl border border-border overflow-hidden" style={{height: '580px'}}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgeClick={onEdgeClick}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{padding: 0.3, maxZoom: 0.55}}
                    nodesDraggable={canEdit}
                    nodesConnectable={canEdit}
                    elementsSelectable
                    minZoom={0.2}
                    maxZoom={2}
                    style={{background: '#0d0d0d'}}
                >
                    <Background color="#2a2a2a" gap={20} size={1}/>
                    <Controls showInteractive={false}/>
                    <MiniMap
                        nodeColor={n => {
                            const entity = entitiesRef.current.find(e => String(e.id_entity) === n.id);
                            return entity ? (entity.color || getTypeConfig(entity.type).color) : '#444';
                        }}
                        maskColor="rgba(13,13,13,0.6)"
                    />

                    {/* Top-left: Add entity + Export */}
                    <Panel position="top-left">
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <button
                                    onClick={() => { setEditingEntity(null); setShowEntityModal(true); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-medium shadow transition-all"
                                >
                                    <Plus size={13}/>
                                    {t('investigationDetail.graph.addEntity')}
                                </button>
                            )}

                            {canEdit && (
                                <button
                                    onClick={async () => {
                                        if (!confirm(t('investigationDetail.graph.resetPositionsConfirm'))) return;
                                        try {
                                            await api.resetEntityPositions(investigationId);
                                            await refreshGraph();
                                            toast('success', t('investigationDetail.graph.positionsReset'));
                                        } catch (err) {
                                            toast('error', err instanceof Error ? err.message : 'Error');
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-input-bg border border-border text-text-default rounded-lg text-xs font-medium shadow transition-all"
                                    title={t('investigationDetail.graph.resetPositions')}
                                >
                                    <RotateCcw size={13}/>
                                </button>
                            )}

                            {/* Export dropdown */}
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setShowExportMenu(v => !v)}
                                    disabled={exporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-input-bg border border-border text-text-default rounded-lg text-xs font-medium shadow transition-all disabled:opacity-40"
                                >
                                    <Download size={13}/>
                                    {t('investigationDetail.graph.export')}
                                    <ChevronDown size={11}/>
                                </button>
                                {showExportMenu && (
                                    <div className="absolute top-full left-0 mt-1 z-20 bg-card/30 border border-border-subtle rounded-xl py-1 shadow-lg min-w-[160px]">
                                        <button
                                            onClick={exportPng}
                                            className="w-full px-3 py-2 text-left text-xs text-text-default hover:bg-primary/10 transition-colors flex items-center gap-2"
                                        >
                                            <Download size={12} className="text-primary"/>
                                            {t('investigationDetail.graph.exportPng')}
                                        </button>
                                        <button
                                            onClick={exportJson}
                                            className="w-full px-3 py-2 text-left text-xs text-text-default hover:bg-primary/10 transition-colors flex items-center gap-2"
                                        >
                                            <Download size={12} className="text-text-muted"/>
                                            {t('investigationDetail.graph.exportJson')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>

                    {nodes.length === 0 && (
                        <Panel position="top-center">
                            <div className="text-center mt-24 pointer-events-none">
                                <Network size={40} className="mx-auto text-[#444] mb-3"/>
                                <p className="text-[#ccc] font-medium mb-1">{t('investigationDetail.graph.empty')}</p>
                                <p className="text-[#666] text-sm">
                                    {canEdit ? t('investigationDetail.graph.emptyDesc') : t('investigationDetail.graph.emptyReadonly')}
                                </p>
                            </div>
                        </Panel>
                    )}
                </ReactFlow>
            </div>

            <p className="text-text-dim text-xs mt-2 text-center">
                {canEdit ? t('investigationDetail.graph.hint') : t('investigationDetail.graph.hintReadonly')}
            </p>

            <EntityPanel
                investigationId={investigationId}
                entity={editingEntity}
                open={showEntityModal}
                onClose={() => { setShowEntityModal(false); setEditingEntity(null); }}
                onSaved={async () => {
                    await refreshGraph();
                    toast('success', editingEntity
                        ? t('investigationDetail.graph.entityUpdated')
                        : t('investigationDetail.graph.entitySaved'));
                }}
            />

            <EdgeLabelPanel
                open={Boolean(pendingConnection)}
                onConfirm={handleEdgeLabelConfirm}
                onCancel={() => setPendingConnection(null)}
            />
        </div>
    );
};
