import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { api, ApiError } from '../api/client';
import { Award, Printer, Download, Store, MessageCircle, MapPin, CheckCircle, Search, ShieldCheck } from 'lucide-react';

interface CardPageProps {
  initialMemberData?: any;
  onNavigateToPreferences: (memberNumber: string) => void;
}

export const CardPage: React.FC<CardPageProps> = ({
  initialMemberData,
  onNavigateToPreferences,
}) => {
  const [member, setMember] = useState<any>(initialMemberData?.member || null);
  const [searchId, setSearchId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('https://chat.whatsapp.com/KaveriClubOfficial');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch store WhatsApp group settings
  useEffect(() => {
    api.getPublicSettings()
      .then((settings) => {
        if (settings.whatsapp_group_url) {
          setWhatsappGroupUrl(settings.whatsapp_group_url);
        }
      })
      .catch(() => {});
  }, []);

  // Generate QR code whenever member changes
  useEffect(() => {
    if (member?.member_number) {
      // The QR code encodes verification link without exposing sensitive private phone/address
      const verificationUrl = `${window.location.origin}/#preferences?id=${encodeURIComponent(member.member_number)}`;
      QRCode.toDataURL(verificationUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('QR code generation failed', err));
    }
  }, [member]);

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

  const handleDownloadImage = () => {
    // Print dialog handles high-res PDF or physical paper
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
            Enter your Kaveri Member Club ID to retrieve your digital card
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
                  Welcome points: <span className="font-bold">{member.loyalty_points || 50} pts</span> active in your loyalty ledger.
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

          {/* Printable Digital Membership Card */}
          <div
            id="membership-card-print"
            ref={cardRef}
            className="relative bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-gold-500/40 overflow-hidden"
          >
            {/* Background Decorative Gold Waves */}
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-start justify-between relative z-10 border-b border-brand-800/80 pb-4">
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

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-gold-500/20 text-gold-300 border border-gold-400/30">
                  GOLD MEMBER
                </span>
                <p className="text-[10px] text-slate-400 mt-1">STATUS: ACTIVE</p>
              </div>
            </div>

            {/* Card Body with QR Code & Member Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-6 relative z-10 items-center">
              {/* Member Data */}
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Member Name
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight">
                    {member.full_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                      Membership ID
                    </p>
                    <p className="text-lg font-mono font-bold text-gold-400">
                      {member.member_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                      Loyalty Points
                    </p>
                    <p className="text-lg font-bold text-white flex items-center space-x-1">
                      <Award className="w-4 h-4 text-gold-400 inline" />
                      <span>{member.loyalty_points || 50} pts</span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Store Location
                  </p>
                  <p className="text-xs text-slate-300 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                    <span>HMS Complex, Kanakapura Main Road, Halaguru Hobli</span>
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner text-center">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Membership Verification QR Code"
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 animate-pulse rounded-lg" />
                )}
                <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase tracking-tight">
                  Scan in store
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="border-t border-brand-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Customer • Non-Transferable</span>
              </span>
              <span>Since: {new Date(member.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
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
                onClick={handleDownloadImage}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border border-slate-300 flex items-center space-x-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save as PDF</span>
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
              <a
                href={whatsappGroupUrl}
                onClick={() => {
                  window.location.href = whatsappGroupUrl;
                }}
                className="inline-flex items-center space-x-2 mt-3 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>👉 Click to Open & Join WhatsApp Group Directly</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
