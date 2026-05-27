'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, RefreshCw, ArrowUpDown, AlertCircle, CheckSquare, Square, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import LeadCard from '@/components/leads/LeadCard';
import LeadFiltersBar from '@/components/leads/LeadFilters';
import CreateLeadModal from '@/components/leads/CreateLeadModal';
import Pagination from '@/components/ui/Pagination';
import { leadsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Lead, LeadFilters, User, LeadStage, LeadSortBy } from '@syncup/shared';
import { LEAD_STAGES, LEAD_STAGE_LABELS } from '@syncup/shared';
import toast from 'react-hot-toast';

const SORT_OPTIONS: { value: LeadSortBy; label: string }[] = [
  { value: 'call_priority', label: 'Call Priority' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'updated', label: 'Recently Updated' },
];

export default function LeadsPage() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({ page: 1, limit: 25 });
  const [sortBy, setSortBy] = useState<LeadSortBy>('newest');
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const canAssign = user?.role === 'super_admin' || user?.role === 'lead';

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { ...filters, sortBy };
      if (showUnassigned) params.unassigned = true;
      const res = await leadsApi.list(params);
      setLeads(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, showUnassigned]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (canAssign) usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
  }, [canAssign]);

  const handleFilterChange = (f: Partial<LeadFilters>) => setFilters((prev) => ({ ...prev, ...f }));

  const handleStageChange = (id: string, stage: LeadStage) =>
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l));

  const handleAssign = (id: string, assignedToId: string | null) =>
    setLeads((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const assignedTo = assignedToId ? users.find(u => u.id === assignedToId) : undefined;
      return { ...l, assignedToId: assignedToId ?? undefined, assignedTo };
    }));

  const handleExport = async () => {
    try {
      const res = await leadsApi.export(filters as Record<string, unknown>);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'leads.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  // Bulk select handlers
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map(l => l.id)));
  };

  const exitBulk = () => { setBulkMode(false); setSelectedIds(new Set()); setBulkStage(''); setBulkAssignee(''); };

  const handleBulkApply = async () => {
    if (selectedIds.size === 0) { toast.error('Select at least one lead'); return; }
    if (!bulkStage && !bulkAssignee) { toast.error('Choose a stage or assignee to apply'); return; }
    setBulkBusy(true);
    try {
      const patch: { stage?: string; assignedToId?: string | null } = {};
      if (bulkStage) patch.stage = bulkStage;
      if (bulkAssignee !== '') patch.assignedToId = bulkAssignee === '__unassign__' ? null : bulkAssignee;
      await leadsApi.bulk(Array.from(selectedIds), patch);
      toast.success(`Updated ${selectedIds.size} lead${selectedIds.size > 1 ? 's' : ''}`);
      exitBulk();
      fetchLeads();
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Leads</h1>
            <p className="text-sm text-zinc-500">{total.toLocaleString()} total leads</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-zinc-400" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as LeadSortBy)} className="input w-auto text-sm">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Bulk mode toggle */}
            <button
              onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition ${bulkMode ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />} Bulk Select
            </button>

            {/* Unassigned pool */}
            {canAssign && (
              <button
                onClick={() => setShowUnassigned(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition ${showUnassigned ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-400' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                <AlertCircle size={14} /> Unassigned Pool
              </button>
            )}

            <button onClick={fetchLeads} className="btn-secondary flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
            {user?.role === 'super_admin' && (
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download size={14} /> Export</button>
            )}
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add Lead</button>
          </div>
        </div>

        {/* Bulk action bar */}
        {bulkMode && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <button onClick={toggleSelectAll} className="text-sm font-medium hover:underline flex items-center gap-1.5">
              {selectedIds.size === leads.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {selectedIds.size === leads.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-zinc-500">{selectedIds.size} selected</span>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <select
                value={bulkStage}
                onChange={e => setBulkStage(e.target.value)}
                className="input w-auto text-sm"
              >
                <option value="">Change Stage…</option>
                {LEAD_STAGES.map(s => <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>)}
              </select>

              {canAssign && (
                <select
                  value={bulkAssignee}
                  onChange={e => setBulkAssignee(e.target.value)}
                  className="input w-auto text-sm"
                >
                  <option value="">Assign To…</option>
                  <option value="__unassign__">Unassign</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}

              <button
                onClick={handleBulkApply}
                disabled={bulkBusy || selectedIds.size === 0 || (!bulkStage && !bulkAssignee)}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {bulkBusy ? 'Applying…' : 'Apply'}
              </button>
              <button onClick={exitBulk} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Unassigned banner */}
        {showUnassigned && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
            <AlertCircle size={16} />
            Showing unassigned leads pool — assign them using the dropdown on each card.
          </div>
        )}

        {/* Filters (hidden when showing unassigned pool) */}
        {!showUnassigned && (
          <LeadFiltersBar filters={filters} onChange={handleFilterChange} users={users} showUserFilter={canAssign} />
        )}

        {/* Lead list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="card p-12 text-center text-zinc-400">
            <p className="text-lg font-medium mb-2">No leads found</p>
            <p className="text-sm">{showUnassigned ? 'No unassigned leads in the pool.' : 'Try adjusting your filters or add a new lead.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStageChange={handleStageChange}
                onAssign={handleAssign}
                canEdit={user?.role !== 'associate' || lead.assignedToId === user.id}
                canAssign={canAssign}
                users={users}
                selected={selectedIds.has(lead.id)}
                onSelect={toggleSelect}
                bulkMode={bulkMode}
              />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <Pagination
            page={filters.page || 1}
            totalPages={totalPages}
            total={total}
            limit={filters.limit || 25}
            onChange={(page) => handleFilterChange({ page })}
          />
        )}
      </div>

      <CreateLeadModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchLeads}
        users={users}
        currentUserId={user?.id || ''}
        canAssign={canAssign}
      />
    </AppShell>
  );
}
