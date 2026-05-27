'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { uploadApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { User, ImportResult } from '@syncup/shared';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface PreviewRow {
  row: number;
  data: Record<string, string>;
  errors: string[];
}

export default function UploadPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [filePath, setFilePath] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAssign = user?.role === 'super_admin';

  useEffect(() => {
    if (canAssign) {
      usersApi.list().then((r) => setUsers(r.data.data)).catch(() => {});
    }
  }, [canAssign]);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('Only CSV and XLSX files are supported');
      return;
    }
    setLoading(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await uploadApi.preview(file);
      setPreview(res.data.data.preview);
      setFilePath(res.data.data.filePath);
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await uploadApi.confirm(filePath, assignedToId || undefined);
      setResult(res.data.data);
      setPreview(null);
      setFilePath('');
      toast.success(`${res.data.data.imported} leads imported`);
    } catch {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const validRows = preview?.filter((r) => r.errors.length === 0) || [];
  const errorRows = preview?.filter((r) => r.errors.length > 0) || [];

  return (
    <AppShell>
      <div className="p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-bold">Import Leads</h1>
          <p className="text-sm text-zinc-500">Upload a CSV or XLSX file to bulk import leads</p>
        </div>

        {/* Drop zone */}
        {!preview && !result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`card p-12 text-center cursor-pointer border-2 border-dashed transition ${dragging ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <Upload size={32} className="mx-auto mb-3 text-zinc-400" />
            <p className="font-medium">Drop your file here or click to browse</p>
            <p className="text-sm text-zinc-400 mt-1">Supports CSV and XLSX. Required columns: Name, Company, Phone</p>
          </div>
        )}

        {loading && (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Processing file...</p>
          </div>
        )}

        {/* Preview */}
        {preview && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600"><CheckCircle size={14} /> {validRows.length} valid</span>
                {errorRows.length > 0 && <span className="flex items-center gap-1.5 text-red-500"><AlertCircle size={14} /> {errorRows.length} with errors</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setPreview(null); setFilePath(''); }} className="btn-secondary flex items-center gap-2"><X size={14} /> Cancel</button>
                {canAssign && (
                  <select className="input w-auto" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                    <option value="">Assign to (optional)</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
                <button onClick={handleConfirm} disabled={validRows.length === 0} className="btn-primary">
                  Import {validRows.length} Leads
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {preview.slice(0, 50).map((row) => (
                      <tr key={row.row} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-950' : ''}>
                        <td className="px-4 py-2.5 text-zinc-400">{row.row}</td>
                        <td className="px-4 py-2.5 font-medium">{row.data.Name}</td>
                        <td className="px-4 py-2.5">{row.data.Company}</td>
                        <td className="px-4 py-2.5">{row.data.Phone}</td>
                        <td className="px-4 py-2.5">{row.data.Email}</td>
                        <td className="px-4 py-2.5">
                          {row.errors.length > 0 ? (
                            <span className="text-xs text-red-600">{row.errors.join(', ')}</span>
                          ) : (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold">Import Complete</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 text-center">
                <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                <p className="text-sm text-green-700 mt-1">Leads imported</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-center">
                <p className="text-3xl font-bold text-red-600">{result.failed}</p>
                <p className="text-sm text-red-700 mt-1">Failed rows</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Errors:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setResult(null)} className="btn-primary">Import Another File</button>
          </div>
        )}

        {/* Format guide */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3">File Format Guide</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  {['Name *', 'Designation', 'Company *', 'Phone *', 'Email', 'Lead Type'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-zinc-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">John Doe</td>
                  <td className="px-3 py-2">CEO</td>
                  <td className="px-3 py-2">Acme Corp</td>
                  <td className="px-3 py-2">+91-9876543210</td>
                  <td className="px-3 py-2">john@acme.com</td>
                  <td className="px-3 py-2">inbound</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400 mt-2">* Required. Lead Type can be: inbound, outbound, cold (defaults to cold)</p>
        </div>
      </div>
    </AppShell>
  );
}
