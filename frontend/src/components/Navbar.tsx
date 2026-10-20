import React, { useState } from 'react';
import { Store, ShieldCheck, UserCheck, LayoutDashboard, LogOut, Menu, X, Award, MessageCircle } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isAdminLoggedIn,
  onAdminLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-brand-900 text-white shadow-lg sticky top-0 z-40 border-b border-brand-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Store Identity */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => handleNav(isAdminLoggedIn ? 'admin-dashboard' : 'register')}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md shadow-gold-900/30">
              <Store className="w-6 h-6 text-brand-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-gold-300 transition-colors">
                  KAVERI ELECTRONIC
                </span>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  HALAGURU
                </span>
              </div>
              <p className="text-xs text-brand-200 tracking-wide font-medium flex items-center space-x-1">
                <span>KAVERI MEMBER CLUB</span>
                <span>•</span>
                <span className="text-gold-400">HMS Complex, Kanakapura Rd</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {!isAdminLoggedIn ? (
              <>
                <button
                  onClick={() => handleNav('register')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentTab === 'register'
                      ? 'bg-brand-800 text-white shadow-inner border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60 hover:text-white'
                  }`}
                >
                  Join Member Club
                </button>
                <button
                  onClick={() => handleNav('card')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentTab === 'card'
                      ? 'bg-brand-800 text-white shadow-inner border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60 hover:text-white'
                  }`}
                >
                  View Membership Card
                </button>
                <button
                  onClick={() => handleNav('preferences')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentTab === 'preferences'
                      ? 'bg-brand-800 text-white shadow-inner border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60 hover:text-white'
                  }`}
                >
                  My Preferences & Opt-Out
                </button>
                <button
                  onClick={() => handleNav('privacy')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-brand-300 hover:text-white transition-colors`}
                >
                  Privacy Notice
                </button>
                <div className="h-6 w-px bg-brand-800 mx-2" />
                <button
                  onClick={() => handleNav('admin-login')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gold-600 hover:bg-gold-500 text-brand-950 shadow-sm transition-all flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Portal</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNav('admin-dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    currentTab === 'admin-dashboard'
                      ? 'bg-brand-800 text-white border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => handleNav('admin-members')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    currentTab === 'admin-members'
                      ? 'bg-brand-800 text-white border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => handleNav('admin-campaigns')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    currentTab === 'admin-campaigns'
                      ? 'bg-brand-800 text-white border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Campaigns</span>
                </button>
                <button
                  onClick={() => handleNav('admin-whatsapp')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    currentTab === 'admin-whatsapp'
                      ? 'bg-emerald-800 text-white border border-emerald-600'
                      : 'text-emerald-200 hover:bg-emerald-950/60 hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Group QR</span>
                </button>
                <button
                  onClick={() => handleNav('admin-audit')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentTab === 'admin-audit'
                      ? 'bg-brand-800 text-white border border-brand-700'
                      : 'text-brand-100 hover:bg-brand-800/60'
                  }`}
                >
                  Audit Logs
                </button>
                <div className="h-6 w-px bg-brand-800 mx-2" />
                <button
                  onClick={onAdminLogout}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-brand-200 hover:text-white hover:bg-brand-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-950 border-t border-brand-800 px-4 pt-3 pb-5 space-y-2">
          {!isAdminLoggedIn ? (
            <>
              <button
                onClick={() => handleNav('register')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                Join Member Club
              </button>
              <button
                onClick={() => handleNav('card')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                View Membership Card
              </button>
              <button
                onClick={() => handleNav('preferences')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                My Preferences & Opt-Out
              </button>
              <button
                onClick={() => handleNav('privacy')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-brand-300 hover:bg-brand-900"
              >
                Privacy Notice (DPDP Act)
              </button>
              <button
                onClick={() => handleNav('admin-login')}
                className="w-full mt-2 text-center px-4 py-2.5 rounded-lg text-base font-bold bg-gold-500 text-brand-950"
              >
                Admin Login
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNav('admin-dashboard')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNav('admin-members')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                Members Management
              </button>
              <button
                onClick={() => handleNav('admin-campaigns')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                Promotional Campaigns
              </button>
              <button
                onClick={() => handleNav('admin-whatsapp')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-emerald-300 hover:bg-brand-900 flex items-center space-x-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Group & Counter QR</span>
              </button>
              <button
                onClick={() => handleNav('admin-audit')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-brand-900"
              >
                Security Audit Logs
              </button>
              <button
                onClick={onAdminLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold text-rose-400 hover:bg-brand-900"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
