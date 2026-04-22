import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  CalendarDays,
  Stethoscope,
  Users,
  LogOut,
  Menu,
  X,
  CalendarRange,
  TrendingUp,
  ClipboardList,
  FileSignature,
  FolderOpen,
  ChevronDown,
  Settings as SettingsIcon,
  Bell,
} from 'lucide-react';

const topItems = [
  { to: '/admin', icon: CalendarRange, label: 'Agenda', end: true, adminOnly: false },
  { to: '/admin/appointments', icon: CalendarDays, label: 'Citas', end: false, adminOnly: false },
  { to: '/admin/patients', icon: Users, label: 'Pacientes', end: false, adminOnly: false },
  { to: '/admin/doctors', icon: Stethoscope, label: 'Médicos', end: false, adminOnly: true },
  { to: '/admin/revenue', icon: TrendingUp, label: 'Ingresos', end: false, adminOnly: true },
];

const docItems = [
  { to: '/admin/medical-records', icon: ClipboardList, label: 'Historial Clínico', adminOnly: false },
  { to: '/admin/consents', icon: FileSignature, label: 'Consentimientos', adminOnly: true },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clinicName = user?.clinic?.name || 'Mi Clínica';

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {clinicName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-gray-900 truncate">{clinicName}</span>
          </div>
          <button className="lg:hidden p-1 text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {topItems.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {/* Documentos group */}
          {docItems.some((i) => !i.adminOnly || user?.role === 'ADMIN') && (
            <div>
              <button
                onClick={() => setDocsOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <FolderOpen className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Documentos</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${docsOpen ? 'rotate-180' : ''}`} />
              </button>
              {docsOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {docItems.filter((i) => !i.adminOnly || user?.role === 'ADMIN').map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuración — always last, admin only */}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />
              Configuración
            </NavLink>
          )}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
              {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6 z-30">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right side */}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* User pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-tight truncate max-w-[140px]">
                  {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}
                </p>
                <p className="text-xs text-gray-400 capitalize leading-tight">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
