'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Pagination from '@/components/ui/Pagination';
import { auditApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AuditLog, User } from '@syncup/shared';
import { formatDateTime } from '@syncup/shared';
import toast from 'react-hot-toast';

export default function AuditPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    auditApi.list({ page, limit: 25, ...(userId ? { userId } : {}), ...(entityType ? { entityType } : {}) })
      .then((r) => {
        setLogs(r.data.data);
        setTotal(r.data.total);
        setTotalPages(r.data.totalPages);
      })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, userId, entityType]);

  return (
    <AppShell>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold">Audit Log</h1>
          <p className="text-sm text-zinc-500">Track all changes and actions in the system</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Users</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Entity Types</option>
            <option value="Lead">Lead</option>
            <option value="User">User</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-sm">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    {['Time', 'User', 'Action', 'Entity', 'Entity ID'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">{log.user?.name || 'System'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          log.action === 'create' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' :
                          log.action === 'delete' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entityType}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{log.entityId.slice(0, 8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={25} onChange={setPage} />
        )}
      </div>
    </AppShell>
  );
}
