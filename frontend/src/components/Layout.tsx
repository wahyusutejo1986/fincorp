import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Shield, 
  LogOut,
  Building2,
  ChevronRight,
  Bell,
  Settings
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Analytics' },
    { path: '/wallet', label: 'Wallet', icon: Wallet, description: 'Manage Funds' },
    { path: '/transactions', label: 'Transactions', icon: History, description: 'History & Reports' },
  ];

  const adminItems = [
    { path: '/admin', label: 'Admin Panel', icon: Shield, description: 'System Management' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-premium rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">FinCorp</h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Banking</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="mb-6">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Main Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={active ? 'nav-link-active mb-1' : 'nav-link-inactive mb-1'}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-slate-500'}`} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 text-primary-400" />}
                </Link>
              );
            })}
          </div>

          {user?.role === 'admin' && (
            <div className="mb-6">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Administration
              </p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={active ? 'nav-link-active mb-1' : 'nav-link-inactive mb-1'}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-slate-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 text-primary-400" />}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}
              </p>
              <div className="flex items-center gap-2">
                <span className={`badge ${user?.role === 'admin' ? 'badge-premium' : 'badge-info'}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex-1 btn-secondary btn-sm justify-center">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="flex-1 btn-danger btn-sm justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-72">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {navItems.find(i => isActive(i.path))?.label || 
               adminItems.find(i => isActive(i.path))?.label || 
               'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
