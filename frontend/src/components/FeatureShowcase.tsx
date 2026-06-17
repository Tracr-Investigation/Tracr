import { useState, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckSquare, Users, Settings, Network, Globe, Lock } from 'lucide-react';

// ─── Graph preview ────────────────────────────────────────────────────────────

const NW = 105, NH = 32;

// 9 nodes - realistic OSINT investigation map
const GN = [
    { x: 225, y: 145, type: 'person',       color: '#f59e0b', label: 'Alice Smith',    value: '@alice_s' },
    { x: 420, y: 100, type: 'person',       color: '#f59e0b', label: 'Bob Chen',       value: ''        },
    { x: 80,  y: 22,  type: 'domain',       color: '#10b981', label: 'malware-c2.net', value: ''        },
    { x: 380, y: 22,  type: 'domain',       color: '#10b981', label: 'corp-vpn.io',    value: ''        },
    { x: 12,  y: 133, type: 'email',        color: '#ec4899', label: 'alice@corp.com', value: ''        },
    { x: 460, y: 185, type: 'ip',           color: '#ef4444', label: '45.33.32.156',   value: ''        },
    { x: 225, y: 265, type: 'ip',           color: '#ef4444', label: '192.168.12.8',   value: ''        },
    { x: 28,  y: 255, type: 'organization', color: '#3b82f6', label: 'ThreatCorp',     value: ''        },
    { x: 420, y: 265, type: 'account',      color: '#06b6d4', label: '@a_smith1337',   value: ''        },
] as const;

const GE = [
    { d: 'M 277.5 145 C 277.5 97 132.5 97 132.5 54',       delay: 0.3  },
    { d: 'M 330 161 C 362 161 362 116 420 116',             delay: 0.45 },
    { d: 'M 225 161 C 158 161 158 149 117 149',             delay: 0.6  },
    { d: 'M 277.5 177 L 277.5 265',                         delay: 0.75 },
    { d: 'M 277.5 177 C 277.5 214 80.5 214 80.5 255',       delay: 0.9  },
    { d: 'M 472.5 100 C 472.5 75 432.5 75 432.5 54',        delay: 1.05 },
    { d: 'M 472.5 132 C 472.5 156 512.5 156 512.5 185',     delay: 1.2  },
    { d: 'M 185 38 L 380 38',                               delay: 1.35 },
    { d: 'M 512.5 217 C 512.5 239 472.5 239 472.5 265',     delay: 1.5  },
    { d: 'M 330 281 L 420 281',                             delay: 1.65 },
] as const;

function NodeIcon({ type, color, nx, ny }: { type: string; color: string; nx: number; ny: number }) {
    const cx = nx + 14, cy = ny + 16;

    if (type === 'person') return (
        <g>
            <circle cx={cx} cy={cy - 2.5} r="2.8" fill={color}/>
            <path d={`M ${cx-5} ${cy+6} Q ${cx} ${cy+2} ${cx+5} ${cy+6}`} stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </g>
    );

    if (type === 'domain') return (
        <g>
            <circle cx={cx} cy={cy} r="5" fill="none" stroke={color} strokeWidth="1.1"/>
            <line x1={cx-5} y1={cy} x2={cx+5} y2={cy} stroke={color} strokeWidth="0.9"/>
            <ellipse cx={cx} cy={cy} rx="2.5" ry="5" fill="none" stroke={color} strokeWidth="0.9"/>
        </g>
    );

    if (type === 'ip') return (
        <g>
            <rect x={cx-5} y={cy-4.5} width="10" height="3" rx="1" fill="none" stroke={color} strokeWidth="1.1"/>
            <rect x={cx-5} y={cy+1.5} width="10" height="3" rx="1" fill="none" stroke={color} strokeWidth="1.1"/>
            <circle cx={cx+2.5} cy={cy-3} r="0.7" fill={color}/>
            <circle cx={cx+2.5} cy={cy+3} r="0.7" fill={color}/>
        </g>
    );

    if (type === 'email') return (
        <g>
            <rect x={cx-5} y={cy-3.5} width="10" height="7.5" rx="1.2" fill="none" stroke={color} strokeWidth="1.1"/>
            <polyline points={`${cx-5},${cy-3.5} ${cx},${cy+0.5} ${cx+5},${cy-3.5}`} fill="none" stroke={color} strokeWidth="1.1"/>
        </g>
    );

    if (type === 'account') return (
        <text x={cx} y={cy+3.5} textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="monospace">@</text>
    );

    return (
        <g>
            <rect x={cx-4} y={cy-5} width="8" height="10" rx="0.5" fill="none" stroke={color} strokeWidth="1.1"/>
            <rect x={cx-2} y={cy+1} width="4" height="4" rx="0.5" fill="none" stroke={color} strokeWidth="0.9"/>
            <line x1={cx-4} y1={cy-0.5} x2={cx+4} y2={cy-0.5} stroke={color} strokeWidth="0.8"/>
        </g>
    );
}

