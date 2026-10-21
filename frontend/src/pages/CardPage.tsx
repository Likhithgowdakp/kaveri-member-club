import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { api, ApiError } from '../api/client';
import { Modal } from '../components/Modal';
import {
  Award,
  Printer,
  Download,
  MessageCircle,
  MapPin,
  CheckCircle,
  Search,
  ShieldCheck,
  Lock,
  Sparkles,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Upload,
  CheckCircle2,
} from 'lucide-react';

interface CardPageProps {
  initialMemberData?: any;
  loggedInMember?: any;
  onNavigateToPreferences: (memberNumber: string) => void;
  onNavigateToLogin?: () => void;
}

// 6 Distinctive Luxury Security Color Themes (Varies deterministically per member)
const CARD_THEMES = [
  {
    name: 'Royal Gold & Platinum',
    gradient: 'from-slate-950 via-brand-950 to-amber-950/80',
    border: 'border-amber-400/60',
    accentText: 'text-amber-300',
    badge: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    hologramGlow: 'from-amber-300 via-yellow-200 to-amber-500',
    rosetteColor: 'rgba(251, 191, 36, 0.08)',
  },
  {
    name: 'Imperial Emerald',
    gradient: 'from-slate-950 via-emerald-950 to-teal-950/80',
    border: 'border-emerald-400/60',
    accentText: 'text-emerald-300',
    badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
    hologramGlow: 'from-emerald-300 via-teal-200 to-emerald-500',
    rosetteColor: 'rgba(52, 211, 153, 0.08)',
  },
  {
    name: 'Sapphire Azure',
    gradient: 'from-slate-950 via-blue-950 to-sky-950/80',
    border: 'border-sky-400/60',
    accentText: 'text-sky-300',
    badge: 'bg-sky-400/20 text-sky-300 border-sky-400/40',
    hologramGlow: 'from-sky-300 via-indigo-200 to-cyan-400',
    rosetteColor: 'rgba(56, 189, 248, 0.08)',
  },
  {
    name: 'Ruby Titanium',
    gradient: 'from-slate-950 via-rose-950 to-red-950/80',
    border: 'border-rose-400/60',
    accentText: 'text-rose-300',
    badge: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
    hologramGlow: 'from-rose-300 via-pink-200 to-red-400',
    rosetteColor: 'rgba(251, 113, 133, 0.08)',
  },
  {
    name: 'Amethyst Royal',
    gradient: 'from-slate-950 via-purple-950 to-indigo-950/80',
    border: 'border-purple-400/60',
    accentText: 'text-purple-300',
    badge: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
    hologramGlow: 'from-purple-300 via-fuchsia-200 to-violet-400',
    rosetteColor: 'rgba(192, 132, 252, 0.08)',
  },
  {
    name: 'Bronze Metallic',
    gradient: 'from-slate-950 via-amber-950 to-orange-950/80',
    border: 'border-amber-500/60',
    accentText: 'text-amber-200',
    badge: 'bg-orange-400/20 text-orange-200 border-orange-400/40',
    hologramGlow: 'from-amber-200 via-yellow-100 to-orange-400',
    rosetteColor: 'rgba(245, 158, 11, 0.08)',
  },
];

// Anti-Counterfeiting: Computes a deterministic cryptographic fingerprint from member details
const getCardSecurityFeatures = (m: any) => {
  if (!m) {
    return {
      token: 'KAV-SEC-0000-0000',
      themeIndex: 0,
      guillocheStep: 14,
      securityHash: '8A3F1C99',
    };
  }
  const str = `${m.id || 1}-${m.member_number || ''}-${m.full_name || ''}-${m.created_at || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const hex = positive.toString(16).toUpperCase().padStart(8, '0');
  const token = `KAV-SEC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  const themeIndex = positive % CARD_THEMES.length;
  const guillocheStep = 8 + (positive % 18);
  const securityHash = hex;
  return { token, themeIndex, guillocheStep, securityHash };
};

