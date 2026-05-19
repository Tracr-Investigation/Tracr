import {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../contexts/AuthContext';
import {useNotifications} from '../contexts/NotificationContext';
import {useThemeStore} from '../stores/themeStore';
import {
    FileSearch,
    FileText,
    Settings,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    User,
    Bell,
    LayoutDashboard,
    Calendar,
    Moon,
    Sun,
} from 'lucide-react';

export const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const {user, logout} = useAuth();
    const {unreadCount} = useNotifications();
    const {mode, toggleMode} = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();
    const {t} = useTranslation();

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', collapsed.toString());
    }, [collapsed]);

    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

    const menuItems = [
        {icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/'},
        {icon: FileSearch, label: t('sidebar.investigations'), path: '/investigations'},
        {icon: Calendar, label: t('sidebar.calendar'), path: '/calendar'},
        {icon: FileText, label: t('sidebar.templates'), path: '/templates'},
        {icon: Settings, label: t('sidebar.settings'), path: '/settings'},
        ...(isAdmin ? [{icon: Shield, label: t('sidebar.administration'), path: '/admin'}] : []),
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card backdrop-blur-sm border border-border rounded-lg text-text-default"
            >
                {mobileOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>

            {/* Overlay Mobile */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-overlay backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-screen bg-card backdrop-blur-sm border-r border-border z-40
          transition-all duration-300 flex flex-col
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Logo */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Logo" className="w-10 h-10 flex-shrink-0"/>
                        {!collapsed && (
                            <span
                                className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Tracr
              </span>
                        )}
                    </div>

                    {/* Toggle Button Desktop */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:block p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-text-muted flex-shrink-0"
                    >
                        {collapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
                    </button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setMobileOpen(false);
                                }}
                                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${active
                                    ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-text-default border border-primary/30'
                                    : 'text-text-muted hover:bg-primary/10 hover:text-text-default'
                                }
                  ${collapsed ? 'justify-center' : ''}
                `}
                                title={collapsed ? item.label : ''}
                            >
                                <Icon size={22} className={`flex-shrink-0 ${active ? 'text-primary' : ''}`}/>
                                {!collapsed && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Notifications & User Profile & Logout */}
                <div className="p-4 border-t border-border space-y-2">
                    {/* Notifications */}
                    <button
                        onClick={() => {
                            navigate('/notifications');
                            setMobileOpen(false);
                        }}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative
                            ${isActive('/notifications')
                            ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-text-default border border-primary/30'
                            : 'text-text-muted hover:bg-primary/10 hover:text-text-default'
                        }
                            ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? 'Notifications' : ''}
                    >
                        <div className="relative flex-shrink-0">
                            <Bell size={22} className={isActive('/notifications') ? 'text-primary' : ''}/>
                            {unreadCount > 0 && (
                                <span
                                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        {!collapsed && (
                            <span className="font-medium">{t('sidebar.notifications')}</span>
                        )}
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleMode}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                            text-text-muted hover:bg-primary/10 hover:text-text-default
                            ${collapsed ? 'justify-center' : ''}
                        `}
                        title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    >
                        {mode === 'dark'
                            ? <Sun size={22} className="flex-shrink-0"/>
                            : <Moon size={22} className="flex-shrink-0"/>
                        }
                        {!collapsed && (
                            <span className="font-medium">
                                {mode === 'dark' ? 'Mode clair' : 'Mode sombre'}
                            </span>
                        )}
                    </button>

                    {/* Profile */}
                    <div
                        className={`
              flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-border md:border-none md:bg-transparent
              ${collapsed ? 'justify-center' : ''}
            `}
                    >
                        <div
                            className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-text-default"/>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-default truncate">
                                    {user?.pseudo}
                                </p>
                                <p className="text-xs text-text-muted capitalize">{user?.role}</p>
                            </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all
              ${collapsed ? 'justify-center' : ''}
            `}
                        title={collapsed ? 'Logout' : ''}
                    >
                        <LogOut size={22} className="flex-shrink-0"/>
                        {!collapsed && <span className="font-medium">{t('sidebar.logout')}</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};
