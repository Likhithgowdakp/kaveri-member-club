import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Filter, ChevronLeft, ChevronRight, Award, Send, Check } from 'lucide-react';

interface AdminMembersProps {
  onSelectMember: (memberId: number) => void;
}

export const AdminMembers: React.FC<AdminMembersProps> = ({ onSelectMember }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentMap, setSentMap] = useState<Record<number, boolean>>({});

  const handleSendQuickSms = async (e: React.MouseEvent, m: any) => {
    e.stopPropagation();
    try {
      const msg = `Namaskara ${m.full_name}! Welcome to KAVERI CLUB HALAGURU. Your Member ID is ${m.member_number} with ${m.loyalty_points} loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri.`;
      await api.sendAppSms(m.id, msg);
      setSentMap((prev) => ({ ...prev, [m.id]: true }));
      setTimeout(() => {
        setSentMap((prev) => ({ ...prev, [m.id]: false }));
      }, 4000);
    } catch (err: any) {
      alert(err.detail || 'Failed to dispatch SMS from app.');
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.listMembers({
        q: searchQuery.trim() || undefined,
        status_filter: statusFilter || undefined,
        page,
        page_size: pageSize,
      });
      setMembers(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-950">Members Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {total} customers registered across Halaguru and Kanakapura
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-brand-600 focus:ring-1 focus:ring-brand-600 w-56 sm:w-64"
            />
          </form>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading members directory...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No matching member records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Member ID</th>
                  <th className="py-3.5 px-6">Full Name</th>
                  <th className="py-3.5 px-6">Primary Phone</th>
                  <th className="py-3.5 px-6">Loyalty Points</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Registered</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMember(m.id)}
                    className="hover:bg-brand-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-mono font-bold text-brand-900">
                      {m.member_number}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {m.full_name}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">
                      {m.primary_phone}
                    </td>
                    <td className="py-4 px-6 font-bold text-gold-700 flex items-center space-x-1">
                      <Award className="w-3.5 h-3.5 text-gold-500" />
                      <span>{m.loyalty_points} pts</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          m.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'suspended'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={(e) => handleSendQuickSms(e, m)}
                          title="Send Official SMS from Kaveri App (Sender: KAVERI CLUB HALAGURU)"
                          className={`px-3 py-1.5 rounded-lg text-white font-bold text-[11px] shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer ${
                            sentMap[m.id]
                              ? 'bg-emerald-600'
                              : 'bg-brand-900 hover:bg-brand-800 active:scale-95'
                          }`}
                        >
                          {sentMap[m.id] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>SMS Sent!</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-gold-400" />
                              <span>Send App SMS</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectMember(m.id)}
                          className="font-bold text-brand-700 hover:text-brand-900 text-xs"
                        >
                          Profile →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages} ({total} records)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