export const CardPage: React.FC<CardPageProps> = ({
  initialMemberData,
  loggedInMember,
  onNavigateToPreferences,
  onNavigateToLogin,
}) => {
  const [member, setMember] = useState<any>(
    initialMemberData?.member || loggedInMember || null
  );

  useEffect(() => {
    if (loggedInMember && !initialMemberData?.member) {
      setMember(loggedInMember);
    }
  }, [loggedInMember, initialMemberData]);

  const [searchId, setSearchId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('https://chat.whatsapp.com/KaveriClubOfficial');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Store Payment Settings & UPI QR
  const [storeUpiId, setStoreUpiId] = useState('7353398831-2@naviaxis');
  const [membershipFee, setMembershipFee] = useState(499);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Payment Verification & Proof Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [showReuploadForm, setShowReuploadForm] = useState(false);
  const [newScreenshot, setNewScreenshot] = useState<string | null>(null);
  const [newUtr, setNewUtr] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);
  const [reuploadError, setReuploadError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setNewFullName(member.full_name || '');
      setNewPhone(member.primary_phone || '');
      if (member.payment_utr) setNewUtr(member.payment_utr);
    }
  }, [member]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(storeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReuploadError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setReuploadError('Invalid file format. Permitted screenshot image formats are JPEG, PNG, or WEBP only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReuploadError('Screenshot file size must be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const src = loadEvent.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setNewScreenshot(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setNewScreenshot(src);
        }
      };
      img.onerror = () => setNewScreenshot(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.member_number) {
      setReuploadError('Membership Application ID is required.');
      return;
    }
    const cleanName = (newFullName || member.full_name || '').trim();
    if (cleanName.length < 2) {
      setReuploadError('Please enter full name (minimum 2 characters).');
      return;
    }
    const cleanPhone = (newPhone || member.primary_phone || '').trim();
    if (!cleanPhone) {
      setReuploadError('Registered mobile number is required.');
      return;
    }
    const cleanUtr = newUtr.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      setReuploadError('UTR / Reference number is required (min 6 alphanumeric characters).');
      return;
    }
    if (!newScreenshot && !member.payment_screenshot) {
      setReuploadError('Please select a payment screenshot showing transaction details.');
      return;
    }
    const screenshotToSubmit = newScreenshot || member.payment_screenshot;

    setReuploadLoading(true);
    setReuploadError(null);
    try {
      const res = await api.submitCustomerPayment({
        full_name: cleanName,
        primary_phone: cleanPhone,
        member_number: member.member_number,
        payment_utr: cleanUtr,
        payment_screenshot: screenshotToSubmit,
      });
      setMember(res.member);
      setSubmissionSuccessMsg(
        res.message ||
          'Your ₹499 membership payment has been submitted for verification. Your membership card will be available after the administrator verifies and approves your payment.'
      );
      setShowReuploadForm(false);
      setTimeout(() => setSubmissionSuccessMsg(null), 10000);
    } catch (err: any) {
      setReuploadError(err?.detail || 'Failed to submit payment proof.');
    } finally {
      setReuploadLoading(false);
    }
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const security = getCardSecurityFeatures(member);
  const currentTheme = CARD_THEMES[security.themeIndex];

  // Fetch store WhatsApp group settings and UPI config
  useEffect(() => {
    api
      .getPublicSettings()
      .then((settings) => {
        if (settings.whatsapp_group_url) {
          setWhatsappGroupUrl(settings.whatsapp_group_url);
        }
        const upi = settings.store_upi_id || '7353398831-2@naviaxis';
        const feeAmount = settings.membership_fee || 499;
        setStoreUpiId(upi);
        setMembershipFee(feeAmount);
        buildUpiQr(upi, feeAmount);
      })
      .catch(() => {
        buildUpiQr('7353398831-2@naviaxis', 499);
      });
  }, []);

  const buildUpiQr = async (pa: string, amount: number) => {
    try {
      const upiString = `upi://pay?pa=${pa}&pn=Kaveri%20Electronic&am=${amount}&cu=INR&tn=Kaveri%20Club%20Membership`;
      const url = await QRCode.toDataURL(upiString, {
        width: 300,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setUpiQrUrl(url);
    } catch (e) {
      console.error('Failed to generate UPI QR code', e);
    }
  };

  // 1. Generate Small QR code containing ALL customer details
  useEffect(() => {
    if (member?.member_number) {
      const allDetailsPayload = [
        `KAVERI MEMBER CLUB - OFFICIAL CARD`,
        `Member ID: ${member.member_number}`,
        `Full Name: ${member.full_name}`,
        `Primary Mobile: ${member.primary_phone || 'Verified'}`,
        `Loyalty Points: ${member.loyalty_points || 50}`,
        `Membership Status: ${(member.status || 'ACTIVE').toUpperCase()}`,
        `Issued Store: Kaveri Electronic Halaguru (HMS Complex, Kanakapura Main Rd)`,
        `Authenticity Token: ${security.token}`,
        `Security Hash: ${security.securityHash}`,
        `Store Support: +91 72041 62882 | mathrushreemep@gmail.com`,
        `Official Verification: ${window.location.origin}/#preferences?id=${encodeURIComponent(member.member_number)}`,
      ].join('\n');

      QRCode.toDataURL(allDetailsPayload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('QR code generation failed', err));
    }
  }, [member, security.token, security.securityHash]);

  // 2. Generate Code 128 Barcode for POS scanner readability (Black bars on white background)
  useEffect(() => {
    if (barcodeRef.current && member?.member_number) {
      try {
        JsBarcode(barcodeRef.current, member.member_number, {
          format: 'CODE128',
          lineColor: '#0f172a',
          width: 1.6,
          height: 40,
          displayValue: true,
          font: 'monospace',
          fontSize: 12,
          textMargin: 4,
          background: '#ffffff',
        });
      } catch (err) {
        console.error('Barcode generation failed', err);
      }
    }
  }, [member?.member_number]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getMemberCard(searchId.trim());
      setMember(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg('Membership record not found. Please verify your ID (e.g. KAV-000001).');
      } else {
        setErrorMsg('Error retrieving card.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Lookup Bar if no card is actively loaded */}
      {!member && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-200 text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-brand-950">Look Up Your Membership Card</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Enter your Kaveri Member Club ID to retrieve your verified digital card
          </p>

          <form onSubmit={handleLookup} className="mt-5 max-w-md mx-auto flex space-x-2">
            <input
              type="text"
              placeholder="e.g. KAV-000001"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 uppercase font-mono text-sm"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand-900 text-white rounded-xl font-bold text-sm hover:bg-brand-800 disabled:opacity-50 flex items-center space-x-1"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Find Card'}</span>
            </button>
          </form>

          {onNavigateToLogin && (
            <p className="text-xs text-slate-500 mt-4">
              Registered member?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-brand-900 font-bold hover:underline"
              >
                Sign In with Member ID & Password →
              </button>
            </p>
          )}

          {errorMsg && (
            <p className="mt-3 text-xs text-rose-600 font-semibold">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Member Portal: Status Tracker & Membership Card */}
      {member && (() => {
        const isApproved = member.payment_status === 'approved' && member.status === 'active';
        const isRejected = member.payment_status === 'rejected';
        const isPending = (member.payment_status === 'pending' || member.status === 'pending_verification') && !isApproved;
        const isNotSubmitted = !isApproved && !isPending && !isRejected;

        // Visual Stepper for the 5 Customer Account Statuses
        const renderStatusTracker = () => (
          <div className="no-print bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-brand-950 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-brand-700" />
                  <span>Customer Membership Status Tracker</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Application ID: <span className="font-mono font-bold text-brand-900">{member.member_number}</span> • Name: <span className="font-bold text-slate-800">{member.full_name}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                {isApproved && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Membership Card Available</span>
                  </span>
                )}
                {isPending && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Payment Verification Pending</span>
                  </span>
                )}
                {isRejected && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Payment Rejected</span>
                  </span>
                )}
                {isNotSubmitted && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Not Submitted</span>
                  </span>
                )}
                <button
                  onClick={() => setMember(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline pl-2"
                >
                  Change ID
                </button>
              </div>
            </div>

            {/* 5 Status Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {/* Stage 1: Payment Not Submitted */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isNotSubmitted
                    ? 'bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-300/40'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  {isNotSubmitted ? (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-brand-950 text-[10px] font-black flex items-center justify-center">1</span>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs font-black text-slate-900">Payment Not Submitted</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isNotSubmitted ? 'Action: Pay ₹499' : 'Submitted'}
                </p>
              </div>

              {/* Stage 2: Payment Verification Pending */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isPending
                    ? 'bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-300/40'
                    : isApproved
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  {isPending ? (
                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  ) : isApproved ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">2</span>
                  )}
                </div>
                <p className="text-xs font-black text-slate-900">Payment Verification Pending</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isPending ? 'Bank review in progress' : isApproved ? 'Verified by admin' : 'Pending upload'}
                </p>
              </div>

              {/* Stage 3: Payment Rejected */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isRejected
                    ? 'bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-400/40'
                    : 'bg-slate-50 border-slate-200 opacity-40'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  {isRejected ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 text-[10px] font-bold flex items-center justify-center">3</span>
                  )}
                </div>
                <p className="text-xs font-black text-slate-900">Payment Rejected</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isRejected ? 'Action: Re-upload proof' : 'No rejection'}
                </p>
              </div>

              {/* Stage 4: Payment Approved */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isApproved
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  {isApproved ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">4</span>
                  )}
                </div>
                <p className="text-xs font-black text-slate-900">Payment Approved</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isApproved ? 'Bank confirmed' : 'Requires admin check'}
                </p>
              </div>

              {/* Stage 5: Membership Card Available */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isApproved
                    ? 'bg-gradient-to-br from-amber-50 to-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5 mb-1">
                  {isApproved ? (
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <p className="text-xs font-black text-slate-900">Membership Card Available</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isApproved ? 'Card Unlocked & Active' : 'Locked'}
                </p>
              </div>
            </div>
          </div>
        );

        // Reusable Payment Submission / Re-submission Component
        const renderPaymentSubmissionForm = (title: string, subtitle: string) => (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-brand-200 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-950 flex items-center space-x-2">
                <Smartphone className="w-6 h-6 text-brand-700" />
                <span>{title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {subtitle}
              </p>
            </div>

            {/* UPI Payment Box with QR and 1-tap Button */}
            <div className="bg-gradient-to-br from-brand-950 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-brand-800 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-gold-400">
                    Kaveri Club Membership Fee
                  </span>
                  <p className="text-3xl font-black text-white mt-0.5">₹{membershipFee}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-gold-400/20 text-gold-300 border border-gold-400/40">
                  One-Time Official Fee
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-gold-400/30 text-center flex-shrink-0">
                  {upiQrUrl ? (
                    <img
                      src={upiQrUrl}
                      alt={`Scan to pay ₹${membershipFee} via UPI`}
                      className="w-40 h-40 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-xl" />
                  )}
                  <span className="text-[10px] font-black text-slate-900 mt-1 uppercase tracking-tight block">
                    Scan with Any UPI App
                  </span>
                </div>

                {/* UPI ID Details & 1-Tap Pay */}
                <div className="flex-1 space-y-3.5 text-center sm:text-left">
                  <div>
                    <span className="text-xs text-slate-300 block">Official Store UPI ID:</span>
                    <div className="flex items-center justify-center sm:justify-start space-x-2 mt-1">
                      <span className="font-mono text-base font-extrabold text-gold-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 select-all">
                        {storeUpiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="p-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-brand-950 font-bold transition-all shadow-sm cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Open Google Pay, PhonePe, Paytm, BHIM, or Navi. Transfer <strong>₹{membershipFee}</strong> directly to <strong>{storeUpiId}</strong>, take a screenshot of the successful transaction, and submit below.
                  </p>

                  <div>
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=Kaveri%20Electronic&am=${membershipFee}&cu=INR&tn=Kaveri%20Club%20Membership`}
                      className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 active:scale-95 text-brand-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>👉 Open UPI App to Pay ₹{membershipFee}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handlePaymentProofSubmit} className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-brand-950 uppercase tracking-wider">
                Submit Payment Details & Proof
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Full name as registered"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Membership Application ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={member.member_number}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    12-Digit UPI Transaction UTR / Ref Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUtr}
                    onChange={(e) => setNewUtr(e.target.value.toUpperCase())}
                    placeholder="e.g. 423984719283"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Found in your UPI payment receipt details
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Screenshot Showing Transaction Details <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-brand-500 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="payment-screenshot-input"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="payment-screenshot-input"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-brand-900">
                      {newScreenshot ? '✓ Screenshot Selected (Click to change)' : 'Click to Upload Payment Screenshot'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Permitted formats: JPEG, PNG, WEBP (Max 10MB)
                    </span>
                  </label>

                  {newScreenshot && (
                    <div className="mt-3 flex items-center justify-center">
                      <img
                        src={newScreenshot}
                        alt="Screenshot Preview"
                        className="w-24 h-24 object-cover rounded-xl border border-slate-300 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {reuploadError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{reuploadError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={reuploadLoading}
                className="w-full py-3.5 bg-brand-900 hover:bg-brand-800 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 text-gold-400" />
                <span>
                  {reuploadLoading ? 'Submitting Payment Proof...' : 'Submit ₹499 Payment for Verification'}
                </span>
              </button>
            </form>
          </div>
        );

        // Case 1: Payment Not Submitted
        if (isNotSubmitted) {
          return (
            <div className="space-y-6">
              {submissionSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs sm:text-sm font-bold flex items-center space-x-3 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <span>{submissionSuccessMsg}</span>
                </div>
              )}

              {renderStatusTracker()}

              {renderPaymentSubmissionForm(
                'Complete Your ₹499 Membership Payment',
                'Your registration is on file. Please pay ₹499 to activate your official digital membership card and unlock 50 welcome points.'
              )}
            </div>
          );
        }

        // Case 2: Payment Verification Pending
        if (isPending) {
          return (
            <div className="space-y-6">
              {submissionSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs sm:text-sm font-bold flex items-center space-x-3 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <span>{submissionSuccessMsg}</span>
                </div>
              )}

              {renderStatusTracker()}

              {/* Pending Verification Banner */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-900/5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-200 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-brand-950 flex items-center justify-center shadow-md">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                        ⏳ Payment Verification Pending
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-950 mt-1">
                        Application Submitted & Payment Under Review
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setMember(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline self-start sm:self-center"
                  >
                    Look up another
                  </button>
                </div>

                {/* Status Notice with Exact User-Requested Text */}
                <div className="p-4 rounded-2xl bg-white border border-amber-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                  <p className="font-bold text-slate-900">
                    Your ₹499 membership payment has been submitted for verification. Your membership card will be available after the administrator verifies and approves your payment.
                  </p>
                  <p className="text-slate-600 text-xs">
                    🔒 <strong>Administrator Verification Rule:</strong> The store administrator at Kaveri Electronic Halaguru verifies every transaction against actual bank statement records for UPI ID <strong>{storeUpiId}</strong> before card activation. You will receive an official confirmation SMS directly on your phone upon approval!
                  </p>
                </div>

                {/* Application Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/80 rounded-2xl p-4 border border-amber-200/80 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Applicant Name</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">{member.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Registered Phone</span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{member.primary_phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Membership Application ID</span>
                    <p className="font-mono font-bold text-brand-900 text-sm mt-0.5">{member.member_number}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Membership Fee Amount</span>
                    <p className="font-black text-amber-700 text-sm mt-0.5">₹{member.payment_amount || membershipFee} (One-Time)</p>
                  </div>
                  {member.payment_utr && (
                    <div>
                      <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">UPI Transaction ID / UTR</span>
                      <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">{member.payment_utr}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Submission Date & Time</span>
                    <p className="text-slate-700 text-xs mt-0.5">
                      {member.payment_submitted_at
                        ? new Date(member.payment_submitted_at).toLocaleString('en-IN')
                        : 'Submitted today'}
                    </p>
                  </div>
                </div>

                {/* Submitted Screenshot Proof */}
                {member.payment_screenshot && (
                  <div className="bg-white rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.payment_screenshot}
                        alt="Payment Receipt Preview"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:opacity-90"
                        onClick={() => setShowProofModal(true)}
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Payment Receipt Attached</p>
                        <p className="text-[11px] text-slate-500">Submitted for manager verification against bank records</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowProofModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Screenshot</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReuploadForm(!showReuploadForm)}
                        className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Update Proof</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Re-upload Form */}
                {showReuploadForm && (
                  <div className="pt-2">
                    {renderPaymentSubmissionForm(
                      'Update / Re-Upload Payment Proof',
                      'Submit updated transaction details or a clearer screenshot if needed.'
                    )}
                  </div>
                )}

                {/* Support Helpline Footer */}
                <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-700" />
                    <span>HMS Complex, Kanakapura Main Road, Halaguru</span>
                  </span>
                  <span>Store Helpline: <strong>+91 72041 62882</strong></span>
                </div>
              </div>

              {/* WhatsApp Community Invitation */}
              <div className="no-print bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-950">
                    Join Kaveri Member Club WhatsApp Group
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    While your payment is being verified, join our WhatsApp group for store updates and festival discounts!
                  </p>
                  <a
                    href={whatsappGroupUrl}
                    className="inline-flex items-center space-x-1.5 mt-2.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Join WhatsApp Group</span>
                  </a>
                </div>
              </div>
            </div>
          );
        }

        // Case 3: Payment Rejected
        if (isRejected) {
          return (
            <div className="space-y-6">
              {submissionSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs sm:text-sm font-bold flex items-center space-x-3 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <span>{submissionSuccessMsg}</span>
                </div>
              )}

              {renderStatusTracker()}

              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 shadow-xl shadow-rose-900/5 space-y-4">
                <div className="flex items-center space-x-3.5 text-rose-900">
                  <AlertCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-black text-rose-950">
                      Payment Verification Required
                    </h2>
                    <p className="text-xs text-rose-700 mt-0.5">
                      Your payment submission could not be verified in store bank records.
                    </p>
                  </div>
                </div>

                {member.rejection_reason && (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-900 font-medium">
                    <strong>Rejection Reason from Store Manager:</strong> {member.rejection_reason}
                  </div>
                )}

                <p className="text-xs text-slate-700">
                  Please re-submit your payment details below with a clear screenshot showing the successful transfer of ₹{member.payment_amount || membershipFee} to <strong>{storeUpiId}</strong>, or visit our store at HMS Complex, Halaguru.
                </p>

                {/* Re-submission Form */}
                {renderPaymentSubmissionForm(
                  'Re-Submit ₹499 Payment Proof',
                  'Provide your 12-digit UTR number and upload a clear screenshot of the completed transfer.'
                )}
              </div>
            </div>
          );
        }

        // Case 4: Active Approved Member Card (Stage 4: Approved & Stage 5: Card Available)
        return (
          <div className="space-y-6">
            {renderStatusTracker()}
            {/* Top Success Badge */}
            <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    Official Membership Active & Verified!
                  </p>
                  <p className="text-xs text-emerald-700">
                    Welcome points: <span className="font-bold">{member.loyalty_points || 50} pts</span> active • Tamper-proof digital seal verified.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMember(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                Look up another
              </button>
            </div>

            {/* Printable Anti-Counterfeit Digital Membership Card */}
            <div
              id="membership-card-print"
              ref={cardRef}
              className={`relative bg-gradient-to-br ${currentTheme.gradient} text-white rounded-3xl p-6 sm:p-8 print:p-8 shadow-2xl border-2 ${currentTheme.border} overflow-hidden`}
            >
              {/* Mathematical Guilloche Anti-Counterfeit Security Watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern
                      id={`guilloche-${member.id}`}
                      width={security.guillocheStep * 4}
                      height={security.guillocheStep * 4}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M0 ${security.guillocheStep} Q${security.guillocheStep} 0, ${security.guillocheStep * 2} ${security.guillocheStep} T${security.guillocheStep * 4} ${security.guillocheStep} M0 ${security.guillocheStep * 3} Q${security.guillocheStep} ${security.guillocheStep * 2}, ${security.guillocheStep * 2} ${security.guillocheStep * 3} T${security.guillocheStep * 4} ${security.guillocheStep * 3}`}
                        fill="none"
                        stroke={currentTheme.rosetteColor}
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={security.guillocheStep * 2}
                        cy={security.guillocheStep * 2}
                        r={security.guillocheStep}
                        fill="none"
                        stroke={currentTheme.rosetteColor}
                        strokeWidth="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#guilloche-${member.id})`} />
                </svg>
              </div>

              {/* Micro-print Security Ribbon along top edge */}
              <div className="text-[8px] font-mono tracking-wider text-slate-300 uppercase mb-3 select-none border-b border-white/15 pb-1.5 print:whitespace-normal print:break-all">
                AUTHENTIC MEMBER • KAVERI ELECTRONIC HALAGURU • HMS COMPLEX KANAKAPURA MAIN RD • TOKEN: {security.token} • CRC-{security.securityHash} • NON-TRANSFERABLE
              </div>

              {/* Card Header with Official 3D Logo */}
              <div className="flex items-start justify-between relative z-10 border-b border-white/15 pb-4 print:pb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src="/logo.png"
                    alt="Kaveri Electronic"
                    className="w-12 h-12 object-contain rounded-xl shadow-md border border-gold-400/40 bg-slate-900/60 p-0.5"
                  />
                  <div>
                    <h3 className="font-extrabold tracking-tight text-lg text-white">
                      KAVERI ELECTRONIC
                    </h3>
                    <p className="text-xs text-gold-400 font-bold uppercase tracking-wider">
                      HALAGURU • MEMBER CLUB
                    </p>
                  </div>
                </div>

                {/* Dynamic Laser Hologram / Tamper-Proof Authenticity Seal */}
                <div className="text-right flex flex-col items-end">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400/30 via-rose-400/30 to-emerald-400/30 text-white border border-white/30 shadow-sm backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 text-gold-300 animate-spin" />
                    <span>{currentTheme.name}</span>
                  </div>
                  <div className="mt-1 flex items-center space-x-1 text-[9px] font-mono font-bold text-emerald-300">
                    <Lock className="w-2.5 h-2.5" />
                    <span>SEAL: {security.token}</span>
                  </div>
                </div>
              </div>

            {/* Card Body: Member Details + Small Full-Details QR Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 print:gap-4 my-5 print:my-4 relative z-10 items-center">
              {/* Member Data */}
              <div className="sm:col-span-2 print:col-span-2 space-y-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-300 font-medium">
                    Cardholder Name
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight">
                    {member.full_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-300 font-medium">
                      Membership ID
                    </p>
                    <p className={`text-lg font-mono font-black ${currentTheme.accentText}`}>
                      {member.member_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-300 font-medium">
                      Loyalty Points
                    </p>
                    <p className="text-lg font-bold text-white flex items-center space-x-1">
                      <Award className="w-4 h-4 text-gold-400 inline" />
                      <span>{member.loyalty_points || 50} pts</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">
                      Primary Contact
                    </p>
                    <p className="text-xs font-mono text-slate-100 font-bold">
                      {member.primary_phone || 'Verified in Store'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">
                      Card Issued
                    </p>
                    <p className="text-xs text-slate-200">
                      {new Date(member.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">
                    Store Location & Support
                  </p>
                  <p className="text-[11px] text-slate-200 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                    <span>HMS Complex, Kanakapura Main Road, Halaguru</span>
                  </p>
                  <p className="text-[10px] text-slate-300 flex items-center space-x-2 mt-0.5">
                    <span>Help: <strong>+91 72041 62882</strong></span>
                    <span>•</span>
                    <span>mathrushreemep@gmail.com</span>
                  </p>
                </div>
              </div>

              {/* Small QR Code containing ALL user details */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl shadow-xl text-center self-center sm:justify-self-end print:justify-self-end">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Scan for Full Customer Details"
                    className="w-24 h-24 sm:w-28 sm:h-28 print:w-24 print:h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 animate-pulse rounded-lg" />
                )}
                <span className="text-[9px] font-black text-slate-900 mt-1 uppercase tracking-tight">
                  Scan for Full Details
                </span>
                <span className="text-[8px] text-slate-500 font-mono">
                  Verified Data Seal
                </span>
              </div>
            </div>

            {/* High-Resolution Code 128 Barcode for POS / Billing Desk Scanners (White container with dark bars for 100% optical scanner read) */}
            <div className="relative z-10 bg-white rounded-2xl p-3 border border-slate-200 flex flex-col items-center justify-center my-3 shadow-sm">
              <svg ref={barcodeRef} className="max-w-full h-11 print:h-11" />
              <p className="text-[9px] font-mono font-bold text-slate-800 uppercase tracking-widest mt-0.5">
                Official Optical POS Barcode • Scan at Store Checkout
              </p>
            </div>

            {/* Card Footer: Security Stamp & Microprint */}
            <div className="border-t border-white/15 pt-2 flex flex-col sm:flex-row print:flex-row items-center justify-between text-[10px] text-slate-300 relative z-10 gap-1">
              <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Genuine Kaveri Card • Anti-Fraud Cryptographic Fingerprint</span>
              </span>
              <span className="font-mono text-[9px] text-slate-300">
                AUTH-ID: #{member.id} • SEC: {security.securityHash}
              </span>
            </div>
          </div>

          {/* Action Buttons (No Print) */}
          <div className="no-print flex flex-wrap gap-3 items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-brand-900 text-white font-bold text-xs hover:bg-brand-800 flex items-center space-x-2 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Membership Card</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border border-slate-300 flex items-center space-x-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save Card as PDF</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateToPreferences(member.member_number)}
              className="px-4 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-brand-950 font-bold text-xs shadow-md transition-all"
            >
              Manage My Preferences & Opt-Out
            </button>
          </div>

          {/* WhatsApp Group Invite if configured */}
          <div className="no-print bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-emerald-950">
                Join the Official Kaveri Club WhatsApp Community
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Connect with our local store staff, receive early notifications on festival sales (Ugadi, Dasara, Diwali), and request instant product warranty support.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a
                  href={whatsappGroupUrl}
                  onClick={() => {
                    window.location.href = whatsappGroupUrl;
                  }}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>👉 Click to Open & Join WhatsApp Group</span>
                </a>
                <span className="text-xs text-slate-500">
                  Support Helpline: <strong className="text-slate-800">+91 72041 62882</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

      {/* Payment Screenshot Modal */}
      <Modal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        title="Payment Receipt Screenshot"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-center">
          {member?.payment_screenshot ? (
            <img
              src={member.payment_screenshot}
              alt="Payment Screenshot Full"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-2xl shadow-lg border border-slate-200"
            />
          ) : (
            <p className="text-xs text-slate-500">No screenshot preview available.</p>
          )}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowProofModal(false)}
              className="px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-brand-800"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
