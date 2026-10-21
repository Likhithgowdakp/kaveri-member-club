import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import {
  MessageCircle,
  ExternalLink,
  Printer,
  Copy,
  CheckCircle,
  QrCode,
  Sparkles,
  Users,
  Smartphone,
  Save,
} from 'lucide-react';

export const AdminWhatsAppGroup: React.FC = () => {
  const [groupUrl, setGroupUrl] = useState('https://chat.whatsapp.com/KaveriClubOfficial');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SMS Gateway state
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('KAVERI');
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [smsSavedSuccess, setSmsSavedSuccess] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // UPI Payment Settings
  const [upiId, setUpiId] = useState('7204162882@ybl');
  const [membershipFee, setMembershipFee] = useState(499);
  const [upiSavedSuccess, setUpiSavedSuccess] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminSettings();
      if (data.whatsapp_group_url) {
        setGroupUrl(data.whatsapp_group_url);
        generateQr(data.whatsapp_group_url);
      } else {
        generateQr(groupUrl);
      }

      if (data.store_upi_id) setUpiId(data.store_upi_id);
      if (data.membership_fee) setMembershipFee(data.membership_fee);

      if (data.sms_api_key_configured) {
        setSmsConfigured(true);
        setSmsApiKey(data.sms_api_key_masked || '***Configured***');
      }
      if (data.sms_sender_id) {
        setSmsSenderId(data.sms_sender_id);
      }
    } catch {
      generateQr(groupUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsLoading(true);
    setSmsError(null);
    setSmsSavedSuccess(false);

    try {
      await api.updateAdminSettings({
        sms_api_key: smsApiKey.trim(),
        sms_sender_id: smsSenderId.trim() || 'KAVERI',
      });
      setSmsSavedSuccess(true);
      setSmsConfigured(true);
      setTimeout(() => setSmsSavedSuccess(false), 4000);
    } catch (err: any) {
      setSmsError(err.detail || 'Failed to update SMS gateway settings');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiLoading(true);
    setUpiError(null);
    setUpiSavedSuccess(false);

    try {
      await api.updateAdminSettings({
        store_upi_id: upiId.trim(),
        membership_fee: Number(membershipFee) || 499,
      });
      setUpiSavedSuccess(true);
      setTimeout(() => setUpiSavedSuccess(false), 4000);
    } catch (err: any) {
      setUpiError(err.detail || 'Failed to update UPI settings');
    } finally {
      setUpiLoading(false);
    }
  };

  const generateQr = async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (e) {
      console.error('Failed to generate QR code', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupUrl.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      await api.updateAdminSettings({
        whatsapp_group_url: groupUrl.trim(),
      });
      await generateQr(groupUrl.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.detail || 'Failed to update WhatsApp group link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(groupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-950">WhatsApp Group & Counter QR Code</h1>
              <p className="text-xs text-slate-500 font-medium">
                Kaveri Electronic Halaguru • Manage Customer Community & Store Counter Scanner
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Button to open WhatsApp directly so the owner can create a group */}
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm flex items-center space-x-2 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open WhatsApp Web</span>
          </a>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-sm flex items-center space-x-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Counter Standee</span>
          </button>
        </div>
      </div>

      {/* Guide Card: How to Create Group in 3 Simple Steps */}
      <div className="bg-gradient-to-r from-emerald-900 to-brand-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Quick Setup Guide (Takes only 30 seconds)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black mb-3">
            How to Set Up Your Official "Kaveri Member Club" WhatsApp Group
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-brand-950 font-black inline-flex items-center justify-center mb-2">
                1
              </span>
              <h3 className="font-bold text-white text-sm">Create Group in WhatsApp</h3>
              <p className="text-slate-200 mt-1">
                Open WhatsApp on your phone or computer. Click <strong>New Group</strong> and name it{' '}
                <span className="text-emerald-300 font-bold">"Kaveri Member Club"</span>.
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-brand-950 font-black inline-flex items-center justify-center mb-2">
                2
              </span>
              <h3 className="font-bold text-white text-sm">Copy the Invite Link</h3>
              <p className="text-slate-200 mt-1">
                Tap the group title, tap <strong>Invite via link</strong>, then click <strong>Copy Link</strong> (it looks like <code className="text-gold-300">chat.whatsapp.com/...</code>).
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-brand-950 font-black inline-flex items-center justify-center mb-2">
                3
              </span>
              <h3 className="font-bold text-white text-sm">Paste Below & Print Standee</h3>
              <p className="text-slate-200 mt-1">
                Paste the copied link in the box below and click <strong>Save & Generate QR</strong>. Print the poster and place it on your billing counter!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
            <h2 className="text-base font-bold text-brand-950 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Configure WhatsApp Group Link</span>
            </h2>

            {savedSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>WhatsApp Group link saved successfully! The QR Code is updated.</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Group Invite Link
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://chat.whatsapp.com/..."
                    value={groupUrl}
                    onChange={(e) => setGroupUrl(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title="Copy Link"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Any customer scanning the QR code or clicking "Join Group" on their membership card will automatically join this WhatsApp group.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save & Update QR Code'}</span>
                </button>

                <a
                  href={groupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center space-x-1.5 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Join Link</span>
                </a>
              </div>
            </form>
          </div>

          {/* SMS Gateway Configuration Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-brand-950 flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-brand-700" />
                <span>Cellular SMS Gateway (Fast2SMS / DLT)</span>
              </h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  smsConfigured
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {smsConfigured ? '● Live Gateway Active' : '○ Dry-Run Simulation Mode'}
              </span>
            </div>

            {smsSavedSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>SMS Gateway credentials saved! Real cellular SMS will now be transmitted directly to phones.</span>
              </div>
            )}

            {smsError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {smsError}
              </div>
            )}

            <form onSubmit={handleSaveSms} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Fast2SMS / DLT API Authorization Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-brand-800 hover:underline font-semibold"
                  >
                    {showKey ? 'Hide Key' : 'Show Key'}
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Paste Fast2SMS API Key (e.g. kHnL...)"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-500 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Fast2SMS Quick Route allows sending cellular SMS to any Indian number instantly without TRAI registration. Create a free account at{' '}
                  <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-brand-900 font-bold underline">
                    fast2sms.com
                  </a>{' '}
                  to get your API key.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SMS Sender Header / ID
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="KAVERI"
                  value={smsSenderId}
                  onChange={(e) => setSmsSenderId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-500 text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={smsLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>{smsLoading ? 'Saving Key...' : 'Save SMS Gateway Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: ₹499 UPI Payment Settings */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-brand-950 flex items-center space-x-2">
                <span className="text-amber-500 font-black text-lg">₹</span>
                <span>UPI Payment & Membership Fee</span>
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                ₹{membershipFee}
              </span>
            </div>

            {upiSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>UPI configuration saved successfully!</span>
              </div>
            )}

            {upiError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {upiError}
              </div>
            )}

            <form onSubmit={handleSaveUpi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store Official UPI ID (Displayed to Customers)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7204162882@ybl"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-500 text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Customers pay to this UPI ID and upload the receipt screenshot for your approval.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Membership Fee (₹ INR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={membershipFee}
                  onChange={(e) => setMembershipFee(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-500 text-xs font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={upiLoading}
                className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-gold-400" />
                <span>{upiLoading ? 'Saving...' : 'Save UPI Settings'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Counter-Printable Standee Poster */}
        <div className="lg:col-span-6">
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center space-x-1">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Live Preview • Counter Standee / Poster</span>
            </span>
          </div>

          {/* Printable Standee Box */}
          <div
            id="counter-standee"
            ref={printRef}
            className="bg-white border-4 border-brand-900 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden"
          >
            {/* Top Store Header with Official 3D Logo */}
            <div className="border-b-2 border-brand-900 pb-4 mb-4">
              <img
                src="/logo.png"
                alt="Kaveri Electronic Halaguru"
                className="w-16 h-16 object-contain rounded-2xl shadow-md border-2 border-gold-400/50 bg-slate-900/60 p-0.5 mx-auto mb-2"
              />
              <h2 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight">
                KAVERI ELECTRONIC
              </h2>
              <p className="text-xs font-extrabold text-gold-700 tracking-wider uppercase">
                HALAGURU • MEMBER CLUB
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                HMS Complex, Kanakapura Main Road, Halaguru Hobli
              </p>
            </div>

            {/* QR Code Title */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wide">
                Scan with Phone Camera or WhatsApp
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Join Kaveri WhatsApp Community
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                Scan this QR code to join our exclusive customer group for instant festival discounts and warranty support!
              </p>
            </div>

            {/* High-Resolution QR Code */}
            <div className="inline-block p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-inner">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Kaveri Member Club WhatsApp Group QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 sm:w-64 sm:h-64 bg-slate-100 animate-pulse rounded-xl" />
              )}
            </div>

            {/* Benefits Badges */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-bold text-brand-950">
              <div className="p-2 rounded-xl bg-gold-50 border border-gold-200">
                🎉 Festival Offers
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                ⚡ 50 Welcome Pts
              </div>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                🛠️ Warranty Support
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Direct Contact: +91 72041 62882 • Monday to Sunday 9:30 AM – 9:00 PM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
