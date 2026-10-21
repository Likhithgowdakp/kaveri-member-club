import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Award,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Edit,
  PlusCircle,
  History,
  AlertCircle,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface AdminMemberDetailProps {
  memberId: number;
  onBack: () => void;
}

export const AdminMemberDetail: React.FC<AdminMemberDetailProps> = ({ memberId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Points modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsDelta, setPointsDelta] = useState('50');
  const [pointsNote, setPointsNote] = useState('');
  const [pointsSubmitting, setPointsSubmitting] = useState(false);

  // Edit status modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStatus, setEditStatus] = useState('active');
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete & Washout modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Official App SMS & WhatsApp Messaging state (Sent from App under KAVERI CLUB HALAGURU)
  const [waMessage, setWaMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getMemberDetail(memberId);
      setData(res);
      setEditStatus(res.member.status);
      setEditName(res.member.full_name);
      setEditAddress(res.member.address || '');
      setEditNotes(res.member.notes || '');

      // Set default personalized message under business name
      const defaultMsg = `Namaskara ${res.member.full_name}! Welcome to KAVERI CLUB HALAGURU. Your Member ID is ${res.member.member_number} with ${res.member.loyalty_points || 50} loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri.`;
      setWaMessage(defaultMsg);
    } catch (err: any) {
      setErrorMsg('Failed to load member details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAppSms = async () => {
    if (!waMessage.trim() || !data?.member) return;
    const cleanPhone = data.member.primary_phone.replace(/[^0-9]/g, '').slice(-10);

    // Send directly through app backend. DO NOT redirect or open WhatsApp!
    setSmsSending(true);
    setSmsSuccess(null);
    setSmsError(null);

    try {
      const res = await api.sendAppSms(data.member.id, waMessage.trim());
      const dryNote = res?.is_dry_run ? ' (App Server Mode)' : ` (Gateway Ref: ${res?.provider_message_id || 'OK'})`;
      setSmsSuccess(`✓ Official SMS successfully dispatched directly to +91 ${cleanPhone} under sender 'KAVERI CLUB HALAGURU'${dryNote}!`);
    } catch (err: any) {
      console.warn('Backend SMS error:', err);
      setSmsError(err.detail || 'Failed to dispatch SMS through server.');
    } finally {
      setSmsSending(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [memberId]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsDelta, 10);
    if (isNaN(pts) || !pointsNote.trim()) return;

    setPointsSubmitting(true);
    try {
      await api.adjustLoyaltyPoints(memberId, pts, pointsNote.trim());
      setShowPointsModal(false);
      setPointsNote('');
      fetchDetail();
    } catch (err: any) {
      alert(err.detail || 'Failed to adjust points.');
    } finally {
      setPointsSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.updateMember(memberId, {
        full_name: editName.trim(),
        address: editAddress.trim() || null,
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      setShowEditModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.detail || 'Failed to update member.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!data?.member) return;
    setDeleteLoading(true);
    try {
      await api.deleteMember(memberId);
      alert(`Member ${data.member.member_number} (${data.member.full_name}) and all data have been permanently washed out from the database.`);
      setShowDeleteModal(false);
      onBack();
    } catch (err: any) {
      alert(err.detail || 'Failed to delete member.');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500 text-sm">
        Loading member record #{memberId}...
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="font-bold">{errorMsg || 'Member not found'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold">
          Back to Directory
        </button>
      </div>
    );
  }

  const { member, consents, consent_history, loyalty_ledger } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-brand-900 flex items-center space-x-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Directory</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPointsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gold-600 hover:bg-gold-500 text-brand-950 font-bold text-xs shadow-sm flex items-center space-x-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adjust Loyalty Points</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center space-x-1"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs border border-rose-200 flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete Member & Wash Out</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-brand-900 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                {member.member_number}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  member.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : member.status === 'suspended'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {member.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">{member.full_name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer record managed by Kaveri Electronic Halaguru
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Current Points Balance
            </span>
            <p className="text-2xl font-black text-gold-700 flex items-center justify-end space-x-1 mt-0.5">
              <Award className="w-5 h-5 text-gold-500" />
              <span>{member.loyalty_points} pts</span>
            </p>
          </div>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Primary Mobile
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
              {member.primary_phone}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Alternative Phone
            </span>
            <p className="font-mono text-slate-700 text-sm mt-0.5">
              {member.alt_phone || 'None provided'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <p className="text-slate-700 text-sm mt-0.5">{member.email || 'None provided'}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Home Address
            </span>
            <p className="text-slate-700 text-sm mt-0.5">{member.address || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Registration Date
            </span>
            <p className="text-slate-700 text-sm mt-0.5">
              {new Date(member.created_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Official App SMS Dispatch (Sent under KAVERI CLUB HALAGURU, NEVER owner's personal phone) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-brand-900 text-gold-400 flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">
                Official SMS Dispatch (Sent from Kaveri App)
              </h2>
              <p className="text-xs text-slate-500">
                Sent directly from this application server to {member.full_name}'s phone ({member.primary_phone})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-brand-50 text-brand-900 border border-brand-300 inline-flex items-center space-x-1">
              <span>Sender ID:</span>
              <span className="font-black text-brand-950">KAVERI CLUB HALAGURU</span>
            </span>
          </div>
        </div>

        {smsSuccess && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{smsSuccess}</span>
          </div>
        )}

        {smsError && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {smsError}
          </div>
        )}

        {/* Template Buttons */}
        <div className="mb-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Official SMS Templates (Sender: KAVERI CLUB HALAGURU):
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setWaMessage(
                  `Namaskara ${member.full_name}! Welcome to KAVERI CLUB HALAGURU. Your Member ID is ${member.member_number} with ${member.loyalty_points} loyalty points. Visit Kaveri Electronic, HMS Complex, Kanakapura Road, Halaguru. Team Kaveri.`
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition-all flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span>Welcome & Member ID</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWaMessage(
                  `Namaskara ${member.full_name}! Special member discount at Kaveri Electronic Halaguru! Up to 20% off on Smart TVs, Refrigerators & Mixers this week. Visit us at HMS Complex, Halaguru. Team Kaveri.`
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition-all flex items-center space-x-1"
            >
              <span>🎉 Festive Discount Offer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWaMessage(
                  `Namaskara ${member.full_name}! Your KAVERI CLUB HALAGURU points balance is ${member.loyalty_points} points. Show your card at Kaveri Electronic Halaguru to redeem instant discounts. Team Kaveri.`
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition-all flex items-center space-x-1"
            >
              <span>💳 Points Balance Update</span>
            </button>
          </div>
        </div>

        {/* Message Textarea */}
        <div className="space-y-3">
          <textarea
            rows={3}
            value={waMessage}
            onChange={(e) => setWaMessage(e.target.value)}
            className="w-full p-3 rounded-2xl border border-slate-300 text-xs text-slate-800 focus:border-brand-600 focus:ring-1 focus:ring-brand-500 font-sans"
            placeholder="Type your official SMS message..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Dispatched directly from Kaveri server • Sender ID: <strong>KAVERI CLUB HALAGURU</strong>.
            </p>

            <button
              type="button"
              disabled={smsSending || !waMessage.trim()}
              onClick={handleSendAppSms}
              className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4 text-gold-400" />
              <span>{smsSending ? 'Sending SMS from App...' : 'Send App SMS to Phone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Marketing Consents */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex items-center space-x-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-brand-700" />
          <h2 className="text-base font-bold text-brand-950">
            DPDP Act 2023 Marketing Channel Consents
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {consents.map((c: any) => (
            <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                {c.channel === 'whatsapp' ? (
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Smartphone className="w-5 h-5 text-brand-600" />
                )}
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase">
                    {c.channel} Channel
                  </span>
                  <span
                    className={`font-extrabold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                      c.consent_state === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.consent_state}
                  </span>
                </div>
                <p className="text-slate-500 mt-1">Source: {c.source}</p>
                {c.granted_at && (
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Granted: {new Date(c.granted_at).toLocaleDateString('en-IN')}
                  </p>
                )}
                {c.withdrawn_at && (
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Withdrawn: {new Date(c.withdrawn_at).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consent Audit Trail Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-5 h-5 text-slate-600" />
          <h2 className="text-base font-bold text-brand-950">
            Consent Audit Trail
          </h2>
        </div>

        {consent_history.length === 0 ? (
          <p className="text-xs text-slate-400">No consent changes recorded.</p>
        ) : (
          <div className="space-y-3">
            {consent_history.map((item: any) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs flex items-start justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="uppercase text-brand-800 font-mono text-[11px]">
                      {item.channel}
                    </span>
                    <span>•</span>
                    <span className="text-slate-600">
                      {item.previous_state || 'none'} →{' '}
                      <span className="font-bold text-slate-900">{item.new_state}</span>
                    </span>
                  </p>
                  <p className="text-slate-500 mt-1">Reason: {item.reason || 'Not specified'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Source: {item.action_source} • Version: {item.notice_version}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(item.created_at).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loyalty Transactions Ledger */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-gold-600" />
            <h2 className="text-base font-bold text-brand-950">Loyalty Points Ledger</h2>
          </div>
          <span className="text-xs text-slate-400">Auditable Points Log</span>
        </div>

        {loyalty_ledger.length === 0 ? (
          <p className="text-xs text-slate-400">No points transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Points</th>
                  <th className="py-2.5">Reference Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loyalty_ledger.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 font-semibold uppercase text-[11px] text-slate-800">
                      {tx.transaction_type}
                    </td>
                    <td
                      className={`py-3 font-bold ${
                        tx.points >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                    </td>
                    <td className="py-3 text-slate-600">{tx.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points Adjustment Modal */}
      <Modal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        title={`Adjust Loyalty Points • ${member.member_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustPoints} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Points Adjustment (Positive to Add, Negative to Deduct)
            </label>
            <input
              type="number"
              required
              value={pointsDelta}
              onChange={(e) => setPointsDelta(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Invoice Number (Mandatory)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. In-store Bill HMS-2026-904"
              value={pointsNote}
              onChange={(e) => setPointsNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={pointsSubmitting}
            className="w-full py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-brand-950 font-bold text-xs shadow-md transition-all"
          >
            Confirm Adjustment
          </button>
        </form>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Customer Profile & Status"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Address / Area</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Staff Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={editSubmitting}
            className="w-full py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-md"
          >
            Save Profile Updates
          </button>
        </form>
      </Modal>

      {/* Admin Member Delete & Washout Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="⚠️ Permanent Member Deletion & Washout"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to permanently delete member <strong className="font-bold text-brand-950 font-mono">{member.member_number}</strong> (<strong className="font-bold">{member.full_name}</strong>)?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
            <p className="font-bold">Irreversible Data Erasure:</p>
            <p className="mt-1 leading-relaxed">
              All member records, phone numbers ({member.primary_phone}), loyalty points balance ({member.loyalty_points} pts), consent histories, and campaign records will be completely washed out from the database immediately.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
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
