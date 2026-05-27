'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, UserCircle, BarChart3, Settings,
  Bell, Upload, Moon, Sun, LogOut, Menu, X, FileText, Wifi, WifiOff,
  Phone
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useOnline } from '@/hooks/useOnline';
import { notificationsApi } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'lead', 'associate'] },
  { href: '/leads', label: 'Leads', icon: Users, roles: ['super_admin', 'lead', 'associate'] },
  { href: '/calling', label: 'Calling', icon: Phone, roles: ['super_admin', 'lead', 'associate'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'lead'] },
  { href: '/upload', label: 'Import', icon: Upload, roles: ['super_admin', 'lead'] },
  { href: '/audit', label: 'Audit Log', icon: FileText, roles: ['super_admin', 'lead'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin'] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, hydrate, isLoading } = useAuthStore();
  const { dark, toggle: toggleTheme, init: initTheme } = useThemeStore();
  const online = useOnline();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { hydrate(); initTheme(); }, []);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () =>
      notificationsApi.unreadCount()
        .then((r) => setUnreadCount(r.data.data.count))
        .catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [user]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/auth/login');
    toast.success('Logged out');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const visibleNav = navItems.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />

      {/* Offline banner */}
      {!online && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 text-sm py-1.5 font-medium">
          <WifiOff size={14} /> You are offline. Changes will sync when reconnected.
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-lg font-bold tracking-tight">SyncUp CRM</span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${active
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-zinc-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 lg:hidden" />
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/settings" className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <UserCircle size={18} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
