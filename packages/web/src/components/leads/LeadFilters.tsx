'use client';
import { Search, Filter, X } from 'lucide-react';
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_TYPES, LEAD_TYPE_LABELS } from '@syncup/shared';
import type { LeadFilters, User } from '@syncup/shared';

interface Props {
  filters: LeadFilters;
  onChange: (f: Partial<LeadFilters>) => void;
  users?: User[];
  showUserFilter?: boolean;
}

export default function LeadFiltersBar({ filters, onChange, users = [], showUserFilter = false }: Props) {
  const hasActiveFilters = filters.stage || filters.leadType || filters.assignedToId || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-52">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search name, company, phone, email..."
          value={filters.search || ''}
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          className="input pl-9"
        />
      </div>

      <select
        value={filters.stage || ''}
        onChange={(e) => onChange({ stage: e.target.value as LeadFilters['stage'] || undefined, page: 1 })}
        className="input w-auto"
      >
        <option value="">All Stages</option>
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
        ))}
      </select>

      <select
        value={filters.leadType || ''}
        onChange={(e) => onChange({ leadType: e.target.value as LeadFilters['leadType'] || undefined, page: 1 })}
        className="input w-auto"
      >
        <option value="">All Types</option>
        {LEAD_TYPES.map((t) => (
          <option key={t} value={t}>{LEAD_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {showUserFilter && (
        <select
          value={filters.assignedToId || ''}
          onChange={(e) => onChange({ assignedToId: e.target.value || undefined, page: 1 })}
          className="input w-auto"
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(e) => onChange({ dateFrom: e.target.value || undefined, page: 1 })}
        className="input w-auto"
        placeholder="From"
      />
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={(e) => onChange({ dateTo: e.target.value || undefined, page: 1 })}
        className="input w-auto"
        placeholder="To"
      />

      {hasActiveFilters && (
        <button
          onClick={() => onChange({ stage: undefined, leadType: undefined, assignedToId: undefined, dateFrom: undefined, dateTo: undefined, search: '', page: 1 })}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
