import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

interface AdminDownloadPageProps {
  onGoToLogin: () => void;
  onTriggerPwaInstall?: () => void;
}

export const AdminDownloadPage: React.FC<AdminDownloadPageProps> = ({
  onGoToLogin,
  onTriggerPwaInstall,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleApkDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/KaveriAdmin.apk';
    link.download = 'KaveriAdmin.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 max-w-2xl mx-auto flex flex-col justify-center">
      {/* Top Branding Card */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-3">
          <img
            src="/logo.png"
            alt="Kaveri Electronic Halaguru"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-3xl shadow-2xl border-2 border-gold-400/50 bg-slate-900/90 p-2 mx-auto"
          />
          <span className="absolute -bottom-2 -right-1 bg-gradient-to-r from-amber-500 to-gold-400 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-lg border border-gold-200 uppercase tracking-wider">
            Admin
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Kaveri Admin
        </h1>
        <p className="text-sm font-semibold text-brand-900 mt-1">
          Kaveri Electronic Halaguru • Store Owner & Staff Portal
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Dedicated Android application for verifying customer ₹499 membership payments, managing loyalty points, and approving digital ID cards.
        </p>
      </div>

      {/* Main Download Card */}
      <div className="bg-gradient-to-b from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* App Specs Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">Official Admin Release</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">v2.0.0</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono text-gold-400">
              <span>Android APK</span>
              <span>•</span>
              <span>~1.4 MB</span>
            </div>
          </div>

          {/* Primary APK Download Button */}
          <div className="space-y-3">
            <button
              onClick={handleApkDownload}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 hover:from-gold-400 hover:to-amber-300 active:scale-[0.99] text-brand-950 font-black text-base sm:text-lg shadow-xl shadow-gold-500/20 transition-all flex items-center justify-center space-x-3 cursor-pointer group"
            >
              <Download className="w-6 h-6 text-brand-950 group-hover:-translate-y-0.5 transition-transform" />
              <span>Download Kaveri Admin (.apk)</span>
            </button>

            {onTriggerPwaInstall && (
              <button
                onClick={onTriggerPwaInstall}
                className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2"
              >
                <Smartphone className="w-4 h-4 text-gold-400" />
                <span>Or Install to Phone Home Screen (PWA)</span>
              </button>
            )}
          </div>

          {downloadStarted && (
            <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Downloading KaveriAdmin.apk!</strong> When done, open the file and tap <strong>Install</strong>.
              </span>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Direct Admin Access</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Always opens Admin Portal directly. Never loads user screen.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Instant Approvals</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Approve or reject customer ₹499 payments with 1 tap.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Secure Session</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Protected with Argon2id auth & automated 12h session security.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Installation Guide */}
      <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
        <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center space-x-2">
          <Info className="w-5 h-5 text-brand-900" />
          <span>Quick 3-Step Phone Installation Guide</span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-brand-900 text-gold-400 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Tap the Download button above
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Your browser will download <strong>KaveriAdmin.apk</strong> (~1.4 MB).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-brand-900 text-gold-400 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Open file & Tap "Install"
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Open the notification or your Downloads folder. If your phone asks <em>"Allow installation from unknown sources"</em>, click <strong>Allow</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-brand-900 text-gold-400 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Launch "Kaveri Admin" & Sign In
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Find the gold-badged <strong>Kaveri Admin</strong> app on your home screen and sign in:
              </p>
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 space-y-1">
                <div>Mobile: <strong className="text-brand-900">9999999999</strong></div>
                <div>Password: <strong className="text-brand-900">admin123</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Links */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            onClick={onGoToLogin}
            className="text-brand-900 hover:text-brand-800 font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Or Open Admin Portal in Browser</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <a
            href="/"
            className="text-slate-500 hover:text-slate-800 font-semibold flex items-center space-x-1"
          >
            <span>Go to Customer Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
