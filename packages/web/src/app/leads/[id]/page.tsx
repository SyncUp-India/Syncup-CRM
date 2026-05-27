'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, Mail, Building2, User, Edit2, Save, X,
  Clock, MessageSquare, PhoneCall, CheckCircle, Calendar, AlertCircle, Plus
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { StageBadge, TypeBadge } from '@/components/ui/Badge';
import StageDropdown from '@/components/leads/StageDropdown';
import Modal from '@/components/ui/Modal';
import { leadsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Lead, Activity, LeadStage, User as UserType } from '@syncup/shared';
import { formatDateTime, FOLLOWUP_NUMBERS, FOLLOWUP_LABELS, LEAD_TYPES, LEAD_TYPE_LABELS } from '@syncup/shared';
import toast from 'react-hot-toast';

const activityIcons: Record<string, React.ReactNode> = {
  stage_changed: <AlertCircle size={14} className="text-amber-500" />,
  note_added: <MessageSquare size={14} className="text-blue-500" />,
  call_attempt: <PhoneCall size={14} className="text-green-500" />,
  email_sent: <Mail size={14} className="text-purple-500" />,
  followup_scheduled: <Calendar size={14} className="text-indigo-500" />,
  followup_completed: <CheckCircle size={14} className="text-green-600" />,
  lead_created: <Plus size={14} className="text-zinc-500" />,
  lead_assigned: <User size={14} className="text-zinc-500" />,
  field_updated: <Edit2 size={14} className="text-zinc-500" />,
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [followupForm, setFollowupForm] = useState({ followupNumber: 'followup_1', scheduledAt: '', notes: '' });

  const canEdit = user?.role !== 'associate' || lead?.assignedToId === user?.id;
  const canAssign = user?.role === 'super_admin' || user?.role === 'lead';

  const fetchLead = async () => {
    try {
      const res = await leadsApi.get(id);
      setLead(res.data.data);
      const l = res.data.data;
      setEditForm({
        name: l.name,
        designation: l.designation || '',
        company: l.company,
        phone: l.phone,
        email: l.email || '',
        leadType: l.leadType,
        assignedToId: l.assignedToId || '',
      });
    } catch {
      toast.error('Lead not found');
      router.replace('/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLead(); }, [id]);
  useEffect(() => {
    if (canAssign) usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
  }, [canAssign]);

  const handleStageChange = async (stage: LeadStage) => {
    try {
      await leadsApi.changeStage(id, stage);
      setLead((l) => l ? { ...l, stage } : l);
      toast.success('Stage updated');
      fetchLead(); // refresh activities
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await leadsApi.update(id, editForm);
      toast.success('Lead updated');
      setEditing(false);
      fetchLead();
    } catch {
      toast.error('Failed to update lead');
    }
  };

  const handleCall = async () => {
    try { await leadsApi.logCall(id); } catch {}
    window.location.href = `tel:${lead?.phone}`;
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await leadsApi.addNote(id, noteText);
      setNoteText('');
      fetchLead();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleScheduleFollowup = async () => {
    if (!followupForm.scheduledAt) { toast.error('Set a date and time'); return; }
    try {
      await leadsApi.scheduleFollowup(id, followupForm);
      toast.success('Followup scheduled');
      setShowFollowup(false);
      setFollowupForm({ followupNumber: 'followup_1', scheduledAt: '', notes: '' });
      fetchLead();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to schedule followup');
    }
  };

  const handleCompleteFollowup = async (followupId: string) => {
    try {
      await leadsApi.completeFollowup(id, followupId);
      toast.success('Followup marked complete');
      fetchLead();
    } catch {
      toast.error('Failed to complete followup');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="card p-6 animate-pulse h-64 bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </AppShell>
    );
  }

  if (!lead) return null;

  const pendingFollowups = lead.followups?.filter((f) => !f.completedAt) || [];
  const completedFollowups = lead.followups?.filter((f) => f.completedAt) || [];
  const nextFollowupNumber = pendingFollowups.length === 0
    ? (completedFollowups.length < 3 ? FOLLOWUP_NUMBERS[completedFollowups.length] : null)
    : null;

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Back */}
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition">
          <ArrowLeft size={14} /> Back to Leads
        </Link>

        {/* Header card */}
        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              {editing ? (
                <input className="input text-xl font-bold mb-2 w-full max-w-xs" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              ) : (
                <h1 className="text-xl font-bold mb-1">{lead.name}</h1>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <StageDropdown stage={lead.stage} onChange={handleStageChange} disabled={!canEdit} />
                <TypeBadge type={lead.leadType} />
                <span className="text-xs text-zinc-400">Source: {lead.source}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCall} className="btn-primary flex items-center gap-2">
                <Phone size={14} /> Call
              </button>
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {editing && (
                <>
                  <button onClick={handleSaveEdit} className="btn-primary flex items-center gap-2">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-2">
                    <X size={14} /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Designation</label>
                  <input className="input" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Company</label>
                  <input className="input" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Phone</label>
                  <input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                  <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lead Type</label>
                  <select className="input" value={editForm.leadType} onChange={(e) => setEditForm({ ...editForm, leadType: e.target.value })}>
                    {LEAD_TYPES.map((t) => <option key={t} value={t}>{LEAD_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                {canAssign && (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Assigned To</label>
                    <select className="input" value={editForm.assignedToId} onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <InfoField icon={<User size={13} />} label="Designation" value={lead.designation} />
                <InfoField icon={<Building2 size={13} />} label="Company" value={lead.company} />
                <InfoField icon={<Phone size={13} />} label="Phone" value={lead.phone} />
                <InfoField icon={<Mail size={13} />} label="Email" value={lead.email} />
                <InfoField icon={<User size={13} />} label="Assigned To" value={lead.assignedTo?.name} />
                <InfoField icon={<Clock size={13} />} label="Created" value={formatDateTime(lead.createdAt)} />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold mb-4">Activity Timeline</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {(lead.activities || []).map((a: Activity) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="mt-0.5 shrink-0">{activityIcons[a.action] || <Clock size={14} />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.details}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {a.user?.name && <span>{a.user.name} · </span>}
                        {formatDateTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(lead.activities || []).length === 0 && (
                  <p className="text-sm text-zinc-400">No activity yet.</p>
                )}
              </div>
            </div>

            {/* Add Note */}
            {canEdit && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold mb-3">Add Note</h2>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder="Write a note about this lead..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !noteText.trim()}
                    className="btn-primary"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Followups sidebar */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Followups</h2>
                {canEdit && nextFollowupNumber && (
                  <button onClick={() => setShowFollowup(true)} className="text-xs font-medium hover:underline">
                    + Schedule
                  </button>
                )}
              </div>

              {pendingFollowups.length === 0 && completedFollowups.length === 0 && (
                <p className="text-sm text-zinc-400">No followups scheduled.</p>
              )}

              {pendingFollowups.map((f) => (
                <div key={f.id} className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {FOLLOWUP_LABELS[f.followupNumber]}
                    </span>
                    <button
                      onClick={() => handleCompleteFollowup(f.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Mark done
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatDateTime(f.scheduledAt)}</p>
                  {f.notes && <p className="text-xs text-zinc-500 mt-1">{f.notes}</p>}
                </div>
              ))}

              {completedFollowups.map((f) => (
                <div key={f.id} className="mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs font-medium">{FOLLOWUP_LABELS[f.followupNumber]}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Completed {formatDateTime(f.completedAt!)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Followup Modal */}
      <Modal open={showFollowup} onClose={() => setShowFollowup(false)} title="Schedule Followup">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Followup Number</label>
            <select
              className="input"
              value={followupForm.followupNumber}
              onChange={(e) => setFollowupForm({ ...followupForm, followupNumber: e.target.value })}
            >
              {FOLLOWUP_NUMBERS.map((n) => (
                <option key={n} value={n}>{FOLLOWUP_LABELS[n]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={followupForm.scheduledAt}
              onChange={(e) => setFollowupForm({ ...followupForm, scheduledAt: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Notes (optional)</label>
            <textarea rows={2} className="input resize-none" value={followupForm.notes} onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowFollowup(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleScheduleFollowup} className="btn-primary">Schedule</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1">{icon} {label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}