function GraphPreview() {
    return (
        <div style={{ height: '100%' }}>
            <svg viewBox="0 0 620 330" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
                <defs>
                    <pattern id="pgdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.7" fill="#232323"/>
                    </pattern>
                    <marker id="pgarr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                        <path d="M 0 1 L 5 3.5 L 0 6 Z" fill="#484848"/>
                    </marker>
                </defs>

                <rect width="620" height="330" fill="#111"/>
                <rect width="620" height="330" fill="url(#pgdots)"/>

                {GE.map((e, i) => (
                    <path
                        key={i}
                        d={e.d}
                        fill="none"
                        stroke="#3e3e3e"
                        strokeWidth="1.2"
                        markerEnd="url(#pgarr)"
                        pathLength="1"
                        strokeDasharray="1"
                        strokeDashoffset="1"
                        style={{ animation: 'pgDraw 0.55s ease forwards', animationDelay: `${e.delay}s` }}
                    />
                ))}

                {GN.map((n, i) => (
                    <g key={i} opacity="0" style={{ animation: 'pgFade 0.35s ease forwards', animationDelay: `${0.05 + i * 0.08}s` }}>
                        <rect
                            x={n.x}
                            y={n.y}
                            width={NW}
                            height={NH}
                            rx="8"
                            fill="#1c1c1c"
                            stroke={n.color + '80'}
                            strokeWidth="1.5"
                        />

                        <rect x={n.x + 5} y={n.y + 6} width="22" height="20" rx="5" fill={n.color + '1e'}/>

                        <NodeIcon type={n.type} color={n.color} nx={n.x} ny={n.y}/>

                        <circle cx={n.x + NW / 2} cy={n.y}          r="2.5" fill="#1c1c1c" stroke={n.color + 'a0'} strokeWidth="1.3"/>
                        <circle cx={n.x + NW / 2} cy={n.y + NH}     r="2.5" fill="#1c1c1c" stroke={n.color + 'a0'} strokeWidth="1.3"/>
                        <circle cx={n.x}        cy={n.y + NH / 2}   r="2.5" fill="#1c1c1c" stroke={n.color + 'a0'} strokeWidth="1.3"/>
                        <circle cx={n.x + NW}   cy={n.y + NH / 2}   r="2.5" fill="#1c1c1c" stroke={n.color + 'a0'} strokeWidth="1.3"/>

                        <text
                            x={n.x + 33}
                            y={n.y + 14}
                            fontSize="7.5"
                            fontWeight="600"
                            fill="#e5e5e5"
                            fontFamily="-apple-system,BlinkMacSystemFont,'Inter',sans-serif"
                        >
                            {n.label}
                        </text>

                        {n.value ? (
                            <text
                                x={n.x + 33}
                                y={n.y + 25}
                                fontSize="6.5"
                                fill="#777"
                                fontFamily="'IBM Plex Mono',monospace"
                            >
                                {n.value}
                            </text>
                        ) : null}
                    </g>
                ))}

                <style>{`
                    @keyframes pgDraw { to { stroke-dashoffset: 0; } }
                    @keyframes pgFade { from { opacity: 0; } to { opacity: 1; } }
                `}</style>
            </svg>
        </div>
    );
}

// ─── Timeline preview (same structure as TimelineTab) ─────────────────────────

