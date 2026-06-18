import {useState, useEffect, useMemo, useCallback} from 'react';
import {X, ScanSearch, Server, Globe, Mail, Hash, ShieldAlert, Bitcoin, Plus, Check, Copy, Loader2} from 'lucide-react';
import {api} from '../../services/api';
import {useToast} from '../../contexts/ToastContext';
import {extractIocs, type Ioc, type IocKind} from '../../utils/ioc';

type IconCmp = React.ComponentType<{size?: number; className?: string}>;

const KIND_META: Record<IocKind, {label: string; icon: IconCmp; color: string}> = {
    ip:     {label: 'IP',       icon: Server,      color: '#ef4444'},
    domain: {label: 'Domaines', icon: Globe,       color: '#10b981'},
    email:  {label: 'Emails',   icon: Mail,        color: '#ec4899'},
    hash:   {label: 'Hashes',   icon: Hash,        color: '#a855f7'},
    cve:    {label: 'CVE',      icon: ShieldAlert, color: '#f97316'},
    crypto: {label: 'Crypto',   icon: Bitcoin,     color: '#eab308'},
};

const KIND_ORDER: IocKind[] = ['ip', 'domain', 'email', 'hash', 'cve', 'crypto'];

interface Props {
    investigationId: number;
    html: string;
    canEdit: boolean;
    onClose: () => void;
}

export const IocPanel = ({investigationId, html, canEdit, onClose}: Props) => {
    const {toast} = useToast();
    const [existing, setExisting] = useState<Set<string>>(new Set());
    const [added, setAdded] = useState<Set<string>>(new Set());
    const [addingKey, setAddingKey] = useState<string | null>(null);

    const iocs = useMemo(() => {
        const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
        return extractIocs(text);
    }, [html]);

    const grouped = useMemo(() => {
        const map = new Map<IocKind, Ioc[]>();
        for (const ioc of iocs) {
            const arr = map.get(ioc.kind) ?? [];
            arr.push(ioc);
            map.set(ioc.kind, arr);
        }
        return map;
    }, [iocs]);

    useEffect(() => {
        let cancelled = false;
        api.listEntities(investigationId)
            .then(({entities}) => {
                if (cancelled) return;
                const set = new Set<string>();
                for (const e of entities) {
                    if (e.value) set.add(e.value.toLowerCase());
                    if (e.label) set.add(e.label.toLowerCase());
                }
                setExisting(set);
            })
            .catch(() => { /* silencieux */ });
        return () => { cancelled = true; };
    }, [investigationId]);

    const keyOf = (ioc: Ioc) => `${ioc.kind}:${ioc.value.toLowerCase()}`;

    const handleAdd = useCallback(async (ioc: Ioc) => {
        const key = keyOf(ioc);
        setAddingKey(key);
        try {
            await api.createEntity(investigationId, {
                type: ioc.entityType,
                label: ioc.value,
                value: ioc.value,
            });
            setAdded(prev => new Set(prev).add(key));
            setExisting(prev => new Set(prev).add(ioc.value.toLowerCase()));
            toast('success', `Entité « ${ioc.value} » ajoutée au graphe`);
        } catch (err) {
            toast('error', err instanceof Error ? err.message : "Erreur lors de l'ajout");
        } finally {
            setAddingKey(null);
        }
    }, [investigationId, toast]);

    const handleCopy = (value: string) => {
        navigator.clipboard?.writeText(value).then(
            () => toast('success', 'Copié'),
            () => toast('error', 'Copie impossible'),
        );
    };

    return (
        <div className="w-80 flex-shrink-0 border-l border-primary/20 bg-card flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-primary/20">
                <ScanSearch size={15} className="text-primary"/>
                <span className="flex-1 text-sm font-medium text-accent">
                    Indicateurs (IOC)
                    <span className="ml-1.5 text-xs text-secondary">{iocs.length}</span>
                </span>
                <button onClick={onClose} className="text-secondary hover:text-accent transition-colors">
                    <X size={15}/>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
                {iocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ScanSearch size={26} className="text-secondary/50 mb-2"/>
                        <p className="text-secondary text-xs">Aucun indicateur détecté</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {KIND_ORDER.filter(k => grouped.has(k)).map(kind => {
                            const meta = KIND_META[kind];
                            const KindIcon = meta.icon;
                            const items = grouped.get(kind)!;
                            return (
                                <div key={kind}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <KindIcon size={12} className="shrink-0" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{color: meta.color}}>
                                            {meta.label}
                                        </span>
                                        <span className="text-[11px] text-secondary">{items.length}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {items.map(ioc => {
                                            const key = keyOf(ioc);
                                            const isAdded = added.has(key);
                                            const alreadyExists = existing.has(ioc.value.toLowerCase());
                                            const isAdding = addingKey === key;
                                            return (
                                                <div key={key} className="flex items-center gap-1.5 group">
                                                    <span className="flex-1 text-xs font-mono text-accent truncate" title={ioc.value}>
                                                        {ioc.value}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(ioc.value)}
                                                        title="Copier"
                                                        className="text-secondary hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                    >
                                                        <Copy size={12}/>
                                                    </button>
                                                    {canEdit && (
                                                        isAdded || alreadyExists ? (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 shrink-0" title={isAdded ? 'Ajoutée' : 'Déjà présente'}>
                                                                <Check size={12}/>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleAdd(ioc)}
                                                                disabled={isAdding}
                                                                title="Promouvoir en entité"
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-40 transition-colors shrink-0"
                                                            >
                                                                {isAdding ? <Loader2 size={11} className="animate-spin"/> : <Plus size={11}/>}
                                                                Entité
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
