import { useState, useEffect, type ReactElement } from 'react';
import { FileText, CheckSquare, Users, Settings, Network } from 'lucide-react';

// ─── Graph preview ────────────────────────────────────────────────────────────

const NW = 105, NH = 32;

// 9 nodes — realistic OSINT investigation map
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
    { category: 'collaboration', action: 'Collaborator invited',        pseudo: 'alice', time: '3h ago',  detail: 'bob — Editor' },
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
    { label: 'Document initial findings',       priority: 'normale', done: true,  av: 'B', due: '—'    },
    { label: 'Identify threat actors',          priority: 'urgente', done: false, av: '',  due: '2d'    },
    { label: 'Map C2 infrastructure',           priority: 'haute',   done: false, av: 'B', due: '3d'   },
    { label: 'Interview key witnesses',         priority: 'normale', done: true,  av: 'A', due: '—'    },
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
                {['B','I','U','|','H₁','H₂','|','≡','•','—'].map((b, i) => (
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { label: string; Component: () => ReactElement }[] = [
    { label: 'Graph',     Component: GraphPreview },
    { label: 'Documents', Component: DocumentPreview },
    { label: 'Timeline',  Component: TimelinePreview },
    { label: 'Tasks',     Component: TasksPreview },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export const FeatureShowcase = () => {
    const [active, setActive] = useState(0);
    const ActivePreview = TABS[active].Component;

    useEffect(() => {
        const t = setInterval(() => setActive(p => (p + 1) % TABS.length), 4000);
        return () => clearInterval(t);
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OSINT Investigation Platform</div>
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
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card" style={{ flex: 1, marginBottom: '44px', minHeight: 0 }}>
                <div key={active} style={{ animation: 'pgFade 0.25s ease forwards', height: '100%' }}>
                    <ActivePreview />
                </div>
            </div>
        </div>
    );
};