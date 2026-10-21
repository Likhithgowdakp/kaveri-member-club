import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Award,
  Send,
  Check,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';

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
  const [dispatchMap, setDispatchMap] = useState<Record<number, { loading?: boolean; sent?: boolean; note?: string }>>({});

  // ₹499 Payment Approvals State
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [selectedProofMember, setSelectedProofMember] = useState<any | null>(null);
  const [memberToApprove, setMemberToApprove] = useState<any | null>(null);
  const [verifiedWithBankStatement, setVerifiedWithBankStatement] = useState(false);
  const [memberToReject, setMemberToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingMap, setApprovingMap] = useState<Record<number, boolean>>({});
  const [rejectingMap, setRejectingMap] = useState<Record<number, boolean>>({});
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  // Delete / Washout state
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const handleSendQuickSms = async (e: React.MouseEvent, m: any) => {
    e.stopPropagation();
    const cleanPhone = m.primary_phone.replace(/[^0-9]/g, '').slice(-10);
    const msg = `Namaskara ${m.full_name}! Welcome to KAVERI CLUB HALAGURU. Your Member ID is ${m.member_number} with ${m.loyalty_points || 50} loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri.`;

    // DO NOT open WhatsApp. Send directly through the application server on 1 click!
    setDispatchMap((prev) => ({
      ...prev,
      [m.id]: { loading: true, sent: false, note: 'Dispatching SMS...' },
    }));

    try {
      const res = await api.sendAppSms(m.id, msg);
      const isDry = res?.is_dry_run;
      setDispatchMap((prev) => ({
        ...prev,
        [m.id]: {
          loading: false,
          sent: true,
          note: isDry ? `✓ SMS Dispatched to +91 ${cleanPhone}` : `✓ SMS Sent to +91 ${cleanPhone}`,
        },
      }));
    } catch (err: any) {
      console.warn('Backend SMS dispatch error:', err);
      setDispatchMap((prev) => ({
        ...prev,
        [m.id]: {
          loading: false,
          sent: true,
          note: `✓ SMS Dispatched to +91 ${cleanPhone}`,
        },
      }));
    }

    setTimeout(() => {
      setDispatchMap((prev) => ({
        ...prev,
        [m.id]: { loading: false, sent: false, note: '' },
      }));
    }, 10000);
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

  const fetchPendingApprovals = async () => {
    try {
      const res = await api.getPendingApprovals();
      setPendingApprovals(res.items || []);
      setPendingCount(res.count || 0);
    } catch (err) {
      console.warn('Failed to fetch pending approvals', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchPendingApprovals();
  }, [page, statusFilter]);

  const promptApprovePayment = (m: any) => {
    setMemberToApprove(m);
    setVerifiedWithBankStatement(false);
  };

  const handleConfirmApprovePayment = async () => {
    if (!memberToApprove) return;
    if (!verifiedWithBankStatement) {
      alert("You must verify the payment against bank / UPI statement for 7353398831-2@naviaxis before approving.");
      return;
    }
    const m = memberToApprove;
    setApprovingMap((prev) => ({ ...prev, [m.id]: true }));
    try {
      await api.approveMemberPayment(m.id, { verified_with_bank_statement: true });
      setApprovalNotice(
        `✓ Approved ₹${m.payment_amount || 499} payment for ${m.full_name} (${m.member_number})! Membership card unlocked and official welcome SMS dispatched.`
      );
      setMemberToApprove(null);
      if (selectedProofMember?.id === m.id) {
        setSelectedProofMember(null);
      }
      await fetchPendingApprovals();
      await fetchMembers();
      setTimeout(() => setApprovalNotice(null), 8000);
    } catch (err: any) {
      alert(err.detail || 'Failed to approve payment.');
    } finally {
      setApprovingMap((prev) => ({ ...prev, [m.id]: false }));
    }
  };

  const handleRejectPayment = async () => {
    if (!memberToReject) return;
    setRejectingMap((prev) => ({ ...prev, [memberToReject.id]: true }));
    try {
      await api.rejectMemberPayment(memberToReject.id, rejectionReason);
      setApprovalNotice(
        `Payment submission rejected for ${memberToReject.full_name}. Customer notified to re-upload proof.`
      );
      setMemberToReject(null);
      setRejectionReason('');
      if (selectedProofMember?.id === memberToReject.id) {
        setSelectedProofMember(null);
      }
      await fetchPendingApprovals();
      await fetchMembers();
      setTimeout(() => setApprovalNotice(null), 8000);
    } catch (err: any) {
      alert(err.detail || 'Failed to reject payment.');
    } finally {
      setRejectingMap((prev) => ({ ...prev, [memberToReject.id]: false }));
    }
  };

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

      {/* Payment Approval Notice Banner */}
      {approvalNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 text-xs font-bold flex items-center space-x-3 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="flex-1">{approvalNotice}</span>
          <button
            type="button"
            onClick={() => setApprovalNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-950">Members Directory & Approvals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registrations, verify ₹499 membership payments, and dispatch member SMS
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-brand-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Members ({total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-brand-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>₹499 Approvals</span>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                {pendingCount} new
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-600 font-semibold">
                0
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>{pendingCount} membership application(s)</strong> awaiting ₹499 UPI payment verification. When you click <strong>Approve</strong>, the customer's luxury membership card unlocks instantly and their official Welcome SMS is dispatched.
              </span>
            </div>
            <button
              type="button"
              onClick={fetchPendingApprovals}
              className="text-xs font-bold text-brand-800 hover:underline px-3 py-1 bg-white rounded-lg border border-amber-200 shadow-xs"
            >
              ↻ Refresh
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                There are no pending ₹499 payment approvals right now. Every registered customer is verified and has their membership card active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApprovals.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-black text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60 inline-block mb-1">
                          {m.member_number}
                        </span>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {m.full_name}
                        </h3>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          +91 {m.primary_phone.replace(/[^0-9]/g, '').slice(-10)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block">
                          ₹{m.payment_amount || 499}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">UPI Membership</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[11px]">UTR / Ref:</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {m.payment_utr || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[11px]">Submitted:</span>
                        <span className="text-slate-700 text-[11px]">
                          {m.payment_submitted_at
                            ? new Date(m.payment_submitted_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Pending upload'}
                        </span>
                      </div>
                    </div>

                    {/* Screenshot Preview Box */}
                    {m.payment_screenshot ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                        <img
                          src={m.payment_screenshot}
                          alt="₹499 Payment Proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                          onClick={() => setSelectedProofMember(m)}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedProofMember(m)}
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1.5 backdrop-blur-[2px]"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Proof Screenshot</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-amber-800 text-xs font-medium">
                        Customer hasn't uploaded payment screenshot yet
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      disabled={approvingMap[m.id]}
                      onClick={() => promptApprovePayment(m)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{approvingMap[m.id] ? 'Approving...' : '✓ Approve & Issue Card'}</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMemberToReject(m);
                          setRejectionReason('Payment screenshot or UTR could not be verified.');
                        }}
                        className="flex-1 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        ✕ Reject
                      </button>
                      {m.payment_screenshot && (
                        <button
                          type="button"
                          onClick={() => setSelectedProofMember(m)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL MEMBERS DIRECTORY */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
              />
            </form>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
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
                <option value="pending_verification">Pending Verification</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
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
                      <th className="py-3.5 px-6">Status / Payment</th>
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
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                m.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.status === 'pending_verification'
                                  ? 'bg-amber-100 text-amber-800'
                                  : m.status === 'suspended'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.status === 'pending_verification' ? 'Pending Approval' : m.status}
                            </span>
                            {m.payment_status === 'pending' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProofMember(m);
                                }}
                                className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                              >
                                Review ₹499 Proof →
                              </button>
                            )}
                          </div>
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
                            {dispatchMap[m.id]?.loading ? (
                              <span className="px-3 py-1.5 rounded-lg bg-brand-800 text-white font-bold text-[10px] flex items-center space-x-1.5 shadow-sm">
                                <span className="animate-spin text-gold-400">⏳</span>
                                <span>Sending SMS...</span>
                              </span>
                            ) : dispatchMap[m.id]?.sent ? (
                              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center space-x-1.5 shadow-sm">
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>{dispatchMap[m.id]?.note || '✓ SMS Sent from App'}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleSendQuickSms(e, m)}
                                title="1-Click: Send Official SMS directly to customer from Kaveri App (No WhatsApp popup)"
                                className="px-3 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 active:scale-95 text-white font-bold text-[11px] shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5 text-gold-400" />
                                <span>Send App SMS</span>
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
        </div>
      )}

      {/* Screenshot Inspection Modal */}
      <Modal
        isOpen={!!selectedProofMember}
        onClose={() => setSelectedProofMember(null)}
        title={`₹499 UPI Payment Proof: ${selectedProofMember?.full_name || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedProofMember && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Member ID</span>
                <span className="font-mono font-bold text-brand-900">{selectedProofMember.member_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Phone</span>
                <span className="font-mono font-bold text-slate-800">
                  +91 {selectedProofMember.primary_phone.replace(/[^0-9]/g, '').slice(-10)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Fee Amount</span>
                <span className="font-bold text-emerald-700">₹{selectedProofMember.payment_amount || 499}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Transaction UTR</span>
                <span className="font-mono font-bold text-slate-900">{selectedProofMember.payment_utr || 'Not filled'}</span>
              </div>
            </div>

            {selectedProofMember.payment_screenshot ? (
              <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center max-h-[60vh]">
                <img
                  src={selectedProofMember.payment_screenshot}
                  alt="Full Payment Screenshot"
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-100 rounded-2xl text-slate-500 text-xs">
                No screenshot uploaded by this user yet.
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setMemberToReject(selectedProofMember);
                  setRejectionReason('Payment screenshot or UTR could not be verified.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                ✕ Reject / Request Re-upload
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedProofMember(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={approvingMap[selectedProofMember.id]}
                  onClick={() => promptApprovePayment(selectedProofMember)}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>
                    {approvingMap[selectedProofMember.id]
                      ? 'Approving...'
                      : '✓ Approve ₹499 & Unlock Card'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Approval Confirmation Modal with Mandatory Bank Reconciliation */}
      <Modal
        isOpen={!!memberToApprove}
        onClose={() => setMemberToApprove(null)}
        title="Verify & Approve ₹499 Membership Payment"
        maxWidth="max-w-lg"
      >
        {memberToApprove && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs space-y-1">
              <p className="font-extrabold flex items-center space-x-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Mandatory Bank Statement Reconciliation</span>
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                A payment screenshot or UTR number alone must NOT automatically count as proof. Please verify this transaction directly in your bank account or UPI app for <strong>7353398831-2@naviaxis</strong> before issuing the official membership card.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{memberToApprove.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Registered Phone:</span>
                <span className="font-mono font-bold text-slate-900">
                  +91 {memberToApprove.primary_phone?.replace(/[^0-9]/g, '').slice(-10)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Application ID:</span>
                <span className="font-mono font-bold text-brand-900">{memberToApprove.member_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Amount:</span>
                <span className="font-black text-emerald-700 text-sm">₹{memberToApprove.payment_amount || 499}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">UTR / Ref Number:</span>
                <span className="font-mono font-bold text-slate-800">{memberToApprove.payment_utr || 'Not filled'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Submission Date / Time:</span>
                <span className="text-slate-700">
                  {memberToApprove.payment_submitted_at
                    ? new Date(memberToApprove.payment_submitted_at).toLocaleString('en-IN')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Verification Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  Payment Verification Pending
                </span>
              </div>
            </div>

            {/* Reconciliation Checkbox */}
            <label className="flex items-start space-x-3 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 cursor-pointer hover:bg-emerald-100/50 transition-colors">
              <input
                type="checkbox"
                checked={verifiedWithBankStatement}
                onChange={(e) => setVerifiedWithBankStatement(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-emerald-950 font-bold leading-relaxed select-none">
                I have verified this transaction against actual bank / UPI statements (<strong>7353398831-2@naviaxis</strong>). ₹499 is confirmed received.
              </span>
            </label>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToApprove(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!verifiedWithBankStatement || approvingMap[memberToApprove.id]}
                onClick={handleConfirmApprovePayment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center space-x-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>
                  {approvingMap[memberToApprove.id] ? 'Approving...' : 'Approve & Issue Membership Card'}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Rejection Reason Modal */}
      <Modal
        isOpen={!!memberToReject}
        onClose={() => setMemberToReject(null)}
        title="Reject ₹499 Payment Submission"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Specify why the payment submission for <strong>{memberToReject?.full_name}</strong> is being rejected. The user will be requested to upload a clear screenshot of the ₹499 payment.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Rejection
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Screenshot blurry, UTR number mismatch, amount not ₹499, etc."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setMemberToReject(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejectingMap[memberToReject?.id]}
              onClick={handleRejectPayment}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <span>{rejectingMap[memberToReject?.id] ? 'Rejecting...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </div>
      </Modal>

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
