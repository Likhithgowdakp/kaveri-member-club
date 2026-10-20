import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RefreshCw } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(50);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-950">Security & Operational Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all administrative actions, customer modifications, and campaign events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Admin User</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Target Entity</th>
                  <th className="py-3 px-6">Details</th>
                  <th className="py-3 px-6">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 font-mono">
                    <td className="py-3 px-6 text-slate-500 text-[11px]">
                      {new Date(l.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-6 font-bold text-brand-900 font-sans">
                      {l.admin_username || 'System'}
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-800 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600 font-sans">
                      {l.entity_type} {l.entity_id ? `(#${l.entity_id})` : ''}
                    </td>
                    <td className="py-3 px-6 text-slate-600 font-sans text-xs max-w-sm truncate">
                      {l.details || '—'}
                    </td>
                    <td className="py-3 px-6 text-slate-400 text-[11px]">
                      {l.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
