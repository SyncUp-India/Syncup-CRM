'use client';
import Link from 'next/link';
import { Phone, Mail, Building2, User, ChevronRight, MessageCircle, UserCheck } from 'lucide-react';
import type { Lead, LeadStage, User as UserType } from '@syncup/shared';
import { formatDateTime } from '@syncup/shared';
import { StageBadge, TypeBadge } from '@/components/ui/Badge';
import StageDropdown from './StageDropdown';
import { leadsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
  onAssign?: (id: string, assignedToId: string | null) => void;
  canEdit?: boolean;
  canAssign?: boolean;
  users?: UserType[];
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  bulkMode?: boolean;
}

export default function LeadCard({
  lead, onStageChange, onAssign, canEdit = true, canAssign = false,
  users = [], selected = false, onSelect, bulkMode = false,
}: Props) {
  const handleStageChange = async (stage: LeadStage) => {
    try {
      await leadsApi.changeStage(lead.id, stage);
      onStageChange?.(lead.id, stage);
      toast.success('Stage updated');
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleCall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { await leadsApi.logCall(lead.id); } catch { /* ignore */ }
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const digits = lead.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${digits}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lead.email) window.open(`mailto:${lead.email}`, '_self');
  };

  const handleAssign = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const val = e.target.value;
    try {
      await leadsApi.assign(lead.id, val || null);
      onAssign?.(lead.id, val || null);
      toast.success(val ? 'Lead assigned' : 'Lead unassigned');
    } catch {
      toast.error('Failed to assign lead');
    }
  };

  return (
    <div
      className={`card p-4 hover:shadow-sm transition group ${selected ? 'ring-2 ring-black dark:ring-white' : ''}`}
      onClick={() => bulkMode && onSelect?.(lead.id, !selected)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox in bulk mode */}
        {bulkMode && (
          <div className="pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(lead.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded accent-black dark:accent-white cursor-pointer"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Link href={`/leads/${lead.id}`} className="font-semibold hover:underline" onClick={(e) => bulkMode && e.preventDefault()}>
              {lead.name}
            </Link>
            <TypeBadge type={lead.leadType} />
            {!lead.assignedToId && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Unassigned
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 mb-3">
            {lead.designation && (
              <span className="flex items-center gap-1.5"><User size={12} /> {lead.designation}</span>
            )}
            <span className="flex items-center gap-1.5"><Building2 size={12} /> {lead.company}</span>
            <span className="flex items-center gap-1.5"><Phone size={12} /> {lead.phone}</span>
            {lead.email && <span className="flex items-center gap-1.5"><Mail size={12} /> {lead.email}</span>}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <StageDropdown stage={lead.stage} onChange={handleStageChange} disabled={!canEdit || bulkMode} />
            {canAssign ? (
              <select
                value={lead.assignedToId || ''}
                onChange={handleAssign}
                onClick={(e) => e.stopPropagation()}
                disabled={bulkMode}
                className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : lead.assignedTo ? (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <UserCheck size={11} /> {lead.assignedTo.name}
              </span>
            ) : null}
            <span className="text-xs text-zinc-400">{formatDateTime(lead.updatedAt)}</span>
          </div>
        </div>

        {/* Action buttons — hidden in bulk mode */}
        {!bulkMode && (
          <div className="flex flex-col items-end gap-2">
            <button onClick={handleCall} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 transition">
              <Phone size={12} /> Call
            </button>
            <button onClick={handleWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white transition">
              <MessageCircle size={12} /> WhatsApp
            </button>
            {lead.email && (
              <button onClick={handleEmail} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                <Mail size={12} /> Email
              </button>
            )}
            <Link href={`/leads/${lead.id}`} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-400 hover:text-black dark:hover:text-white">
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
