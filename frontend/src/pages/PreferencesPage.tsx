import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import { ShieldCheck, MessageSquare, Smartphone, CheckCircle, AlertCircle, Trash2, Edit3, Lock } from 'lucide-react';

interface PreferencesPageProps {
  initialMemberNumber?: string;
  loggedInMember?: any;
  onMemberLogout?: () => void;
  onNavigateToLogin?: () => void;
}

export const PreferencesPage: React.FC<PreferencesPageProps> = ({
  initialMemberNumber = '',
  loggedInMember = null,
  onMemberLogout,
  onNavigateToLogin,
}) => {
  const [memberNumber, setMemberNumber] = useState(loggedInMember?.member_number || initialMemberNumber);
  const [phone, setPhone] = useState(loggedInMember?.primary_phone ? loggedInMember.primary_phone.replace('+91', '') : '');
  const [isVerified, setIsVerified] = useState(!!loggedInMember);
  const [profile, setProfile] = useState<any>(loggedInMember || null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Correction form states
  const [activeTab, setActiveTab] = useState<'consents' | 'correction' | 'closure'>('consents');
  const [corrName, setCorrName] = useState(loggedInMember?.full_name || '');
  const [corrEmail, setCorrEmail] = useState(loggedInMember?.email || '');
  const [corrAddress, setCorrAddress] = useState(loggedInMember?.address || '');
  const [corrNotes, setCorrNotes] = useState('');
  const [closureReason, setClosureReason] = useState('');

  // Update when loggedInMember changes
  useEffect(() => {
    if (loggedInMember) {
      setProfile(loggedInMember);
      setIsVerified(true);
      setMemberNumber(loggedInMember.member_number || '');
      setPhone(loggedInMember.primary_phone ? loggedInMember.primary_phone.replace('+91', '') : '');
      setCorrName(loggedInMember.full_name || '');
      setCorrEmail(loggedInMember.email || '');
      setCorrAddress(loggedInMember.address || '');
    }
  }, [loggedInMember]);

  // Handle URL hash params if provided e.g. #preferences?id=KAV-000001
  useEffect(() => {
    if (initialMemberNumber && !loggedInMember) {
      setMemberNumber(initialMemberNumber);
    }
  }, [initialMemberNumber, loggedInMember]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNumber.trim() || !phone.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await api.verifyCustomer(memberNumber.trim(), phone.trim());
      setProfile(data);
      setIsVerified(true);
      setCorrName(data.full_name || '');
      setCorrEmail(data.email || '');
      setCorrAddress(data.address || '');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg('Verification failed: Mobile number does not match this Membership ID.');
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsent = async (channel: 'whatsapp' | 'sms', currentGranted: boolean) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: any = {
      member_number: memberNumber,
      phone: phone,
      reason: `Customer toggled ${channel.toUpperCase()} marketing to ${!currentGranted ? 'GRANTED' : 'OPT-OUT'}`,
    };

    if (channel === 'whatsapp') {
      payload.whatsapp_consent = !currentGranted;
    } else {
      payload.sms_consent = !currentGranted;
    }

    try {
      const updated = await api.updateConsent(payload);
      setProfile(updated);
      setSuccessMsg(`Your ${channel.toUpperCase()} preference was updated immediately.`);
    } catch (err: any) {
      setErrorMsg(err.detail || 'Failed to update preference.');
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.requestCorrection({
        member_number: memberNumber,
        phone: phone,
        requested_name: corrName,
        requested_email: corrEmail,
        requested_address: corrAddress,
        notes: corrNotes,
      });
      setSuccessMsg('Your contact information update was saved successfully.');
      // Refresh profile
      const data = await api.verifyCustomer(memberNumber.trim(), phone.trim());
      setProfile(data);
    } catch (err: any) {
      setErrorMsg(err.detail || 'Failed to submit correction.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('⚠️ WARNING: PERMANENT ACCOUNT DELETION & COMPLETE DATA WASHOUT\n\nAre you sure you want to permanently delete your membership account? All your personal information (name, phone, address, email), loyalty points balance, and consent records will be completely WASHED OUT and deleted from Kaveri Electronic records. This action cannot be reversed.')) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestAccountClosure({
        member_number: memberNumber,
        phone: phone,
        reason: closureReason || 'Customer self-service account deletion',
        confirm_closure: true,
      });
      localStorage.removeItem('kaveri_member_session');
      setSuccessMsg(res.message);
      setIsVerified(false);
      setProfile(null);
      if (onMemberLogout) {
        onMemberLogout();
      }
    } catch (err: any) {
      setErrorMsg(err.detail || 'Failed to delete account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('kaveri_member_session');
    setIsVerified(false);
    setProfile(null);
    if (onMemberLogout) {
      onMemberLogout();
    }
    if (onNavigateToLogin) {
      onNavigateToLogin();
    }
  };

  const getConsentState = (channel: string) => {
    if (!profile?.consents) return 'never_given';
    const c = profile.consents.find((item: any) => item.channel === channel);
    return c?.consent_state || 'never_given';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-900 border border-brand-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-brand-700" />
        </div>
        <h1 className="text-3xl font-extrabold text-brand-950 tracking-tight">
          Customer Self-Service Portal
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage marketing consent, update your details, or exercise your privacy rights under DPDP Act, 2023.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Step 1: Verification Form (Required before showing private settings) */}
      {!isVerified ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
          <div className="flex items-center space-x-2 text-xs font-bold text-brand-800 uppercase tracking-wider mb-4">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>Secure Member Identity Verification</span>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="memberId" className="block text-xs font-bold text-slate-700 mb-1">
                Membership ID
              </label>
              <input
                id="memberId"
                type="text"
                required
                placeholder="e.g. KAV-000001"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 uppercase font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="prefPhone" className="block text-xs font-bold text-slate-700 mb-1">
                Registered Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  +91
                </span>
                <input
                  id="prefPhone"
                  type="tel"
                  inputMode="tel"
                  required
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                To protect your privacy, verification requires matching both your Member ID and Mobile Number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-900 hover:bg-brand-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? <span>Verifying...</span> : <span>Verify & Access My Preferences</span>}
            </button>
          </form>
        </div>
      ) : (
        /* Step 2: Customer Preferences Panel */
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Member Profile Summary Header */}
          <div className="bg-gradient-to-r from-brand-900 to-brand-950 text-white p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400 bg-gold-500/20 px-2 py-0.5 rounded-full border border-gold-500/30">
                  VERIFIED MEMBER
                </span>
                <h2 className="text-2xl font-black mt-2 text-white">{profile.full_name}</h2>
                <p className="text-xs text-brand-200 font-mono mt-0.5">
                  ID: {profile.member_number} • Phone: {profile.primary_phone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Loyalty Points</p>
                <p className="text-xl font-bold text-gold-400">{profile.loyalty_points || 50} pts</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-brand-800/80 mt-6 -mb-2 space-x-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('consents')}
                className={`pb-3 px-1 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'consents'
                    ? 'border-b-2 border-gold-400 text-gold-300'
                    : 'text-brand-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Marketing Consents</span>
              </button>
              <button
                onClick={() => setActiveTab('correction')}
                className={`pb-3 px-1 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'correction'
                    ? 'border-b-2 border-gold-400 text-gold-300'
                    : 'text-brand-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Update Contact Details</span>
              </button>
              <button
                onClick={() => setActiveTab('closure')}
                className={`pb-3 px-1 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'closure'
                    ? 'border-b-2 border-rose-400 text-rose-300'
                    : 'text-brand-300 hover:text-white'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Account & Washout</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* TAB 1: Channel Opt-Ins / Instant Opt-Outs */}
            {activeTab === 'consents' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Communication Channels
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle your preferences below. Opt-outs take immediate effect and prevent promotional messages.
                  </p>
                </div>

                {/* WhatsApp Channel */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">WhatsApp Marketing</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Status:{' '}
                        <span
                          className={`font-bold uppercase text-[11px] ${
                            getConsentState('whatsapp') === 'granted'
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {getConsentState('whatsapp')}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Festival offers, seasonal electronics discounts, and new arrivals.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleToggleConsent('whatsapp', getConsentState('whatsapp') === 'granted')
                    }
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      getConsentState('whatsapp') === 'granted'
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {getConsentState('whatsapp') === 'granted' ? 'Opt Out (Withdraw)' : 'Opt In (Grant)'}
                  </button>
                </div>

                {/* SMS Channel */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">SMS Marketing</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Status:{' '}
                        <span
                          className={`font-bold uppercase text-[11px] ${
                            getConsentState('sms') === 'granted'
                              ? 'text-brand-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {getConsentState('sms')}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        DLT-approved coupon codes and anniversary sale alerts.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleToggleConsent('sms', getConsentState('sms') === 'granted')
                    }
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      getConsentState('sms') === 'granted'
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {getConsentState('sms') === 'granted' ? 'Opt Out (Withdraw)' : 'Opt In (Grant)'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Update Contact Details */}
            {activeTab === 'correction' && (
              <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Request Data Correction
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your registered name, email, or address.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={corrName}
                    onChange={(e) => setCorrName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={corrEmail}
                    onChange={(e) => setCorrEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Home Address / Area</label>
                  <input
                    type="text"
                    value={corrAddress}
                    onChange={(e) => setCorrAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={corrNotes}
                    onChange={(e) => setCorrNotes(e.target.value)}
                    placeholder="Optional details for our store staff"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-900 hover:bg-brand-800 text-xs shadow-md transition-all"
                >
                  Save Changes
                </button>
              </form>
            )}

            {/* TAB 3: Account Deletion & Complete Data Washout */}
            {activeTab === 'closure' && (
              <form onSubmit={handleClosureSubmit} className="space-y-4">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900">
                  <h3 className="text-sm font-black text-rose-950 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-rose-700" />
                    <span>Delete My Account & Wash Out All Data</span>
                  </h3>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    Under the Digital Personal Data Protection (DPDP) Act, 2023, you have the right to full erasure. Deleting your account will <strong className="font-bold">permanently erase all your personal data, phone number, address, email, points balance, and consent logs</strong> from Kaveri Electronic records immediately. This action cannot be reversed.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Deletion (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Relocated to another city or closing account"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-rose-600 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-rose-700 hover:bg-rose-800 text-xs shadow-md shadow-rose-900/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete My Account & Wash Out All Data</span>
                </button>
              </form>
            )}

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
              <span>Notice Version: v1.0_2026_DPDP</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="font-bold text-brand-700 hover:text-brand-950 hover:underline flex items-center space-x-1"
              >
                <span>Sign out of member portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
