'use client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DashboardStats, DailyActivity, UserPerformance } from '@syncup/shared';
import { LEAD_STAGE_LABELS } from '@syncup/shared';

const COLORS = ['#000000', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

export function StageBarChart({ stats }: { stats: DashboardStats }) {
  const data = Object.entries(stats.byStage).map(([stage, count]) => ({
    name: LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS],
    count,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold mb-4">Leads by Stage</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityLineChart({ data }: { data: DailyActivity[] }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold mb-4">Daily Activity</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="calls" stroke="#000000" strokeWidth={2} dot={false} name="Calls" />
          <Line type="monotone" dataKey="leads" stroke="#737373" strokeWidth={2} dot={false} name="New Leads" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypePieChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: 'Inbound', value: stats.byType.inbound },
    { name: 'Outbound', value: stats.byType.outbound },
    { name: 'Cold', value: stats.byType.cold },
  ].filter((d) => d.value > 0);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold mb-4">Lead Type Breakdown</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserPerformanceChart({ data }: { data: UserPerformance[] }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold mb-4">Team Performance</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="userName" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="totalLeads" fill="#000000" radius={[4, 4, 0, 0]} name="Leads" />
          <Bar dataKey="callsMade" fill="#737373" radius={[4, 4, 0, 0]} name="Calls" />
          <Bar dataKey="onboarded" fill="#d4d4d4" radius={[4, 4, 0, 0]} name="Onboarded" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
