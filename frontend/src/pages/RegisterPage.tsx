import React, { useState } from 'react';
import { api, ApiError } from '../api/client';
import { Modal } from '../components/Modal';
import {
  ShieldCheck,
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RegisterPageProps {
  onRegistrationSuccess: (memberData: any) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegistrationSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Password for Member Portal Login
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Consent checkboxes UNCHECKED by default
  const [consentWhatsapp, setConsentWhatsapp] = useState(false);
  const [consentSms, setConsentSms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!acceptPrivacy) {
      setErrorMsg('Please read and agree to the Membership Privacy Notice to register.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Please enter an account password of at least 4 characters for logging into your member portal.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both password fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.registerMember({
        full_name: fullName.trim(),
        primary_phone: primaryPhone.trim(),
        alt_phone: altPhone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        password: password,
        consent_whatsapp: consentWhatsapp,
        consent_sms: consentSms,
        accept_privacy_notice: acceptPrivacy,
      });

      onRegistrationSuccess(result);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg(err.message || 'Registration failed. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Brand Header Banner with Official 3D Logo */}
      <div className="text-center mb-8">
        <div className="inline-block relative mb-4">
          <img
            src="/logo.png"
            alt="Kaveri Electronic Halaguru"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl shadow-2xl border-2 border-gold-400/50 bg-slate-900/60 p-1 mx-auto"
          />
        </div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gold-100 text-gold-900 border border-gold-300 text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-gold-700" />
          <span>Official Membership Club • 50 Welcome Reward Points</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-950 tracking-tight">
          Join Kaveri Member Club
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium">
          Kaveri Electronic Halaguru • Your Trusted Home Appliances & Electronics Store
        </p>
        <div className="flex items-center justify-center space-x-1 text-xs text-slate-500 mt-1">
          <MapPin className="w-3.5 h-3.5 text-brand-700" />
          <span>HMS Complex, Kanakapura Main Road, Halaguru Hobli, Karnataka</span>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-10">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to Complete Registration</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-bold text-slate-800 mb-1.5">
              Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Primary Mobile */}
          <div>
            <label htmlFor="primaryPhone" className="block text-sm font-bold text-slate-800 mb-1.5">
              Primary Mobile Number <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                +91
              </span>
              <input
                id="primaryPhone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder="10-digit number e.g. 98451 23456"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                className="w-full pl-14 pr-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used for your unique membership ID, warranty records, and loyalty benefits.
            </p>
          </div>

          {/* Secondary Mobile & Email (Two Column on Tablet/Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="altPhone" className="block text-xs font-bold text-slate-700 mb-1.5">
                Alternative Mobile (Optional)
              </label>
              <input
                id="altPhone"
                type="tel"
                inputMode="tel"
                placeholder="Alternative contact number"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address (Optional)
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Address / Area */}
          <div>
            <label htmlFor="address" className="block text-xs font-bold text-slate-700 mb-1.5">
              Home Address / Area (Optional)
            </label>
            <input
              id="address"
              type="text"
              placeholder="e.g. Halaguru Town, Kanakapura Road, or nearby village"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm text-slate-900"
            />
          </div>

          {/* Account Password for Member Portal Login */}
          <div className="bg-amber-50/60 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-brand-900" />
              <h3 className="text-sm font-bold text-brand-950">
                Set Your Member Club Password <span className="text-rose-600">*</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You will use this password along with your Member ID to log in to your digital membership card, view loyalty points, and manage preferences.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label htmlFor="regPassword" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Create Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Min 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="regConfirmPassword" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm Password <span className="text-rose-600">*</span>
                </label>
                <input
                  id="regConfirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Voluntary Separate Marketing Consents (DPDP Act 2023 Compliant) */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-brand-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Communication Preferences (Optional)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              We respect your privacy. Marketing messages are entirely voluntary. You will receive membership benefits regardless of your choice below.
            </p>

            {/* WhatsApp Consent */}
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentWhatsapp}
                onChange={(e) => setConsentWhatsapp(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900 flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>Receive WhatsApp promotional updates</span>
                </span>
                <p className="text-slate-500 mt-0.5">
                  Get exclusive festival discounts, new electronics arrivals, and member flash sales directly on WhatsApp. Unchecked by default.
                </p>
              </div>
            </label>

            {/* SMS Consent */}
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentSms}
                onChange={(e) => setConsentSms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900 flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5 text-brand-600 inline" />
                  <span>Receive SMS promotional offers</span>
                </span>
                <p className="text-slate-500 mt-0.5">
                  Receive festival coupon codes and annual anniversary discounts via DLT-approved SMS. Unchecked by default.
                </p>
              </div>
            </label>
          </div>

          {/* Mandatory Privacy Notice Agreement */}
          <div className="pt-2">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I agree to the membership terms and acknowledge that my details will be stored securely by Kaveri Electronic Halaguru for loyalty services as detailed in the{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="font-bold text-brand-700 underline hover:text-brand-900"
                >
                  Membership Privacy Notice (DPDP Act, 2023)
                </button>
                . <span className="text-rose-600 font-bold">*</span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-brand-950 via-brand-900 to-indigo-950 hover:from-brand-900 hover:to-indigo-900 active:scale-[0.99] transition-all shadow-xl shadow-brand-900/30 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2.5 cursor-pointer border border-gold-400/30"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin text-gold-400">⏳</span>
                <span>Creating Membership Account...</span>
              </span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-gold-400" />
                <span className="text-base tracking-wide">
                  Complete Registration
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Accessible DPDP Privacy Notice Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Kaveri Member Club • Privacy Notice"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-start space-x-2 text-brand-900">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-brand-600" />
            <p>
              This privacy notice outlines your statutory rights under the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> of India.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">1. Data Fiduciary</h4>
            <p>
              <strong>Kaveri Electronic Halaguru</strong>, HMS Complex, Kanakapura Main Road, Halaguru Hobli, Karnataka - 571421. Contact: mathrushreemep@gmail.com | Phone: +91 72041 62882.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">2. Purpose of Collection</h4>
            <p>
              Your name and mobile number are collected exclusively to issue your digital membership identity, record warranty purchases, track voluntary loyalty reward points, and verify your customer profile in our store.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">3. Marketing Channels are Separate & Voluntary</h4>
            <p>
              WhatsApp and SMS promotional updates require affirmative, separate opt-in checkboxes. Leaving checkboxes empty does NOT restrict your membership privileges or loyalty points.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">4. Your Right to Instant Opt-Out & Erasure</h4>
            <p>
              You have the right to withdraw marketing consent at any time via our online Customer Preferences Portal. Opt-outs take immediate effect in our database. You can also request data correction or account closure.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">5. Data Security & Storage</h4>
            <p>
              We do not sell, rent, or trade your personal data. Records are encrypted and stored in an access-controlled database with regular automated backups.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="px-5 py-2 rounded-xl bg-brand-900 text-white font-bold text-xs hover:bg-brand-800 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
