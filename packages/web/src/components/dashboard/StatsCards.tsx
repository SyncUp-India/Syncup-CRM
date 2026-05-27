'use client';
import { Users, Phone, CheckCircle, TrendingUp, UserCheck, Calendar } from 'lucide-react';
import type { DashboardStats } from '@syncup/shared';

interface Props {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: Props) {
  const cards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, sub: `${stats.byType.inbound} inbound · ${stats.byType.outbound} outbound · ${stats.byType.cold} cold` },
    { label: 'Calls Made', value: stats.callsMade, icon: Phone, sub: 'In selected period' },
    { label: 'Followups Done', value: stats.followupsCompleted, icon: CheckCircle, sub: 'In selected period' },
    { label: 'Onboarded', value: stats.leadsOnboarded, icon: UserCheck, sub: `${stats.conversionRate}% conversion rate` },
    { label: 'Meetings Booked', value: stats.byStage.meeting_booked, icon: Calendar, sub: 'Currently at this stage' },
    { label: 'In Followup', value: stats.byStage.followup_required, icon: TrendingUp, sub: 'Pending follow-up' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, sub }) => (
        <div key={label} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Icon size={15} className="text-zinc-600 dark:text-zinc-400" />
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}
