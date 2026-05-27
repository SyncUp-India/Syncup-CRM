'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import StatsCards from '@/components/dashboard/StatsCards';
import { StageBarChart, ActivityLineChart, TypePieChart, UserPerformanceChart } from '@/components/dashboard/Charts';
import { dashboardApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { DashboardStats, DailyActivity, UserPerformance, User } from '@syncup/shared';
import toast from 'react-hot-toast';

const periods = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [userId, setUserId] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [performance, setPerformance] = useState<UserPerformance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'super_admin';
  const isLead = user?.role === 'lead';
  const canViewTeam = isAdmin || isLead;

  useEffect(() => {
    if (!user) return;
    if (canViewTeam) {
      usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
    }
  }, [user, canViewTeam]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const params = { period, ...(userId ? { userId } : {}) };
    Promise.all([
      dashboardApi.stats(params),
      dashboardApi.dailyActivity(params),
      ...(canViewTeam ? [dashboardApi.userPerformance({ period })] : []),
    ]).then(([statsRes, actRes, perfRes]) => {
      setStats(statsRes.data.data);
      setActivity(actRes.data.data);
      if (perfRes) setPerformance(perfRes.data.data);
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [period, userId, user, canViewTeam]);

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-500">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {canViewTeam && (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input w-auto text-sm"
              >
                <option value="">All Users</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    period === p.value
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Unassigned leads alert — super_admin only */}
        {isAdmin && stats && (stats.unassignedLeads ?? 0) > 0 && (
          <Link
            href="/leads"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition group"
          >
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {stats.unassignedLeads} Unassigned {stats.unassignedLeads === 1 ? 'Lead' : 'Leads'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                These leads are in the shared pool — click to assign them to your team.
              </p>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 h-28 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : stats ? (
          <>
            <StatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StageBarChart stats={stats} />
              <ActivityLineChart data={activity} />
              <TypePieChart stats={stats} />
              {canViewTeam && performance.length > 0 && (
                <UserPerformanceChart data={performance} />
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