const TL_CONFIG: Record<string, { icon: typeof Settings; color: string; bg: string }> = {
    investigation: { icon: Settings,    color: 'text-primary',    bg: 'bg-primary/15'    },
    document:      { icon: FileText,    color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
    task:          { icon: CheckSquare, color: 'text-green-400',  bg: 'bg-green-500/15'  },
    collaboration: { icon: Users,       color: 'text-amber-400',  bg: 'bg-amber-500/15'  },
    entity:        { icon: Network,     color: 'text-violet-400', bg: 'bg-violet-500/15' },
};

const TL_EVENTS = [
    { category: 'investigation', action: 'Investigation created',       pseudo: 'alice', time: '5m ago',  detail: null },
    { category: 'document',      action: 'Document added',              pseudo: 'alice', time: '23m ago', detail: 'Report Q3' },
    { category: 'entity',        action: 'Entity created',              pseudo: 'bob',   time: '1h ago',  detail: 'Alice Smith (person)' },
    { category: 'entity',        action: 'Link created',                pseudo: 'bob',   time: '1h ago',  detail: 'Alice Smith → malware-c2.net' },
    { category: 'task',          action: 'Task created',                pseudo: 'alice', time: '2h ago',  detail: 'Identify threat actors' },
    { category: 'collaboration', action: 'Collaborator invited',        pseudo: 'alice', time: '3h ago',  detail: 'bob - Editor' },
    { category: 'document',      action: 'Exported to PDF',             pseudo: 'alice', time: '5h ago',  detail: null },
    { category: 'task',          action: 'Task updated',                pseudo: 'bob',   time: '6h ago',  detail: 'Status → In progress' },
    { category: 'investigation', action: 'Status changed',              pseudo: 'alice', time: '1d ago',  detail: 'Open → In progress' },
    { category: 'entity',        action: 'Entity created',              pseudo: 'alice', time: '1d ago',  detail: '45.33.32.156 (ip)' },
];

function TimelinePreview() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
                <span className="text-text-default text-xs font-semibold">Activity</span>
                <span className="text-text-dim text-[10px]">10 events total</span>
            </div>
            <div className="pt-3 px-3 overflow-hidden flex-1">
                <div className="relative">
                    <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border-subtle"/>
                    <div className="space-y-0">
                        {TL_EVENTS.map((ev, i) => {
                            const cfg = TL_CONFIG[ev.category];
                            const Icon = cfg.icon;
                            return (
                                <div key={i} className="relative flex gap-4">
                                    <div className={`relative z-10 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5 border border-border`}>
                                        <Icon size={14} className={cfg.color}/>
                                    </div>
                                    <div className="flex-1 pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-text-default text-xs font-medium">{ev.action}</span>
                                            <span className="text-text-dim text-xs shrink-0">{ev.time}</span>
                                        </div>
                                        {ev.detail
                                            ? <p className="text-text-muted text-[10px] font-mono mt-0.5">{ev.detail}</p>
                                            : <span className="text-text-muted text-xs">by <span className="text-text-default font-medium">{ev.pseudo}</span></span>
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Tasks preview ────────────────────────────────────────────────────────────

const P_COLOR: Record<string, string> = { urgente: '#ef4444', haute: '#f97316', normale: '#6b7280', basse: '#22c55e' };
const P_LABEL: Record<string, string> = { urgente: 'Urgent', haute: 'High', normale: 'Normal', basse: 'Low' };

const TASKS = [
    { label: 'Analyze network logs',            priority: 'haute',   done: false, av: 'A', due: 'Today' },
    { label: 'Document initial findings',       priority: 'normale', done: true,  av: 'B', due: '-'    },
    { label: 'Identify threat actors',          priority: 'urgente', done: false, av: '',  due: '2d'    },
    { label: 'Map C2 infrastructure',           priority: 'haute',   done: false, av: 'B', due: '3d'   },
    { label: 'Interview key witnesses',         priority: 'normale', done: true,  av: 'A', due: '-'    },
    { label: 'Cross-reference IP addresses',    priority: 'haute',   done: false, av: '',  due: '4d'   },
    { label: 'Prepare final report',            priority: 'basse',   done: false, av: 'A', due: '7d'   },
];

function TasksPreview() {
    const done = TASKS.filter(t => t.done).length;
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-text-default text-xs font-semibold">Tasks</span>
                    <div className="flex gap-1">
                        {['All', 'Todo', 'Done'].map((f, i) => (
                            <span key={f} className={`text-[10px] px-2 py-0.5 rounded ${i === 0 ? 'bg-primary/15 text-primary' : 'text-text-dim'}`}>{f}</span>
                        ))}
                    </div>
                </div>
                <span className="text-text-dim text-[10px]">{done}/{TASKS.length} done</span>
            </div>
            <div className="h-0.5 bg-border shrink-0">
                <div className="h-full bg-primary/60 transition-all" style={{ width: `${(done / TASKS.length) * 100}%` }}/>
            </div>
            <div className="p-2 space-y-1.5 overflow-hidden flex-1">
                {TASKS.map((t, i) => (
                    <div key={i} className={`bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3 ${t.done ? 'opacity-40' : ''}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${t.done ? 'border-green-500 bg-green-500/15' : 'border-border'}`}>
                            {t.done && (
                                <svg viewBox="0 0 12 12" width="8" height="8">
                                    <polyline points="2,6 5,9 10,3" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                </svg>
                            )}
                        </div>
                        <span className={`flex-1 text-xs ${t.done ? 'line-through text-text-muted' : 'text-text-default font-medium'}`}>
                            {t.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                            style={{ color: P_COLOR[t.priority], background: P_COLOR[t.priority] + '18' }}>
                            {P_LABEL[t.priority]}
                        </span>
                        {t.av && (
                            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] text-primary font-bold shrink-0">
                                {t.av}
                            </div>
                        )}
                        <span className="text-text-dim text-[10px] shrink-0 w-8 text-right">{t.due}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Document preview ─────────────────────────────────────────────────────────

function DocumentPreview() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="px-3 py-1.5 border-b border-border flex items-center gap-1 shrink-0 bg-card">
                {['B','I','U','|','H₁','H₂','|','≡','•','-'].map((b, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] ${b === '|' ? 'text-border mx-0.5' : 'text-text-dim hover:text-text-muted'}`}
                        style={{ fontWeight: b === 'B' ? 700 : 400, fontStyle: b === 'I' ? 'italic' : 'normal' }}>
                        {b}
                    </span>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500/30 border border-blue-500/50 flex items-center justify-center text-[8px] text-blue-400 font-bold">B</div>
                    <span className="text-text-dim text-[10px]">Bob is editing</span>
                </div>
            </div>
            <div className="p-5 overflow-hidden flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-text-dim text-[10px] uppercase tracking-widest">Investigation Report</span>
                    <span className="text-text-dim text-[10px]">alice · Q3 2024</span>
                </div>
                <h1 className="text-text-default font-bold text-base mb-3 leading-tight">Operation Shadow Net</h1>
                <p className="text-text-muted text-xs leading-relaxed mb-4">
                    Following the initial assessment of the infrastructure, several suspicious connections
                    were identified between the primary domain and a network of external IPs attributed
                    to a known threat actor group.
                </p>
                <p className="text-text-dim text-[10px] uppercase tracking-widest font-semibold mb-2">Key Findings</p>
                {[
                    'C2 domain malware-c2.net resolved to 45.33.32.156',
                    'Email exfiltration identified via alice@corp.com',
                    'Lateral movement detected across internal network',
                    'Account @a_smith1337 linked to ThreatCorp infrastructure',
                ].map((line, i) => (
                    <div key={i} className="flex gap-2 mb-1.5">
                        <span className="text-primary text-xs shrink-0 mt-0.5">•</span>
                        <span className="text-text-muted text-xs">{line}</span>
                    </div>
                ))}
                <p className="text-text-dim text-[10px] uppercase tracking-widest font-semibold mt-4 mb-2">Indicators of Compromise</p>
                <div className="space-y-1">
                    {[
                        { type: 'Domain', value: 'malware-c2.net' },
                        { type: 'IP',     value: '45.33.32.156'   },
                        { type: 'Email',  value: 'alice@corp.com' },
                    ].map((ioc, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-text-dim text-[10px] w-12 shrink-0">{ioc.type}</span>
                            <span className="text-text-muted text-[10px] font-mono">{ioc.value}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center mt-4 gap-1.5">
                    <span className="text-text-muted text-xs">Recommendations: </span>
                    <span className="inline-block w-0.5 h-3 bg-blue-400" style={{ animation: 'docBlink 1.1s step-end infinite' }}/>
                </div>
            </div>
            <style>{`@keyframes docBlink { 0%,100% { opacity:1; } 50% { opacity:0; } }`}</style>
        </div>
    );
}

// ─── Source capture preview (extension → enquête) ─────────────────────────────

/** Petit logo Tracr (motif graphe) réutilisé dans le bouton d'extension. */
function TracrMark({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 70 70" aria-hidden="true">
            <line x1="15" y1="15" x2="35" y2="35" stroke="var(--theme-primary)" strokeWidth="3" opacity="0.7"/>
            <line x1="35" y1="35" x2="55" y2="20" stroke="var(--theme-primary)" strokeWidth="3" opacity="0.7"/>
            <line x1="35" y1="35" x2="50" y2="55" stroke="var(--theme-primary)" strokeWidth="3" opacity="0.7"/>
            <circle cx="15" cy="15" r="6" fill="var(--theme-primary)"/>
            <circle cx="55" cy="20" r="6" fill="var(--theme-primary)"/>
            <circle cx="50" cy="55" r="5" fill="white" opacity="0.85"/>
            <circle cx="35" cy="35" r="7" fill="var(--theme-secondary)"/>
        </svg>
    );
}

/**
 * Illustre le flux d'archivage des sources OSINT : une image/donnée est
 * sélectionnée sur une page web par l'extension Tracr, transférée et scellée dans
 * les sources de l'enquête, puis insérée dans le rapport (documentation).
 * Boucle de 6 s synchronisée avec la rotation des onglets.
 */
function SourceCapturePreview() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#111' }}>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-text-default text-xs font-semibold">Source capture</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">Extension</span>
                </div>
                <span className="text-text-dim text-[10px]">Capture → source → report</span>
            </div>

            <div
                style={{
                    flex: 1, display: 'flex', alignItems: 'stretch', gap: 0,
                    padding: '16px 18px', position: 'relative', overflow: 'hidden',
                    backgroundImage: 'radial-gradient(circle, #1d1d1d 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                }}
            >
                {/* ── Navigateur + extension ── */}
                <div style={{
                    flex: '1.45', minWidth: 0, display: 'flex', flexDirection: 'column',
                    background: '#181818', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden',
                }}>
                    {/* Barre de fenêtre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 9px', borderBottom: '1px solid #262626', background: '#141414' }}>
                        {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                            <span key={c} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c, opacity: 0.7 }} />
                        ))}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px', background: '#0c0c0c', border: '1px solid #2a2a2a', borderRadius: '5px', padding: '3px 7px' }}>
                            <Lock size={8} style={{ color: '#666', flexShrink: 0 }} />
                            <span style={{ fontSize: '8px', fontFamily: "'IBM Plex Mono',monospace", color: '#9a9a9a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                malware-c2.net/threat-actor
                            </span>
                        </div>
                        {/* Bouton extension Tracr + anneau de capture */}
                        <div style={{ position: 'relative', width: '21px', height: '21px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--theme-primary) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-primary) 38%, transparent)', borderRadius: '5px' }}>
                            <TracrMark size={13} />
                            <span className="srccap-ring" style={{ position: 'absolute', inset: '-3px', border: '1.5px solid var(--theme-primary)', borderRadius: '7px', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* Contenu de la page */}
                    <div style={{ position: 'relative', flex: 1, padding: '11px 12px', overflow: 'hidden' }}>
                        <div style={{ width: '46%', height: '7px', borderRadius: '3px', background: '#383838', marginBottom: '7px' }} />
                        <div style={{ width: '72%', height: '5px', borderRadius: '3px', background: '#272727', marginBottom: '10px' }} />

                        {/* Image/donnée à capturer + marquee de sélection */}
                        <div style={{ position: 'relative', marginBottom: '9px' }}>
                            <div style={{ position: 'relative', width: '100%', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'linear-gradient(135deg, #2a2333, #1a1a22)', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="100%" height="100%" viewBox="0 0 200 44" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                                    <circle cx="150" cy="10" r="9" fill="#f59e0b" opacity="0.5" />
                                    <path d="M 0 44 L 55 18 L 95 34 L 140 12 L 200 30 L 200 44 Z" fill="#3a3550" />
                                    <path d="M 0 44 L 70 28 L 120 38 L 200 20 L 200 44 Z" fill="#2a2740" />
                                </svg>
                                <Globe size={15} style={{ color: 'var(--theme-secondary)', opacity: 0.55, position: 'relative' }} />
                                <span className="srccap-flash" style={{ position: 'absolute', inset: 0, background: 'var(--theme-primary)' }} />
                            </div>
                            {/* Cadre de sélection animé */}
                            <span className="srccap-marquee" style={{ position: 'absolute', inset: '-3px', border: '1.5px solid var(--theme-primary)', borderRadius: '7px', pointerEvents: 'none', boxShadow: '0 0 12px color-mix(in srgb, var(--theme-primary) 45%, transparent)' }}>
                                {([
                                    { top: -2, left: -2 },
                                    { top: -2, right: -2 },
                                    { bottom: -2, left: -2 },
                                    { bottom: -2, right: -2 },
                                ] as React.CSSProperties[]).map((pos, i) => (
                                    <span key={i} style={{ position: 'absolute', width: '4px', height: '4px', background: 'var(--theme-primary)', borderRadius: '1px', ...pos }} />
                                ))}
                            </span>
                        </div>

                        <div style={{ width: '88%', height: '4px', borderRadius: '2px', background: '#242424', marginBottom: '5px' }} />
                        <div style={{ width: '60%', height: '4px', borderRadius: '2px', background: '#202020' }} />

                        {/* Chip « Capture » */}
                        <div className="srccap-chip" style={{ position: 'absolute', right: '9px', bottom: '9px', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', background: 'color-mix(in srgb, var(--theme-primary) 18%, #111)', border: '1px solid color-mix(in srgb, var(--theme-primary) 40%, transparent)', borderRadius: '20px' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--theme-primary)' }} />
                            <span style={{ fontSize: '8px', fontWeight: 600, color: 'var(--theme-primary)' }}>Capture</span>
                        </div>
                    </div>
                </div>

                {/* ── Lien + paquet en transit ── */}
                <div style={{ width: '58px', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', left: '5px', right: '5px', top: '50%', height: '1.5px', transform: 'translateY(-50%)', background: 'repeating-linear-gradient(90deg, #3a3a3a 0 4px, transparent 4px 9px)' }} />
                    <div className="srccap-packet" style={{ position: 'absolute', top: '50%', left: '4px', width: '20px', height: '20px', marginTop: '-10px', borderRadius: '5px', background: '#161616', border: '1px solid var(--theme-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px color-mix(in srgb, var(--theme-primary) 55%, transparent)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M 21 15 L 16 10 L 5 21" />
                        </svg>
                    </div>
                </div>

                {/* ── Enquête : source scellée → rapport ── */}
                <div style={{ flex: '1.3', minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: '#181818', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 11px', borderBottom: '1px solid #262626', background: '#141414' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TracrMark size={13} />
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-default)' }}>Operation Shadow Net</span>
                        </div>
                        <div style={{ fontSize: '8px', color: '#777', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Case file</div>
                    </div>

                    <div style={{ flex: 1, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: '5px', overflow: 'hidden' }}>
                        {/* Étape 1 - ajoutée aux sources */}
                        <div style={{ fontSize: '7.5px', color: '#6a6a6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sources</div>
                        <div className="srccap-card" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'color-mix(in srgb, var(--theme-primary) 9%, #161616)', border: '1px solid color-mix(in srgb, var(--theme-primary) 38%, transparent)', borderRadius: '8px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #2a2333, #1a1a22)', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Globe size={10} style={{ color: 'var(--theme-secondary)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '8.5px', color: 'var(--text-default)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>malware-c2.net · capture.png</div>
                                <div style={{ fontSize: '7px', color: '#888', fontFamily: "'IBM Plex Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>sha256 a3f9…7b2e</div>
                            </div>
                            <span className="srccap-seal" style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 5px', background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '20px', flexShrink: 0 }}>
                                <Lock size={8} style={{ color: '#22c55e' }} />
                                <span style={{ fontSize: '7px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.04em' }}>SEALED</span>
                            </span>
                        </div>

                        {/* Flèche - insertion dans le rapport */}
                        <div className="srccap-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '1px 0' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M 7 7 L 12 12 L 17 7" />
                                <path d="M 7 14 L 12 19 L 17 14" />
                            </svg>
                            <span style={{ fontSize: '7.5px', fontWeight: 600, color: 'var(--theme-primary)' }}>added to report</span>
                        </div>

                        {/* Étape 2 - documentation / rapport */}
                        <div style={{ flex: 1, minHeight: 0, background: '#141414', border: '1px solid #262626', borderRadius: '8px', padding: '8px 9px', overflow: 'hidden' }}>
                            <div style={{ fontSize: '7px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px' }}>Report · Operation Shadow Net</div>
                            <div style={{ width: '85%', height: '4px', borderRadius: '2px', background: '#2a2a2a', marginBottom: '4px' }} />
                            <div style={{ width: '66%', height: '4px', borderRadius: '2px', background: '#222', marginBottom: '6px' }} />
                            {/* Figure intégrée dans le document */}
                            <figure className="srccap-figure" style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: 0, padding: '5px', background: '#181818', border: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)', borderRadius: '6px' }}>
                                <div style={{ width: '26px', height: '20px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #2a2333, #1a1a22)', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Globe size={10} style={{ color: 'var(--theme-secondary)' }} />
                                </div>
                                <figcaption style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '7.5px', fontWeight: 600, color: 'var(--text-default)' }}>Fig. 1 - capture.png</div>
                                    <div style={{ fontSize: '6.5px', color: '#777', fontFamily: "'IBM Plex Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>source · malware-c2.net</div>
                                </figcaption>
                            </figure>
                            <div style={{ width: '78%', height: '4px', borderRadius: '2px', background: '#222', marginTop: '6px' }} />
                        </div>
                    </div>

                    {/* Vignette fantôme : descend des sources vers le rapport */}
                    <div className="srccap-drop" style={{ position: 'absolute', left: '16px', top: '34%', width: '18px', height: '18px', borderRadius: '4px', overflow: 'hidden', background: 'linear-gradient(135deg, #2a2333, #1a1a22)', border: '1px solid var(--theme-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--theme-primary) 55%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={10} style={{ color: 'var(--theme-secondary)' }} />
                    </div>
                </div>
            </div>

            <style>{`
                .srccap-ring    { animation: srccapRing 6s ease-in-out infinite; }
                .srccap-marquee { animation: srccapMarquee 6s ease-in-out infinite; }
                .srccap-flash   { animation: srccapFlash 6s ease-in-out infinite; opacity: 0; }
                .srccap-chip    { animation: srccapChip 6s ease-in-out infinite; opacity: 0; }
                .srccap-packet  { animation: srccapPacket 6s ease-in-out infinite; opacity: 0; }
                .srccap-card    { animation: srccapCard 6s ease-in-out infinite; opacity: 0; }
                .srccap-seal    { animation: srccapSeal 6s ease-in-out infinite; opacity: 0; transform-origin: center; }
                .srccap-arrow   { animation: srccapArrow 6s ease-in-out infinite; opacity: 0; }
                .srccap-drop    { animation: srccapDrop 6s ease-in-out infinite; opacity: 0; }
                .srccap-figure  { animation: srccapFigure 6s ease-in-out infinite; opacity: 0; transform-origin: left center; }

                @keyframes srccapRing {
                    0%, 3%   { opacity: 0; transform: scale(0.65); }
                    11%      { opacity: 0.85; transform: scale(1); }
                    22%      { opacity: 0; transform: scale(1.3); }
                    100%     { opacity: 0; }
                }
                @keyframes srccapMarquee {
                    0%, 4%   { opacity: 0; transform: scale(1.06); }
                    10%, 24% { opacity: 1; transform: scale(1); }
                    29%      { opacity: 0; transform: scale(0.96); }
                    100%     { opacity: 0; }
                }
                @keyframes srccapFlash {
                    0%, 21%  { opacity: 0; }
                    24%      { opacity: 0.55; }
                    30%      { opacity: 0; }
                    100%     { opacity: 0; }
                }
                @keyframes srccapChip {
                    0%, 4%   { opacity: 0; transform: translateY(3px); }
                    9%, 25%  { opacity: 1; transform: translateY(0); }
                    30%      { opacity: 0; transform: translateY(3px); }
                    100%     { opacity: 0; }
                }
                @keyframes srccapPacket {
                    0%, 28%  { opacity: 0; left: 4px;  transform: scale(0.7); }
                    32%      { opacity: 1; transform: scale(1); }
                    46%      { opacity: 1; left: 34px; transform: scale(1); }
                    51%      { opacity: 0; left: 34px; transform: scale(0.7); }
                    100%     { opacity: 0; left: 4px; }
                }
                @keyframes srccapCard {
                    0%, 46%  { opacity: 0; transform: translateX(10px) scale(0.97); }
                    54%      { opacity: 1; transform: translateX(0) scale(1); }
                    96%      { opacity: 1; transform: translateX(0) scale(1); }
                    100%     { opacity: 0; transform: translateX(10px) scale(0.97); }
                }
                @keyframes srccapSeal {
                    0%, 54%  { opacity: 0; transform: scale(1.7) rotate(-10deg); }
                    61%      { opacity: 1; transform: scale(1) rotate(-10deg); }
                    96%      { opacity: 1; transform: scale(1) rotate(-10deg); }
                    100%     { opacity: 0; transform: scale(1) rotate(-10deg); }
                }
                @keyframes srccapArrow {
                    0%, 60%  { opacity: 0; transform: translateY(-2px); }
                    67%      { opacity: 1; transform: translateY(0); }
                    84%      { opacity: 1; transform: translateY(0); }
                    90%      { opacity: 0; transform: translateY(2px); }
                    100%     { opacity: 0; }
                }
                @keyframes srccapDrop {
                    0%, 61%  { opacity: 0; top: 34%; transform: scale(0.8); }
                    66%      { opacity: 1; top: 34%; transform: scale(1); }
                    80%      { opacity: 1; top: 72%; transform: scale(1); }
                    84%      { opacity: 0; top: 72%; transform: scale(0.8); }
                    100%     { opacity: 0; top: 34%; }
                }
                @keyframes srccapFigure {
                    0%, 78%  { opacity: 0; transform: translateY(4px) scale(0.95); }
                    86%      { opacity: 1; transform: translateY(0) scale(1); }
                    96%      { opacity: 1; transform: translateY(0) scale(1); }
                    100%     { opacity: 0; transform: translateY(4px) scale(0.95); }
                }
            `}</style>
        </div>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { key: string; Component: () => ReactElement }[] = [
    { key: 'graph',     Component: GraphPreview },
    { key: 'sources',   Component: SourceCapturePreview },
    { key: 'documents', Component: DocumentPreview },
    { key: 'timeline',  Component: TimelinePreview },
    { key: 'tasks',     Component: TasksPreview },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export const FeatureShowcase = () => {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const ActivePreview = TABS[active].Component;

    useEffect(() => {
        const id = setInterval(() => setActive(p => (p + 1) % TABS.length), 7000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 32px 0 56px' }}>
            <div style={{ paddingTop: '44px', paddingBottom: '20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', flexShrink: 0, background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', borderRadius: '11px', border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <g transform="translate(15,15)">
                                <line x1="15" y1="15" x2="35" y2="35" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
                                <line x1="35" y1="35" x2="55" y2="20" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
                                <line x1="35" y1="35" x2="50" y2="55" stroke="var(--theme-primary)" strokeWidth="2" opacity="0.6"/>
                                <line x1="15" y1="15" x2="55" y2="20" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.3"/>
                                <line x1="50" y1="55" x2="55" y2="20" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.3"/>
                                <circle cx="15" cy="15" r="5" fill="var(--theme-primary)"/>
                                <circle cx="55" cy="20" r="5" fill="var(--theme-primary)"/>
                                <circle cx="50" cy="55" r="4" fill="white" opacity="0.8"/>
                                <circle cx="35" cy="35" r="6" fill="var(--theme-secondary)"/>
                            </g>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-default)', textTransform: 'uppercase' }}>Tracr</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('showcase.tagline')}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {TABS.map((tab, i) => (
                        <button
                            key={i}
                            onClick={() => setActive(i)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                background: active === i ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' : 'transparent',
                                border: `1px solid ${active === i ? 'color-mix(in srgb, var(--theme-primary) 25%, transparent)' : 'transparent'}`,
                                color: active === i ? 'var(--theme-primary)' : 'var(--text-muted)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {t(`showcase.tabs.${tab.key}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card" style={{ flex: 1, marginBottom: '14px', minHeight: 0 }}>
                <div key={active} style={{ animation: 'pgFade 0.25s ease forwards', height: '100%' }}>
                    <ActivePreview />
                </div>
            </div>

            {/* Légende explicative de la case active */}
            <div
                key={`cap-${active}`}
                style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', marginBottom: '44px', minHeight: '40px', animation: 'pgFade 0.3s ease forwards' }}
            >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--theme-primary)', marginTop: '6px', flexShrink: 0, boxShadow: '0 0 8px var(--theme-primary)' }} />
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-default)', marginBottom: '2px' }}>
                        {t(`showcase.tabs.${TABS[active].key}`)}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                        {t(`showcase.desc.${TABS[active].key}`)}
                    </p>
                </div>
            </div>
        </div>
    );
};