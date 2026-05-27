'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatsCards from '@/components/dashboard/StatsCards';
import { StageBarChart, ActivityLineChart, TypePieChart, UserPerformanceChart } from '@/components/dashboard/Charts';
import { dashboardApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { DashboardStats, DailyActivity, UserPerformance, User } from '@syncup/shared';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [userId, setUserId] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [performance, setPerformance] = useState<UserPerformance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const params = { period, ...(userId ? { userId } : {}) };
    Promise.all([
      dashboardApi.stats(params),
      dashboardApi.dailyActivity(params),
      dashboardApi.userPerformance({ period }),
    ]).then(([s, a, p]) => {
      setStats(s.data.data);
      setActivity(a.data.data);
      setPerformance(p.data.data);
    }).catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, [period, userId, user]);

  const periods = ['today', 'week', 'month'];

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Reports</h1>
            <p className="text-sm text-zinc-500">Performance analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input w-auto text-sm">
              <option value="">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition ${period === p ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                >
                  {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-28 animate-pulse bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        ) : stats ? (
          <>
            <StatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StageBarChart stats={stats} />
              <ActivityLineChart data={activity} />
              <TypePieChart stats={stats} />
              {performance.length > 0 && <UserPerformanceChart data={performance} />}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
