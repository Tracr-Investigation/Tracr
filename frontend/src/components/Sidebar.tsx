import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useThemeStore } from '../stores/themeStore';
import { useSidebarStore } from '../stores/sidebarStore';
import {
    FileSearch, FileText, Settings, Shield, LogOut,
    ChevronsLeft, ChevronsRight, Menu, X, Bell,
    LayoutDashboard, Calendar, Moon, Sun, BookOpen, HelpCircle,
} from 'lucide-react';
import { useHelpStore } from '../stores/helpStore';

// ── Tooltip (mode replié) ───────────────────────────────────────────────────────

const Tooltip = ({
    label,
    show,
    children,
}: {
    label: string;
    show: boolean;
    children: ReactNode;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

    const open = () => {
        if (!show) return;
        const r = ref.current?.getBoundingClientRect();
        if (r) setCoords({ x: r.right + 10, y: r.top + r.height / 2 });
    };
    const close = () => setCoords(null);

    return (
        <div ref={ref} className="relative" onMouseEnter={open} onMouseLeave={close}>
            {children}
            {show && coords && createPortal(
                <span
                    style={{ position: 'fixed', left: coords.x, top: coords.y, transform: 'translateY(-50%)' }}
                    className="
                        z-[60] pointer-events-none whitespace-nowrap rounded-md bg-card border border-border
                        px-2.5 py-1.5 text-xs font-medium text-text-default shadow-lg
                    "
                >
                    {label}
                </span>,
                document.body,
            )}
        </div>
    );
};

// ── Nav item ──────────────────────────────────────────────────────────────────

const NavItem = ({
    icon: Icon,
    label,
    active,
    collapsed,
    badge,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    active: boolean;
    collapsed: boolean;
    badge?: number;
    onClick: () => void;
}) => (
    <Tooltip label={label} show={collapsed}>
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 relative
                ${active
                    ? 'bg-primary/10 text-text-default'
                    : 'text-text-muted hover:bg-primary/5 hover:text-text-default'
                }
                ${collapsed ? 'justify-center' : ''}
            `}
        >
            {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
            )}
            <div className="relative shrink-0">
                <Icon size={18} className={active ? 'text-primary' : ''} />
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            {!collapsed && <span className="truncate">{label}</span>}
        </button>
    </Tooltip>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const Sidebar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [peeking, setPeeking] = useState(false);
    const peekTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const { collapsed, toggle } = useSidebarStore();
    const { isHelpMode, toggle: toggleHelp } = useHelpStore();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const { mode, toggleMode } = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // Mode visuel : replié seulement si l'utilisateur n'est pas en survol (aperçu auto)
    const effectiveCollapsed = collapsed && !peeking;

    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

    // Section active : exact pour l'accueil, sinon inclut les sous-routes
    const isActive = (path: string) =>
        path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(path + '/');

    const nav = (path: string) => { navigate(path); setMobileOpen(false); };

    // Survol = aperçu auto (avec petit délai pour laisser place aux tooltips)
    const handleMouseEnter = () => {
        if (!collapsed) return;
        peekTimer.current = setTimeout(() => setPeeking(true), 450);
    };
    const handleMouseLeave = () => {
        clearTimeout(peekTimer.current);
        setPeeking(false);
    };

    // Raccourci clavier : Ctrl/Cmd + B
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                const el = document.activeElement as HTMLElement | null;
                const editable = !!el && (
                    el.tagName === 'INPUT' ||
                    el.tagName === 'TEXTAREA' ||
                    el.isContentEditable
                );
                if (editable) return; // ne pas voler le raccourci « gras » de l'éditeur
                e.preventDefault();
                toggle();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle]);

    const mainItems: { icon: React.ElementType; label: string; path?: string; href?: string; action?: string }[] = [
        { icon: LayoutDashboard, label: t('sidebar.dashboard'),      path: '/' },
        { icon: FileSearch,      label: t('sidebar.investigations'),  path: '/investigations' },
        { icon: Calendar,        label: t('sidebar.calendar'),        path: '/calendar' },
        { icon: FileText,        label: t('sidebar.templates'),       path: '/templates' },
        { icon: Settings,        label: t('sidebar.settings'),        path: '/settings' },
        ...(isAdmin ? [{ icon: Shield, label: t('sidebar.administration'), path: '/admin' }] : []),
        { icon: BookOpen,        label: t('sidebar.help'),            href: '/docs/' },
        { icon: HelpCircle,      label: t('sidebar.helpMode'),        action: 'toggleHelp' },
    ];

    const initials = user?.pseudo ? user.pseudo.slice(0, 2).toUpperCase() : 'U';

    return (
        <>
            {/* Mobile trigger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg text-text-default"
            >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed top-0 left-0 h-screen z-40 flex flex-col
                    bg-card border-r border-border
                    transition-all duration-300
                    ${effectiveCollapsed ? 'w-16' : 'w-60'}
                    ${peeking ? 'shadow-2xl shadow-black/40' : ''}
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header — le logo garde toujours sa taille */}
                <div
                    className={`
                        flex items-center h-14 px-3 border-b border-border shrink-0
                        ${effectiveCollapsed ? 'justify-center' : 'gap-2.5'}
                    `}
                >
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8 shrink-0" />
                    {!effectiveCollapsed && (
                        <span className="text-base font-bold text-text-default tracking-tight truncate">
                            Tracr
                        </span>
                    )}
                </div>

                {/* Main nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
                    {mainItems.map(item => (
                        <NavItem
                            key={item.path ?? item.href ?? item.action}
                            icon={item.icon}
                            label={item.label}
                            active={
                                item.action === 'toggleHelp'
                                    ? isHelpMode
                                    : item.path ? isActive(item.path) : false
                            }
                            collapsed={effectiveCollapsed}
                            onClick={() => {
                                if (item.action === 'toggleHelp') { toggleHelp(); return; }
                                if (item.href) { window.open(item.href, '_blank'); return; }
                                if (item.path) nav(item.path);
                            }}
                        />
                    ))}
                </nav>

                {/* Bottom */}
                <div className="border-t border-border py-3 px-2 flex flex-col gap-0.5 shrink-0">
                    {/* Notifications */}
                    <NavItem
                        icon={Bell}
                        label={t('sidebar.notifications')}
                        active={isActive('/notifications')}
                        collapsed={effectiveCollapsed}
                        badge={unreadCount}
                        onClick={() => nav('/notifications')}
                    />

                    {/* Theme toggle */}
                    <Tooltip
                        label={mode === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
                        show={effectiveCollapsed}
                    >
                        <button
                            onClick={toggleMode}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                text-text-muted hover:bg-primary/5 hover:text-text-default transition-all duration-150
                                ${effectiveCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            {mode === 'dark'
                                ? <Sun size={18} className="shrink-0" />
                                : <Moon size={18} className="shrink-0" />
                            }
                            {!effectiveCollapsed && (
                                <span>{mode === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
                            )}
                        </button>
                    </Tooltip>

                    {/* Profile */}
                    <div className={`flex items-center gap-2.5 px-3 py-2 ${effectiveCollapsed ? 'justify-center' : ''}`}>
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                            }}
                        >
                            <span className="text-[11px] font-bold text-primary">{initials}</span>
                        </div>
                        {!effectiveCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-default truncate">{user?.pseudo}</p>
                                <p className="text-[10px] text-text-dim capitalize">{user?.role}</p>
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <Tooltip label={t('sidebar.logout')} show={effectiveCollapsed}>
                        <button
                            data-cy="logout"
                            onClick={() => { logout(); navigate('/login'); }}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                text-red-400/60 hover:bg-red-500/8 hover:text-red-400 transition-all duration-150
                                ${effectiveCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            <LogOut size={18} className="shrink-0" />
                            {!effectiveCollapsed && <span>{t('sidebar.logout')}</span>}
                        </button>
                    </Tooltip>

                    {/* Toggle déplier / replier — en bas, séparé */}
                    <div className="mt-1 pt-2 border-t border-border/60">
                        <Tooltip label={collapsed ? t('sidebar.expandShortcut') : t('sidebar.collapseShortcut')} show={effectiveCollapsed}>
                            <button
                                onClick={toggle}
                                className={`
                                    hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                    text-text-dim hover:bg-primary/5 hover:text-text-default transition-all duration-150
                                    ${effectiveCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                {collapsed
                                    ? <ChevronsRight size={18} className="shrink-0" />
                                    : <ChevronsLeft size={18} className="shrink-0" />
                                }
                                {!effectiveCollapsed && (
                                    <span>{collapsed ? t('sidebar.expand') : t('sidebar.collapse')}</span>
                                )}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </aside>
        </>
    );
};
