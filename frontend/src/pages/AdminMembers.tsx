import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { Search, Filter, ChevronLeft, ChevronRight, Award, Send, Check, Trash2, CheckCircle, MessageCircle, Smartphone } from 'lucide-react';

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
  const [dispatchMap, setDispatchMap] = useState<Record<number, { sent: boolean; waUrl: string; smsUrl: string }>>({});

  // Delete / Washout state
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const handleSendQuickSms = async (e: React.MouseEvent, m: any) => {
    e.stopPropagation();
    const cleanPhone = m.primary_phone.replace(/[^0-9]/g, '').slice(-10);
    const msg = `Namaskara ${m.full_name}! Welcome to KAVERI CLUB HALAGURU. Your Member ID is ${m.member_number} with ${m.loyalty_points || 50} loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri.`;
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
    const smsUrl = `sms:+91${cleanPhone}?&body=${encodeURIComponent(msg)}`;

    // 1-Click: Open WhatsApp directly without any confirmation prompt
    try {
      window.open(waUrl, '_blank');
    } catch {
      // Fallback if browser pop-up blocker is active
    }

    setDispatchMap((prev) => ({
      ...prev,
      [m.id]: { sent: true, waUrl, smsUrl },
    }));

    // Trigger backend app SMS & WhatsApp dispatch under KAVERI CLUB HALAGURU
    try {
      await api.sendAppSms(m.id, msg);
    } catch (err: any) {
      console.warn('Backend SMS dispatch log:', err);
    }

    setTimeout(() => {
      setDispatchMap((prev) => ({
        ...prev,
        [m.id]: { ...prev[m.id], sent: false },
      }));
    }, 15000);
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

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleteLoading(true);
    try {
      await api.deleteMember(memberToDelete.id);
      setDeleteSuccessMsg(`Member ${memberToDelete.member_number} (${memberToDelete.full_name}) and all data washed out permanently.`);
      setMemberToDelete(null);
      await fetchMembers();
      setTimeout(() => setDeleteSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.detail || 'Failed to delete member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Delete / Washout success banner */}
      {deleteSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{deleteSuccessMsg}</span>
        </div>
      )}

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
                        {dispatchMap[m.id]?.sent ? (
                          <div className="flex items-center space-x-1">
                            <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center space-x-1 shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                              <span>Sent!</span>
                            </span>
                            <a
                              href={dispatchMap[m.id].waUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center space-x-0.5 shadow-sm"
                              title="Open WhatsApp Chat Directly"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-200" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={dispatchMap[m.id].smsUrl}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[10px] flex items-center space-x-0.5 shadow-sm"
                              title="Open Device SMS Directly"
                            >
                              <Smartphone className="w-3 h-3 text-blue-200" />
                              <span>SMS</span>
                            </a>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSendQuickSms(e, m)}
                            title="1-Click: Send Official SMS from App & Open WhatsApp Directly"
                            className="px-3 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 active:scale-95 text-white font-bold text-[11px] shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-gold-400" />
                            <span>1-Click SMS & WhatsApp</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectMember(m.id)}
                          className="font-bold text-brand-700 hover:text-brand-900 text-xs"
                        >
                          Profile →
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(m);
                          }}
                          title="Permanently Delete Member & Wash Out Data"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Admin Member Delete & Washout Confirmation Modal */}
      <Modal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        title="⚠️ Permanent Member Deletion & Washout"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to permanently delete member <strong className="font-bold text-brand-950 font-mono">{memberToDelete?.member_number}</strong> (<strong className="font-bold">{memberToDelete?.full_name}</strong>)?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
            <p className="font-bold">Irreversible Data Erasure:</p>
            <p className="mt-1 leading-relaxed">
              All member records, phone numbers ({memberToDelete?.primary_phone}), loyalty points, consent histories, and campaign records will be completely washed out from the database immediately.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setMemberToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleDeleteMember}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteLoading ? 'Washing out data...' : 'Permanently Delete Member'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
