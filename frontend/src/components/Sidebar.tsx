import {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {
    Home,
    LayoutDashboard,
    FileSearch,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    User
} from 'lucide-react';

export const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', collapsed.toString());
    }, [collapsed]);

    const menuItems = [
        {icon: Home, label: 'Home', path: '/'},
        {icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard'},
        {icon: FileSearch, label: 'Investigations', path: '/enquetes'},
        {icon: FileText, label: 'Templates', path: '/templates'},
        {icon: Settings, label: 'Settings', path: '/parametres'},
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
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark/80 backdrop-blur-sm border border-primary/20 rounded-lg text-accent"
            >
                {mobileOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>

            {/* Overlay Mobile */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-dark/80 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-screen bg-dark/95 backdrop-blur-sm border-r border-primary/20 z-40
          transition-all duration-300 flex flex-col
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Logo */}
                <div className="p-6 border-b border-primary/20 flex items-center justify-between">
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
                        className="hidden lg:block p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-secondary flex-shrink-0"
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
                                    ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-accent border border-primary/30'
                                    : 'text-secondary hover:bg-primary/10 hover:text-accent'
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

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-primary/20 space-y-2">
                    {/* Profile */}
                    <div
                        className={`
              flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 md:border-none md:bg-non
              ${collapsed ? 'justify-center' : ''}
            `}
                    >
                        <div
                            className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-white"/>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-accent truncate">
                                    {user?.pseudo}
                                </p>
                                <p className="text-xs text-secondary capitalize">{user?.role}</p>
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
                        {!collapsed && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};