'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Phone, SkipForward, CheckCircle, Clock, Building2, User, MessageCircle,
  Mail, ChevronLeft, ChevronRight, Loader2, Copy, AlertCircle, X, Calendar,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { leadsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Lead, LeadStage } from '@syncup/shared';
import { LEAD_STAGE_LABELS } from '@syncup/shared';
import { StageBadge, TypeBadge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

// Stages that need a scheduled time
const SCHEDULE_STAGES: LeadStage[] = ['callback_requested', 'followup_required'];

const OUTCOME_STAGES: { stage: LeadStage; label: string; color: string }[] = [
  { stage: 'callback_requested', label: 'Will Call Back',  color: 'bg-blue-500 hover:bg-blue-600 text-white' },
  { stage: 'followup_required',  label: 'Need Follow-up',  color: 'bg-purple-500 hover:bg-purple-600 text-white' },
  { stage: 'meeting_booked',     label: 'Meeting Booked',  color: 'bg-green-500 hover:bg-green-600 text-white' },
  { stage: 'lead_onboarded',     label: 'Onboarded!',      color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  { stage: 'DNP',                label: 'No Answer',       color: 'bg-zinc-500 hover:bg-zinc-600 text-white' },
  { stage: 'not_interested',     label: 'Not Interested',  color: 'bg-red-500 hover:bg-red-600 text-white' },
];

interface QueueLead extends Lead {
  _attempt?: number; // for DNP double-entry
  _returnAt?: string; // ISO time to resurface
}

interface ScheduleModal {
  stage: LeadStage;
  date: string;
  time: string;
}

export default function CallingPage() {
  const { user } = useAuthStore();
  const [queue, setQueue] = useState<QueueLead[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [callLogged, setCallLogged] = useState(false); // gate: must call before outcome
  const [calling, setCalling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setCallLogged(false);
    try {
      const res = await leadsApi.list({ sortBy: 'call_priority', limit: 100 });
      const all: Lead[] = res.data.data;
      const now = new Date();

      const built: QueueLead[] = [];
      for (const lead of all) {
        if (lead.stage === 'lead_onboarded' || lead.stage === 'not_interested') continue;

        if (lead.stage === 'followup_required') {
          const pending = (lead.followups || []).find(f => !f.completedAt);
          if (pending) {
            const due = new Date(pending.scheduledAt) <= now;
            // followup leads: only include if due now
            if (due) built.unshift({ ...lead }); // surface at top
            else {
              // not due yet — add with returnAt marker but keep at bottom
              built.push({ ...lead, _returnAt: pending.scheduledAt });
            }
            continue;
          }
        }

        if (lead.stage === 'DNP') {
          // Add twice so they get two attempts
          built.push({ ...lead, _attempt: 1 });
          built.push({ ...lead, _attempt: 2 });
          continue;
        }

        built.push({ ...lead });
      }

      setQueue(built);
      setIndex(0);
    } catch {
      toast.error('Failed to load calling queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Check every 30s for newly-due followup leads
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      setQueue(prev => {
        let changed = false;
        const updated = prev.map((l: QueueLead) => {
          if (l._returnAt && new Date(l._returnAt) <= now) {
            changed = true;
            return { ...l, _returnAt: undefined };
          }
          return l;
        });
        if (!changed) return prev;
        return [
          ...updated.filter((l: QueueLead) => !l._returnAt),
          ...updated.filter((l: QueueLead) => l._returnAt),
        ];
      });
    }, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const current = queue[index];
  const isDueFollowup = current?.stage === 'followup_required' && !current._returnAt;
  const nextFollowup = current?.followups?.find(f => !f.completedAt);
  const dueFollowupCount = queue.filter(l => l.stage === 'followup_required' && !l._returnAt).length;

  const handleCall = async () => {
    if (!current || calling) return;
    setCalling(true);
    try {
      await leadsApi.logCall(current.id);
    } catch { /* ignore */ }
    setCallLogged(true);
    window.location.href = `tel:${current.phone}`;
    setCalling(false);
  };

  const handleWhatsApp = () => {
    if (!current) return;
    const digits = current.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${digits}`, '_blank');
  };

  const handleEmail = () => {
    if (current?.email) window.open(`mailto:${current.email}`, '_self');
  };

  const handleDuplicate = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await leadsApi.duplicate(current.id);
      toast.success('Lead duplicated');
    } catch {
      toast.error('Failed to duplicate lead');
    } finally {
      setBusy(false);
    }
  };

  // Outcome selected — if it needs a schedule, show modal; otherwise apply immediately
  const handleOutcomeClick = (stage: LeadStage) => {
    if (SCHEDULE_STAGES.includes(stage)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduleModal({
        stage,
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
      });
    } else {
      applyOutcome(stage);
    }
  };

  const applyOutcome = async (stage: LeadStage, scheduledAt?: string) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await leadsApi.changeStage(current.id, stage);

      if (scheduledAt && SCHEDULE_STAGES.includes(stage)) {
        // Schedule followup and create a notification
        const followupNum = (current.followups || []).length === 0 ? 'followup_1'
          : (current.followups || []).length === 1 ? 'followup_2' : 'followup_3';
        await leadsApi.scheduleFollowup(current.id, {
          followupNumber: followupNum,
          scheduledAt,
          notes: `Scheduled from calling queue`,
        });

        // Re-queue the lead at its scheduled time
        setQueue(prev => {
          const filtered = prev.filter((_, i) => i !== index);
          const reQueued: QueueLead = { ...current, stage, _returnAt: scheduledAt };
          return [...filtered, reQueued];
        });
        toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()} — lead will resurface automatically`);
      } else {
        setQueue(prev => prev.filter((_, i) => i !== index));
        toast.success(`Marked: ${LEAD_STAGE_LABELS[stage]}`);
      }

      setIndex(i => Math.min(i, queue.length - 2));
      setCallLogged(false);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setBusy(false);
      setScheduleModal(null);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!scheduleModal) return;
    const { stage, date, time } = scheduleModal;
    if (!date || !time) { toast.error('Pick a date and time'); return; }
    setScheduleBusy(true);
    await applyOutcome(stage, `${date}T${time}:00`);
    setScheduleBusy(false);
  };

  const handleSkip = () => {
    if (queue.length <= 1) return;
    setQueue(prev => {
      const next = [...prev];
      const [skipped] = next.splice(index, 1);
      next.push(skipped);
      return next;
    });
    setCallLogged(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-12">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  const activeCount = queue.filter(l => !l._returnAt).length;

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Calling Queue</h1>
            <p className="text-sm text-zinc-500">
              {queue.length === 0
                ? 'Queue empty'
                : `${Math.min(index + 1, activeCount)} of ${activeCount} leads${queue.length > activeCount ? ` · ${queue.length - activeCount} scheduled` : ''}`}
            </p>
          </div>
          <button onClick={fetchQueue} className="btn-secondary text-sm">Refresh</button>
        </div>

        {/* Due followups alert */}
        {dueFollowupCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-700 text-purple-800 dark:text-purple-300 text-sm">
            <Clock size={16} className="shrink-0" />
            <strong>{dueFollowupCount}</strong>&nbsp;scheduled followup{dueFollowupCount > 1 ? 's' : ''} are due now and surfaced at the top.
          </div>
        )}

        {activeCount === 0 ? (
          <div className="card p-16 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            <p className="text-lg font-semibold mb-1">Queue Complete!</p>
            <p className="text-sm text-zinc-500">All leads have been called. Great work!</p>
            <button onClick={fetchQueue} className="btn-primary mt-4">Refresh Queue</button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-black dark:bg-white h-1.5 rounded-full transition-all"
                style={{ width: `${(index / Math.max(activeCount, 1)) * 100}%` }}
              />
            </div>

            {/* Current lead card */}
            <div className="card p-6 space-y-5">
              {/* Due followup banner */}
              {isDueFollowup && nextFollowup && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm border border-purple-200 dark:border-purple-700">
                  <Clock size={14} />
                  Followup due: {new Date(nextFollowup.scheduledAt).toLocaleString()}
                  {nextFollowup.notes && <span className="opacity-75">— {nextFollowup.notes}</span>}
                </div>
              )}

              {/* Scheduled-for-later badge */}
              {current?._returnAt && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-sm border border-zinc-200 dark:border-zinc-700">
                  <Calendar size={14} />
                  Scheduled for: {new Date(current._returnAt).toLocaleString()}
                </div>
              )}

              {/* Lead info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                  {current?.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-bold">{current?.name}</h2>
                    <TypeBadge type={current?.leadType} />
                    {(current?._attempt) && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        Attempt {current._attempt}/2
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 mb-2">
                    {current?.designation && <span className="flex items-center gap-1.5"><User size={13} /> {current.designation}</span>}
                    <span className="flex items-center gap-1.5"><Building2 size={13} /> {current?.company}</span>
                    <span className="flex items-center gap-1.5"><Phone size={13} /> {current?.phone}</span>
                    {current?.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {current.email}</span>}
                  </div>
                  <StageBadge stage={current?.stage} />
                </div>
              </div>

              {/* Call actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleCall}
                  disabled={calling}
                  className="flex-1 min-w-40 flex items-center justify-center gap-2 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition disabled:opacity-50"
                >
                  {calling ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                  {calling ? 'Calling...' : `Call ${current?.phone}`}
                </button>
                <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition">
                  <MessageCircle size={16} /> WhatsApp
                </button>
                {current?.email && (
                  <button onClick={handleEmail} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition">
                    <Mail size={16} /> Email
                  </button>
                )}
                <button
                  onClick={handleDuplicate}
                  disabled={busy}
                  title="Duplicate this lead"
                  className="flex items-center gap-2 px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition disabled:opacity-50"
                >
                  <Copy size={16} />
                </button>
              </div>

              {/* Outcome gate */}
              {!callLogged ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-sm">
                  <AlertCircle size={14} className="shrink-0" />
                  Press <strong>Call</strong> first — outcomes unlock after attempting the call.
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Call Outcome</p>
                  <div className="flex flex-wrap gap-2">
                    {OUTCOME_STAGES.map(({ stage, label, color }) => (
                      <button
                        key={stage}
                        onClick={() => handleOutcomeClick(stage)}
                        disabled={busy}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${color}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setIndex(i => Math.max(0, i - 1)); setCallLogged(false); }}
                disabled={index === 0}
                className="btn-secondary flex items-center gap-1.5 disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <button
                onClick={handleSkip}
                disabled={activeCount <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-30"
              >
                <SkipForward size={16} /> Skip to end
              </button>

              <button
                onClick={() => { setIndex(i => Math.min(activeCount - 1, i + 1)); setCallLogged(false); }}
                disabled={!callLogged || index >= activeCount - 1}
                title={!callLogged ? 'Log a call first to advance' : undefined}
                className="btn-secondary flex items-center gap-1.5 disabled:opacity-30"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>

            {/* Up next preview */}
            {queue.filter(l => !l._returnAt).length > 1 && (
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Up Next</p>
                <div className="space-y-2">
                  {queue.filter(l => !l._returnAt).slice(index + 1, index + 4).map((lead, i) => {
                    const fp = lead.followups?.find(f => !f.completedAt);
                    const due = fp && new Date(fp.scheduledAt) <= new Date();
                    return (
                      <div key={`${lead.id}-${lead._attempt || 0}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                        <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-bold flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-300">
                          {index + i + 2}
                        </span>
                        <span className="font-medium truncate flex-1">{lead.name}</span>
                        {lead._attempt && <span className="text-xs text-zinc-400">Attempt {lead._attempt}/2</span>}
                        <span className="text-xs text-zinc-400 truncate">{lead.company}</span>
                        {due && <Clock size={12} className="text-purple-500 shrink-0" />}
                        <StageBadge stage={lead.stage} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scheduled / waiting leads */}
            {queue.filter(l => l._returnAt).length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Waiting (Scheduled)</p>
                <div className="space-y-2">
                  {queue.filter(l => l._returnAt).map(lead => (
                    <div key={lead.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm opacity-60">
                      <Clock size={13} className="text-purple-400 shrink-0" />
                      <span className="font-medium truncate flex-1">{lead.name}</span>
                      <span className="text-xs text-zinc-400">{new Date(lead._returnAt!).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Schedule {LEAD_STAGE_LABELS[scheduleModal.stage]}</h3>
              <button onClick={() => setScheduleModal(null)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-zinc-500">
              Pick a date and time — a notification will be sent and the lead will resurface in the queue at this time.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Date</label>
                <input
                  type="date"
                  className="input"
                  value={scheduleModal.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setScheduleModal(s => s ? { ...s, date: e.target.value } : s)}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Time</label>
                <input
                  type="time"
                  className="input"
                  value={scheduleModal.time}
                  onChange={e => setScheduleModal(s => s ? { ...s, time: e.target.value } : s)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScheduleModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleScheduleConfirm}
                disabled={scheduleBusy}
                className="btn-primary flex-1"
              >
                {scheduleBusy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
