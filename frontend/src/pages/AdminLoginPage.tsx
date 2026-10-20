import React, { useState } from 'react';
import { api, ApiError } from '../api/client';
import { Modal } from '../components/Modal';
import { ShieldCheck, Lock, User, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mandatory first-login password change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChangeError, setPwdChangeError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.adminLogin({
        username: username.trim(),
        password: password.trim(),
      });

      if (res.must_change_password) {
        setTempUser(res.user);
        setCurrentPassword(password);
        setShowPasswordChangeModal(true);
      } else {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg('Login failed. Please check network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError(null);

    if (newPassword.length < 8) {
      setPwdChangeError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdChangeError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setShowPasswordChangeModal(false);
      onLoginSuccess(tempUser);
    } catch (err: any) {
      setPwdChangeError(err.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-900 to-brand-950 text-gold-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-950/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-brand-950">Store Administration</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kaveri Electronic Halaguru • Authorized Staff & Owner Portal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}


        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="adminUsername" className="block text-xs font-bold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="adminUsername"
                type="text"
                required
                autoComplete="username"
                placeholder="Admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="adminPassword"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-900 hover:bg-brand-800 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
          >
            {loading ? <span>Signing In...</span> : <span>Sign In to Dashboard</span>}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Protected with Argon2id hashing & rate-limiting • Sessions expire after 12 hours
          </p>
        </div>
      </div>

      {/* Mandatory First-Login Password Change Modal */}
      <Modal
        isOpen={showPasswordChangeModal}
        onClose={() => {}}
        title="Mandatory Password Update Required"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
            <KeyRound className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p>
              This account was created with a temporary password. Under our security policy, you must set a private password before continuing.
            </p>
          </div>

          {pwdChangeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {pwdChangeError}
            </div>
          )}

          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Secure Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-white bg-brand-900 hover:bg-brand-800 text-xs shadow-md transition-all"
            >
              Update Password & Enter Dashboard
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
};
