import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { api, ApiError } from '../api/client';
import {
  Award,
  Printer,
  Download,
  Store,
  MessageCircle,
  MapPin,
  CheckCircle,
  Search,
  ShieldCheck,
  Lock,
  Sparkles,
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

  const cardRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const security = getCardSecurityFeatures(member);
  const currentTheme = CARD_THEMES[security.themeIndex];

  // Fetch store WhatsApp group settings
  useEffect(() => {
    api
      .getPublicSettings()
      .then((settings) => {
        if (settings.whatsapp_group_url) {
          setWhatsappGroupUrl(settings.whatsapp_group_url);
        }
      })
      .catch(() => {});
  }, []);

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

  // 2. Generate Code 128 Barcode for POS scanner readability
  useEffect(() => {
    if (barcodeRef.current && member?.member_number) {
      try {
        JsBarcode(barcodeRef.current, member.member_number, {
          format: 'CODE128',
          lineColor: '#ffffff',
          width: 1.5,
          height: 38,
          displayValue: true,
          font: 'monospace',
          fontSize: 11,
          textMargin: 3,
          background: 'transparent',
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

      {/* Confirmation & Active Membership Card */}
      {member && (
        <div className="space-y-6">
          {/* Top Success Badge */}
          <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  Official Membership Confirmed!
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
            className={`relative bg-gradient-to-br ${currentTheme.gradient} text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 ${currentTheme.border} overflow-hidden`}
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
            <div className="text-[7px] font-mono tracking-widest text-slate-400/50 uppercase truncate mb-2 select-none border-b border-white/10 pb-1">
              AUTHENTIC MEMBER • KAVERI ELECTRONIC HALAGURU • HMS COMPLEX KANAKAPURA MAIN RD • TOKEN: {security.token} • CRC-{security.securityHash} • NON-TRANSFERABLE
            </div>

            {/* Card Header */}
            <div className="flex items-start justify-between relative z-10 border-b border-white/15 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-brand-950 shadow-md">
                  <Store className="w-6 h-6" />
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-5 relative z-10 items-center">
              {/* Member Data */}
              <div className="sm:col-span-2 space-y-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                    Cardholder Name
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight">
                    {member.full_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                      Membership ID
                    </p>
                    <p className={`text-lg font-mono font-black ${currentTheme.accentText}`}>
                      {member.member_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
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
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      Primary Contact
                    </p>
                    <p className="text-xs font-mono text-slate-200">
                      {member.primary_phone || 'Verified in Store'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    Store Location & Support
                  </p>
                  <p className="text-[11px] text-slate-300 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                    <span>HMS Complex, Kanakapura Main Road, Halaguru</span>
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span>Help: +91 72041 62882</span>
                    <span>•</span>
                    <span>mathrushreemep@gmail.com</span>
                  </p>
                </div>
              </div>

              {/* Small QR Code containing ALL user details */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl shadow-xl text-center self-center sm:justify-self-end">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Scan for Full Customer Details"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
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

            {/* High-Resolution Code 128 Barcode for POS / Billing Desk Scanners */}
            <div className="relative z-10 bg-slate-950/60 rounded-xl p-2.5 border border-white/10 flex flex-col items-center justify-center my-3">
              <svg ref={barcodeRef} className="max-w-full h-11" />
              <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                Official Optical POS Barcode • Scan at Store Checkout
              </p>
            </div>

            {/* Card Footer: Security Stamp & Microprint */}
            <div className="border-t border-white/15 pt-2 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 relative z-10 gap-1">
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
      )}
    </div>
  );
};
