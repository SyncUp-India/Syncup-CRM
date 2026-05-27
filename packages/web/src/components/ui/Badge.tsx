import { LEAD_STAGE_LABELS, LEAD_TYPE_LABELS } from '@syncup/shared';
import type { LeadStage, LeadType } from '@syncup/shared';

const stageColors: Record<LeadStage, string> = {
  DNP: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  callback_requested: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  followup_required: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  meeting_booked: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  lead_onboarded: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  not_interested: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const typeColors: Record<LeadType, string> = {
  inbound: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  outbound: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  cold: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={`badge ${stageColors[stage]}`}>
      {LEAD_STAGE_LABELS[stage]}
    </span>
  );
}

export function TypeBadge({ type }: { type: LeadType }) {
  return (
    <span className={`badge ${typeColors[type]}`}>
      {LEAD_TYPE_LABELS[type]}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    super_admin: 'bg-black text-white dark:bg-white dark:text-black',
    lead: 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black',
    associate: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  };
  return (
    <span className={`badge ${colors[role] || colors.associate}`}>
      {role.replace('_', ' ')}
    </span>
  );
}
