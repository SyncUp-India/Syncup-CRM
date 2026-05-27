'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, RefreshCw } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import Modal from '@/components/ui/Modal';
import { RoleBadge } from '@/components/ui/Badge';
import { settingsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { User, EmailTemplate, WhatsAppTemplate } from '@syncup/shared';
import { LEAD_STAGE_LABELS } from '@syncup/shared';
import toast from 'react-hot-toast';

type Tab = 'users' | 'email_templates' | 'whatsapp_templates' | 'smtp';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [editingEmail, setEditingEmail] = useState<EmailTemplate | null>(null);
  const [editingWa, setEditingWa] = useState<WhatsAppTemplate | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'associate' });
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '', user: '', pass: '', from: '' });
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'super_admin';

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
    settingsApi.getTemplates().then((r) => setEmailTemplates(r.data.data)).catch(() => {});
    settingsApi.getWhatsAppTemplates().then((r) => setWaTemplates(r.data.data)).catch(() => {});
    if (isAdmin) {
      settingsApi.getSmtp().then((r) => setSmtpForm(r.data.data || {})).catch(() => {});
    }
  }, [isAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await usersApi.create(userForm);
      setUsers((u) => [res.data.data, ...u]);
      setUserForm({ name: '', email: '', password: '', role: 'associate' });
      setShowCreateUser(false);
      toast.success('User created');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await usersApi.delete(id);
      setUsers((u) => u.filter((x) => x.id !== id));
      toast.success('User deactivated');
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const handleSaveEmail = async () => {
    if (!editingEmail) return;
    try {
      await settingsApi.updateTemplate(editingEmail.stage, { subject: editingEmail.subject, body: editingEmail.body });
      setEmailTemplates((t) => t.map((x) => x.stage === editingEmail.stage ? editingEmail : x));
      setEditingEmail(null);
      toast.success('Email template saved');
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleSaveWa = async () => {
    if (!editingWa) return;
    try {
      await settingsApi.updateWhatsAppTemplate(editingWa.stage, { message: editingWa.message });
      setWaTemplates((t) => t.map((x) => x.stage === editingWa.stage ? editingWa : x));
      setEditingWa(null);
      toast.success('WhatsApp template saved');
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsApi.updateSmtp(smtpForm);
      toast.success('SMTP settings saved');
    } catch {
      toast.error('Failed to save SMTP settings');
    }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'users', label: 'Users' },
    { value: 'email_templates', label: 'Email Templates' },
    { value: 'whatsapp_templates', label: 'WhatsApp Templates' },
    { value: 'smtp', label: 'SMTP Config' },
  ];

  return (
    <AppShell>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-zinc-500">Manage users, templates, and configuration</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition -mb-px ${tab === t.value ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowCreateUser(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={14} /> Add User
                </button>
              </div>
            )}
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    {['Name', 'Email', 'Role', 'Joined', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3 text-zinc-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {u.id !== user?.id && (
                            <button onClick={() => handleDeactivateUser(u.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email templates */}
        {tab === 'email_templates' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button
                  onClick={() => settingsApi.seedTemplates().then(() => settingsApi.getTemplates().then((r) => setEmailTemplates(r.data.data))).catch(() => toast.error('Failed'))}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Reset to Defaults
                </button>
              </div>
            )}
            <p className="text-sm text-zinc-500">These emails are sent automatically when a lead's stage changes. Use <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{'{{name}}'}</code> for the lead's name.</p>
            {emailTemplates.map((t) => (
              <div key={t.stage} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{LEAD_STAGE_LABELS[t.stage]}</span>
                  {isAdmin && (
                    <button onClick={() => setEditingEmail({ ...t })} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mb-1"><strong>Subject:</strong> {t.subject}</p>
                <p className="text-xs text-zinc-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: t.body }} />
              </div>
            ))}
          </div>
        )}

        {/* WhatsApp templates */}
        {tab === 'whatsapp_templates' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              These messages are sent via WhatsApp when you change a lead's stage. Use <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{'{{name}}'}</code> for the lead's name.
            </p>
            {waTemplates.map((t) => (
              <div key={t.stage} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{LEAD_STAGE_LABELS[t.stage]}</span>
                  {isAdmin && (
                    <button onClick={() => setEditingWa({ ...t })} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{t.message}</p>
              </div>
            ))}
            {waTemplates.length === 0 && (
              <div className="card p-8 text-center text-zinc-400 text-sm">No WhatsApp templates found.</div>
            )}
          </div>
        )}

        {/* SMTP */}
        {tab === 'smtp' && isAdmin && (
          <form onSubmit={handleSaveSmtp} className="card p-6 space-y-4 max-w-md">
            <h2 className="text-sm font-semibold">SMTP Configuration</h2>
            {[
              { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
              { key: 'port', label: 'Port', placeholder: '587' },
              { key: 'user', label: 'Username', placeholder: 'you@gmail.com' },
              { key: 'pass', label: 'Password', placeholder: '••••••••', type: 'password' },
              { key: 'from', label: 'From Address', placeholder: 'SyncUp CRM <you@gmail.com>' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5">{label}</label>
                <input
                  type={type || 'text'}
                  className="input"
                  placeholder={placeholder}
                  value={(smtpForm as Record<string, string>)[key] || ''}
                  onChange={(e) => setSmtpForm({ ...smtpForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" className="btn-primary">Save SMTP Settings</button>
          </form>
        )}
      </div>

      {/* Create User Modal */}
      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Create User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Full Name</label>
            <input className="input" placeholder="Jane Doe" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Email</label>
            <input type="email" className="input" placeholder="jane@company.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Password</label>
            <input type="password" className="input" placeholder="Min. 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Role</label>
            <select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="associate">Associate</option>
              <option value="lead">Lead</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Email Template Modal */}
      <Modal open={!!editingEmail} onClose={() => setEditingEmail(null)} title="Edit Email Template" size="lg">
        {editingEmail && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{LEAD_STAGE_LABELS[editingEmail.stage]}</p>
            <div>
              <label className="block text-xs font-medium mb-1.5">Subject</label>
              <input className="input" value={editingEmail.subject} onChange={(e) => setEditingEmail({ ...editingEmail, subject: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Body (HTML, use {'{{name}}'} for lead name)</label>
              <textarea rows={8} className="input resize-none font-mono text-xs" value={editingEmail.body} onChange={(e) => setEditingEmail({ ...editingEmail, body: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingEmail(null)} className="btn-secondary flex items-center gap-1.5"><X size={14} /> Cancel</button>
              <button onClick={handleSaveEmail} className="btn-primary flex items-center gap-1.5"><Save size={14} /> Save</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit WhatsApp Template Modal */}
      <Modal open={!!editingWa} onClose={() => setEditingWa(null)} title="Edit WhatsApp Template" size="lg">
        {editingWa && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{LEAD_STAGE_LABELS[editingWa.stage]}</p>
            <div>
              <label className="block text-xs font-medium mb-1.5">Message (use {'{{name}}'} for lead name)</label>
              <textarea
                rows={5}
                className="input resize-none"
                value={editingWa.message}
                onChange={(e) => setEditingWa({ ...editingWa, message: e.target.value })}
                placeholder="Hi {{name}}, ..."
              />
            </div>
            <p className="text-xs text-zinc-400">Preview: {editingWa.message.replace('{{name}}', 'Rajesh Kumar')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingWa(null)} className="btn-secondary flex items-center gap-1.5"><X size={14} /> Cancel</button>
              <button onClick={handleSaveWa} className="btn-primary flex items-center gap-1.5"><Save size={14} /> Save</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
