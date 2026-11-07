import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Users,
  UserCheck,
  MessageSquare,
  MessageCircle,
  Smartphone,
  TrendingUp,
  Award,
  Radio,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, pendingRes] = await Promise.all([
        api.getDashboardStats(),
        api.getPendingApprovals().catch(() => ({ items: [], count: 0 })),
      ]);
      setStats(data);
      setPendingApprovalsCount(pendingRes?.count ?? pendingRes?.items?.length ?? 0);
    } catch (err: any) {
      setErrorMsg('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-900 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading store metrics...</p>
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="font-bold">{errorMsg || 'Unable to load statistics'}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Title & Store Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-gold-700 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300">
            OWNER DASHBOARD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-950 mt-1.5 leading-tight">
            Kaveri Member Club Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Halaguru Hobli, Kanakapura Main Road, Karnataka • Real-Time Membership & Consent Telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('admin-whatsapp')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Group & QR</span>
          </button>
          <button
            onClick={() => onNavigate('admin-campaigns')}
            className="px-4 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-brand-950 font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <Award className="w-4 h-4" />
            <span>Launch Campaign</span>
          </button>
          <button
            onClick={() => onNavigate('admin-members')}
            className="px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Search Members</span>
          </button>
        </div>
      </div>

      {/* Pending ₹499 Payment Approvals Banner */}
      {pendingApprovalsCount > 0 ? (
        <div
          onClick={() => onNavigate('admin-members')}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-gold-400 text-brand-950 shadow-lg cursor-pointer hover:shadow-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-amber-300"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-950 text-gold-400 flex items-center justify-center font-black text-xl shadow flex-shrink-0">
              ₹
            </div>
            <div>
              <p className="font-black text-base sm:text-lg text-brand-950 flex items-center space-x-2">
                <span>{pendingApprovalsCount} Membership Payment{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Approval</span>
                <span className="text-[10px] bg-brand-950 text-gold-300 px-2 py-0.5 rounded-full font-black uppercase">Action Needed</span>
              </p>
              <p className="text-xs text-brand-950/80 font-semibold mt-0.5">
                Customers have paid ₹499 and submitted transaction details. Click here to verify bank records and activate membership cards.
              </p>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-brand-950 text-gold-300 hover:text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 flex-shrink-0 transition-colors">
            <span>Verify & Approve Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">All ₹499 membership payments are up to date!</span>
            <span className="text-emerald-700">No pending verification requests at this moment.</span>
          </div>
          <button
            onClick={() => onNavigate('admin-members')}
            className="text-xs font-bold text-emerald-800 hover:underline flex items-center space-x-1"
          >
            <span>View All Members</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Members */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Members
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-950 mt-3">{stats.total_members}</p>
          <div className="mt-2 flex items-center text-xs text-emerald-600 font-semibold space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats.new_registrations_last_7_days} new in last 7 days</span>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Members
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-950 mt-3">{stats.active_members}</p>
          <p className="mt-2 text-xs text-slate-500">
            {stats.new_registrations_last_30_days} registered in last 30 days
          </p>
        </div>

        {/* WhatsApp Opt-Ins */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              WhatsApp Opt-Ins
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-950 mt-3">
            {stats.whatsapp_opt_in_count}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {stats.total_members > 0
              ? `${Math.round((stats.whatsapp_opt_in_count / stats.total_members) * 100)}% opt-in rate`
              : '0% opt-in rate'}
          </p>
        </div>

        {/* SMS Opt-Ins */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              SMS Opt-Ins
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-950 mt-3">{stats.sms_opt_in_count}</p>
          <p className="mt-2 text-xs text-slate-500">
            {stats.total_members > 0
              ? `${Math.round((stats.sms_opt_in_count / stats.total_members) * 100)}% opt-in rate`
              : '0% opt-in rate'}
          </p>
        </div>
      </div>

      {/* Messaging Provider Integration Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-brand-700" />
            <h2 className="text-lg font-bold text-brand-950">
              Automated Messaging Gateway Status
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            No simulated delivery claims • Transparent provider tracking
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* WhatsApp Cloud API */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Meta WhatsApp Cloud API</h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    stats.messaging_providers_status?.whatsapp?.is_configured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {stats.messaging_providers_status?.whatsapp?.status_label}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {stats.messaging_providers_status?.whatsapp?.is_configured
                  ? 'Official Meta System User token active. Ready for template dispatch.'
                  : 'API token not detected in .env. Outbound campaigns safely run in Dry-Run Preview mode.'}
              </p>
            </div>
          </div>

          {/* TRAI DLT SMS Gateway */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Indian TRAI DLT SMS Gateway</h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    stats.messaging_providers_status?.sms?.is_configured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {stats.messaging_providers_status?.sms?.status_label}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Sender ID: <span className="font-mono font-bold text-slate-800">KAVERI</span>.
                {!stats.messaging_providers_status?.sms?.is_configured &&
                  ' Principal Entity ID unset. Safe dry-run mode active.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate('admin-members')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md cursor-pointer transition-all group"
        >
          <h3 className="font-bold text-slate-900 group-hover:text-brand-900 transition-colors flex items-center justify-between">
            <span>Members Directory</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Search members, view loyalty transactions, and inspect consent histories.
          </p>
        </div>

        <div
          onClick={() => onNavigate('admin-campaigns')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md cursor-pointer transition-all group"
        >
          <h3 className="font-bold text-slate-900 group-hover:text-brand-900 transition-colors flex items-center justify-between">
            <span>Promotional Campaigns</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Build festival offers, estimate matching audience, and dispatch dry-runs.
          </p>
        </div>

        <div
          onClick={() => onNavigate('admin-audit')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md cursor-pointer transition-all group"
        >
          <h3 className="font-bold text-slate-900 group-hover:text-brand-900 transition-colors flex items-center justify-between">
            <span>Security Audit Trail</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Review immutable logs for member updates, campaign approvals, and access.
          </p>
        </div>
      </div>
    </div>
  );
};
