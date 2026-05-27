import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useThemeStore } from '../stores/themeStore';
import { useSidebarStore } from '../stores/sidebarStore';
import {
    FileSearch, FileText, Settings, Shield, LogOut,
    ChevronLeft, ChevronRight, Menu, X, Bell,
    LayoutDashboard, Calendar, Moon, Sun,
} from 'lucide-react';

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
    <button
        onClick={onClick}
        title={collapsed ? label : undefined}
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
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const Sidebar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { collapsed, toggle } = useSidebarStore();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const { mode, toggleMode } = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    const isActive = (path: string) => location.pathname === path;

    const nav = (path: string) => { navigate(path); setMobileOpen(false); };

    const mainItems = [
        { icon: LayoutDashboard, label: t('sidebar.dashboard'),      path: '/' },
        { icon: FileSearch,      label: t('sidebar.investigations'),  path: '/investigations' },
        { icon: Calendar,        label: t('sidebar.calendar'),        path: '/calendar' },
        { icon: FileText,        label: t('sidebar.templates'),       path: '/templates' },
        { icon: Settings,        label: t('sidebar.settings'),        path: '/settings' },
        ...(isAdmin ? [{ icon: Shield, label: t('sidebar.administration'), path: '/admin' }] : []),
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
                className={`
                    fixed top-0 left-0 h-screen z-40 flex flex-col
                    bg-card border-r border-border
                    transition-all duration-300
                    ${collapsed ? 'w-16' : 'w-60'}
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 h-14 border-b border-border shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <img src="/logo.svg" alt="Logo" className="w-7 h-7 shrink-0" />
                        {!collapsed && (
                            <span className="text-base font-bold text-text-default tracking-tight truncate">
                                Tracr
                            </span>
                        )}
                    </div>
                    <button
                        onClick={toggle}
                        className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-text-dim hover:text-text-default hover:bg-primary/5 transition-all shrink-0"
                        title={collapsed ? 'Déplier' : 'Replier'}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Main nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
                    {mainItems.map(item => (
                        <NavItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            active={isActive(item.path)}
                            collapsed={collapsed}
                            onClick={() => nav(item.path)}
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
                        collapsed={collapsed}
                        badge={unreadCount}
                        onClick={() => nav('/notifications')}
                    />

                    {/* Theme toggle */}
                    <button
                        onClick={toggleMode}
                        title={collapsed ? (mode === 'dark' ? 'Mode clair' : 'Mode sombre') : undefined}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            text-text-muted hover:bg-primary/5 hover:text-text-default transition-all duration-150
                            ${collapsed ? 'justify-center' : ''}
                        `}
                    >
                        {mode === 'dark'
                            ? <Sun size={18} className="shrink-0" />
                            : <Moon size={18} className="shrink-0" />
                        }
                        {!collapsed && (
                            <span>{mode === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
                        )}
                    </button>

                    {/* Profile */}
                    <div className={`flex items-center gap-2.5 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                            }}
                        >
                            <span className="text-[11px] font-bold text-primary">{initials}</span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-default truncate">{user?.pseudo}</p>
                                <p className="text-[10px] text-text-dim capitalize">{user?.role}</p>
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        title={collapsed ? t('sidebar.logout') : undefined}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            text-red-400/60 hover:bg-red-500/8 hover:text-red-400 transition-all duration-150
                            ${collapsed ? 'justify-center' : ''}
                        `}
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!collapsed && <span>{t('sidebar.logout')}</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};
