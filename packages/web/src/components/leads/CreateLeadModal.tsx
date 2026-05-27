'use client';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { leadsApi } from '@/lib/api';
import { LEAD_TYPES, LEAD_TYPE_LABELS } from '@syncup/shared';
import type { User } from '@syncup/shared';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  users?: User[];
  currentUserId: string;
  canAssign?: boolean;
}

export default function CreateLeadModal({ open, onClose, onCreated, users = [], currentUserId, canAssign }: Props) {
  const [form, setForm] = useState({
    name: '', designation: '', company: '', phone: '', email: '',
    leadType: 'cold', assignedToId: currentUserId,
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company || !form.phone) {
      toast.error('Name, company, and phone are required');
      return;
    }
    setLoading(true);
    try {
      await leadsApi.create(form);
      toast.success('Lead created');
      setForm({ name: '', designation: '', company: '', phone: '', email: '', leadType: 'cold', assignedToId: currentUserId });
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Name *</label>
            <input className="input" placeholder="John Doe" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Designation</label>
            <input className="input" placeholder="CEO" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Company *</label>
            <input className="input" placeholder="Acme Corp" value={form.company} onChange={(e) => set('company', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Phone *</label>
            <input className="input" placeholder="+91-9876543210" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Email</label>
            <input className="input" type="email" placeholder="john@acme.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Lead Type</label>
            <select className="input" value={form.leadType} onChange={(e) => set('leadType', e.target.value)}>
              {LEAD_TYPES.map((t) => <option key={t} value={t}>{LEAD_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          {canAssign && (
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5">Assign To</label>
              <select className="input" value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
