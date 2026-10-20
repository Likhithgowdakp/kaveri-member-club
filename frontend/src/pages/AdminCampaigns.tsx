import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import {
  PlusCircle,
  Eye,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  Send,
} from 'lucide-react';

export const AdminCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campPurpose, setCampPurpose] = useState('');
  const [campType, setCampType] = useState('festival');
  const [campChannel, setCampChannel] = useState('whatsapp');
  const [campTemplate, setCampTemplate] = useState(
    'Namaskara {{name}}! Exclusive festival offer on Smart TVs and Appliances for Kaveri Member Club members (ID: {{member_id}}). Visit HMS Complex, Halaguru!'
  );
  const [campOffer, setCampOffer] = useState('Up to 15% off on select LG and Samsung appliances');
  const [campDiscount, setCampDiscount] = useState('15');
  const [campTerms, setCampTerms] = useState('Valid till festival end. Cannot be combined with other offers.');
  const [creating, setCreating] = useState(false);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelCampId, setCancelCampId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.listCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.previewCampaign({
        name: campName.trim() || 'New Campaign',
        purpose: campPurpose.trim() || 'Promotional sale',
        campaign_type: campType,
        channel: campChannel,
        message_template: campTemplate,
        offer_details: campOffer,
        discount_pct: campDiscount ? parseFloat(campDiscount) : undefined,
      });
      setPreviewData(res);
      setShowPreviewModal(true);
    } catch (err: any) {
      alert(err.detail || 'Preview generation failed.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createCampaign({
        name: campName.trim(),
        purpose: campPurpose.trim(),
        campaign_type: campType,
        channel: campChannel,
        message_template: campTemplate,
        offer_details: campOffer,
        discount_pct: campDiscount ? parseFloat(campDiscount) : undefined,
        terms: campTerms,
      });
      setShowCreateModal(false);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.detail || 'Failed to create campaign.');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.approveCampaign(id);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.detail || 'Only Owner or Manager can approve campaigns.');
    }
  };

  const handleSchedule = async (id: number) => {
    try {
      const res = await api.scheduleCampaign(id);
      alert(res.message);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.detail || 'Scheduling failed.');
    }
  };

  const handleDispatch = async (id: number) => {
    try {
      const res = await api.dispatchCampaignNow(id);
      alert(
        `Dispatch Completed!\nDry-run executions: ${res.stats.dry_run}\nSkipped (Opt-out pre-send): ${res.stats.skipped_opt_out}\nDispatched: ${res.stats.dispatched}\nFailed: ${res.stats.failed}`
      );
      fetchCampaigns();
    } catch (err: any) {
      alert(err.detail || 'Dispatch failed.');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelCampId || !cancelReason.trim()) return;

    try {
      await api.cancelCampaign(cancelCampId, cancelReason.trim());
      setShowCancelModal(false);
      setCancelReason('');
      fetchCampaigns();
    } catch (err: any) {
      alert(err.detail || 'Failed to cancel campaign.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-950">Promotional Campaigns</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, preview, schedule, and safely dispatch multi-channel member promotions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
        >
          <PlusCircle className="w-4 h-4 text-gold-400" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No campaigns created yet. Click "New Campaign" to create your first festival or discount promotion!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Campaign Name</th>
                  <th className="py-3.5 px-6">Channel</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Jobs Telemetry</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{c.purpose}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold uppercase text-[11px] flex items-center space-x-1">
                        {c.channel === 'whatsapp' ? (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                        )}
                        <span>{c.channel}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 uppercase text-[11px] font-semibold text-slate-600">
                      {c.campaign_type}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          c.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : c.status === 'approved'
                            ? 'bg-purple-100 text-purple-800'
                            : c.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[11px]">
                      <div>Total Jobs: <span className="font-bold">{c.send_jobs_count}</span></div>
                      <div className="text-slate-400">
                        Delivered: {c.delivered_count} • Skipped (Opt-out): {c.skipped_opt_out_count}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {c.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(c.id)}
                            className="px-2.5 py-1 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800"
                          >
                            Approve
                          </button>
                        )}
                        {c.status === 'approved' && (
                          <button
                            onClick={() => handleSchedule(c.id)}
                            className="px-2.5 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800"
                          >
                            Queue Jobs
                          </button>
                        )}
                        {c.status === 'scheduled' && (
                          <button
                            onClick={() => handleDispatch(c.id)}
                            className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        )}
                        {['scheduled', 'running', 'approved'].includes(c.status) && (
                          <button
                            onClick={() => {
                              setCancelCampId(c.id);
                              setShowCancelModal(true);
                            }}
                            className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold hover:bg-rose-200"
                          >
                            Kill Switch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Builder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Promotional Campaign Builder"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Diwali LED Smart TV Offer"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campaign Type
              </label>
              <select
                value={campType}
                onChange={(e) => setCampType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              >
                <option value="festival">Festival Offer (Diwali, Ugadi, Dasara)</option>
                <option value="discount">Product Discount</option>
                <option value="new_arrival">New Arrival Announcement</option>
                <option value="member_only">Member-Only Benefit</option>
                <option value="service_reminder">Service Reminder</option>
                <option value="welcome">Welcome Onboarding</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campaign Purpose
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual festive clearance discount for local members"
              value={campPurpose}
              onChange={(e) => setCampPurpose(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Channel
              </label>
              <select
                value={campChannel}
                onChange={(e) => setCampChannel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="whatsapp">WhatsApp (Requires Consent)</option>
                <option value="sms">SMS (TRAI DLT Template)</option>
                <option value="both">Both Channels</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 15"
                value={campDiscount}
                onChange={(e) => setCampDiscount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Message Template (Supports {'{{name}}'} and {'{{member_id}}'})
            </label>
            <textarea
              rows={3}
              required
              value={campTemplate}
              onChange={(e) => setCampTemplate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Eligible Products
              </label>
              <input
                type="text"
                value={campOffer}
                onChange={(e) => setCampOffer(e.target.value)}
                placeholder="e.g. Refrigerators, TVs"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Terms & Conditions
              </label>
              <input
                type="text"
                value={campTerms}
                onChange={(e) => setCampTerms(e.target.value)}
                placeholder="e.g. Valid while stocks last"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center space-x-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewLoading ? 'Estimating...' : 'Preview Message & Audience'}</span>
            </button>

            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-brand-900 text-white hover:bg-brand-800 text-xs font-bold shadow-md"
            >
              Save Campaign Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewData && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Campaign Preview & Audience Estimate"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sample Rendered Message
              </span>
              <p className="mt-1 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {previewData.rendered_message_sample}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                <span className="text-slate-500 font-semibold text-[10px]">Total Audience</span>
                <p className="text-lg font-black text-brand-950 mt-0.5">
                  {previewData.eligible_members_count}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 font-semibold text-[10px]">WhatsApp Opt-Ins</span>
                <p className="text-lg font-black text-emerald-950 mt-0.5">
                  {previewData.whatsapp_recipients_count}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-blue-700 font-semibold text-[10px]">SMS Opt-Ins</span>
                <p className="text-lg font-black text-blue-950 mt-0.5">
                  {previewData.sms_recipients_count}
                </p>
              </div>
            </div>

            {previewData.warnings?.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                {previewData.warnings.map((w: string, i: number) => (
                  <p key={i} className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-2 bg-brand-900 text-white rounded-xl text-xs font-bold"
            >
              Close Preview
            </button>
          </div>
        </Modal>
      )}

      {/* Emergency Cancellation Kill-Switch Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Emergency Campaign Kill Switch"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
            <p className="font-bold">Immediate Cancellation Warning</p>
            <p className="mt-0.5">
              Cancelling this campaign will abort all queued sending jobs instantly.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancellation Reason (Mandatory for Audit Trail)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pricing correction or emergency stop"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md"
          >
            Confirm Campaign Kill Switch
          </button>
        </form>
      </Modal>
    </div>
  );
};
