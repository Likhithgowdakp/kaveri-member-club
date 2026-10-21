import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RegisterPage } from './pages/RegisterPage';
import { CardPage } from './pages/CardPage';
import { MemberLoginPage } from './pages/MemberLoginPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminMembers } from './pages/AdminMembers';
import { AdminMemberDetail } from './pages/AdminMemberDetail';
import { AdminCampaigns } from './pages/AdminCampaigns';
import { AdminAuditLogs } from './pages/AdminAuditLogs';
import { AdminWhatsAppGroup } from './pages/AdminWhatsAppGroup';
import { api } from './api/client';
import { ShieldCheck, ShieldAlert, Phone, MapPin, Mail } from 'lucide-react';

// Protected Route Guard for Admin views
const ProtectedAdminRoute: React.FC<{
  adminUser: any;
  onRedirectToLogin: () => void;
  children: React.ReactNode;
}> = ({ adminUser, onRedirectToLogin, children }) => {
  useEffect(() => {
    if (!adminUser) {
      onRedirectToLogin();
    }
  }, [adminUser, onRedirectToLogin]);

  if (!adminUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-rose-200">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Administrative privileges required. Please sign in with authorized store credentials.
          </p>
          <button
            onClick={onRedirectToLogin}
            className="w-full py-2.5 px-4 bg-brand-900 hover:bg-brand-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Route parser supporting dedicated private admin access routes (/admin/login, #admin/login)
const parseRoute = (user: any): string => {
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();

  // 1. Private Admin Routes (non-advertised URL)
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminHash = hash === 'admin' || hash.startsWith('admin/') || hash === 'admin-login';

  if (isAdminPath || isAdminHash) {
    if (user) {
      if (pathname.includes('/members') || hash.includes('members')) return 'admin-members';
      if (pathname.includes('/campaigns') || hash.includes('campaigns')) return 'admin-campaigns';
      if (pathname.includes('/whatsapp') || hash.includes('whatsapp')) return 'admin-whatsapp';
      if (pathname.includes('/audit') || hash.includes('audit')) return 'admin-audit';
      return 'admin-dashboard';
    }
    // Unauthenticated visitors always land on admin login
    return 'admin-login';
  }

  // 2. Public and customer routes
  if (pathname.startsWith('/login') || hash === 'login' || hash === 'member-login') {
    return 'member-login';
  }
  if (pathname.startsWith('/card') || hash === 'card') {
    return 'card';
  }
  if (pathname.startsWith('/preferences') || hash.startsWith('preferences')) {
    return 'preferences';
  }
  if (pathname.startsWith('/privacy') || hash === 'privacy') {
    return 'privacy';
  }

  return 'register';
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('register');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loggedInMember, setLoggedInMember] = useState<any>(null);
  const [justLoggedOut, setJustLoggedOut] = useState<boolean>(false);
  const [registeredMemberData, setRegisteredMemberData] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [prefMemberNumber, setPrefMemberNumber] = useState<string>('');

  // PWA Mobile App Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
    } catch {
      // Ignored
    }
    setDeferredPrompt(null);
  };

  // Check stored sessions and verify with server on mount
  useEffect(() => {
    const initSessions = async () => {
      // 1. Member session
      const storedMember = localStorage.getItem('kaveri_member_session');
      if (storedMember) {
        try {
          setLoggedInMember(JSON.parse(storedMember));
        } catch {
          localStorage.removeItem('kaveri_member_session');
        }
      }

      // 2. Admin session: verify with backend /auth/me
      const token = localStorage.getItem('kaveri_admin_token');
      const storedUser = localStorage.getItem('kaveri_admin_user');
      let verifiedAdmin = null;

      if (token && storedUser) {
        try {
          const profile = await api.getAdminProfile();
          verifiedAdmin = profile;
          setAdminUser(profile);
          localStorage.setItem('kaveri_admin_user', JSON.stringify(profile));
        } catch {
          // Token invalid, expired, or manipulated
          localStorage.removeItem('kaveri_admin_token');
          localStorage.removeItem('kaveri_admin_user');
          setAdminUser(null);
        }
      }

      // Check URL parameters for preferences
      const hashRaw = window.location.hash.replace('#', '');
      if (hashRaw.startsWith('preferences')) {
        const params = new URLSearchParams(hashRaw.split('?')[1] || '');
        const id = params.get('id');
        if (id) {
          setPrefMemberNumber(id);
        }
      }

      const initialTab = parseRoute(verifiedAdmin);
      setCurrentTab(initialTab);
    };

    initSessions();

    const handleUrlChange = () => {
      const storedUser = localStorage.getItem('kaveri_admin_user');
      const token = localStorage.getItem('kaveri_admin_token');
      let userObj = null;
      if (token && storedUser) {
        try {
          userObj = JSON.parse(storedUser);
        } catch {
          userObj = null;
        }
      }
      const tab = parseRoute(userObj);
      setCurrentTab(tab);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'admin-login') {
      window.history.pushState(null, '', '/admin/login');
    } else if (tab === 'admin-dashboard') {
      window.history.pushState(null, '', '/admin/dashboard');
    } else if (tab.startsWith('admin-')) {
      const sub = tab.replace('admin-', '');
      window.history.pushState(null, '', `/admin/${sub}`);
    } else if (tab === 'register') {
      window.history.pushState(null, '', '/#register');
    } else if (tab === 'member-login') {
      window.history.pushState(null, '', '/#login');
    } else if (tab === 'card') {
      window.history.pushState(null, '', '/#card');
    } else if (tab === 'preferences') {
      window.history.pushState(null, '', '/#preferences');
    } else if (tab === 'privacy') {
      window.history.pushState(null, '', '/#privacy');
    }
  };

  const handleAdminLogout = async () => {
    await api.adminLogout();
    setAdminUser(null);
    navigateTo('register');
  };

  const handleMemberLogin = (memberData: any) => {
    setLoggedInMember(memberData);
    setJustLoggedOut(false);
    setRegisteredMemberData({ member: memberData });
    navigateTo('card');
  };

  const handleMemberLogout = () => {
    localStorage.removeItem('kaveri_member_session');
    setLoggedInMember(null);
    setJustLoggedOut(true);
    navigateTo('member-login');
  };

  const handleRegistrationSuccess = (result: any) => {
    setRegisteredMemberData(result);
    if (result?.member) {
      setLoggedInMember(result.member);
      localStorage.setItem('kaveri_member_session', JSON.stringify(result.member));
    }
    navigateTo('card');
  };

  const handleNavigateToPreferences = (memberNumber: string) => {
    setPrefMemberNumber(memberNumber);
    navigateTo('preferences');
  };

  const handleSelectMember = (memberId: number) => {
    setSelectedMemberId(memberId);
    navigateTo('admin-member-detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-900 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={navigateTo}
        isAdminLoggedIn={!!adminUser}
        onAdminLogout={handleAdminLogout}
        loggedInMember={loggedInMember}
        onMemberLogout={handleMemberLogout}
      />

      {/* PWA Mobile App Install Bar */}
      {showInstallBanner && (
        <div className="no-print bg-gradient-to-r from-brand-950 via-brand-900 to-indigo-950 text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md border-b border-brand-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">📲</span>
            <span>
              Install <strong>Kaveri Club Official App</strong> on your phone for 1-tap card access!
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallApp}
              className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-brand-950 font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 text-slate-400 hover:text-white text-xs"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'register' && (
          <RegisterPage onRegistrationSuccess={handleRegistrationSuccess} />
        )}

        {currentTab === 'member-login' && (
          <MemberLoginPage
            onLoginSuccess={handleMemberLogin}
            onNavigateToRegister={() => navigateTo('register')}
            justLoggedOut={justLoggedOut}
          />
        )}

        {currentTab === 'card' && (
          <CardPage
            initialMemberData={registeredMemberData}
            loggedInMember={loggedInMember}
            onNavigateToPreferences={handleNavigateToPreferences}
            onNavigateToLogin={() => navigateTo('member-login')}
          />
        )}

        {currentTab === 'preferences' && (
          <PreferencesPage
            initialMemberNumber={prefMemberNumber}
            loggedInMember={loggedInMember}
            onMemberLogout={handleMemberLogout}
            onNavigateToLogin={() => navigateTo('member-login')}
          />
        )}

        {currentTab === 'privacy' && <PrivacyPage />}

        {currentTab === 'admin-login' && (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              navigateTo('admin-dashboard');
            }}
          />
        )}

        {currentTab === 'admin-dashboard' && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminDashboard onNavigate={(tab) => navigateTo(tab)} />
          </ProtectedAdminRoute>
        )}

        {currentTab === 'admin-members' && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminMembers onSelectMember={handleSelectMember} />
          </ProtectedAdminRoute>
        )}

        {currentTab === 'admin-member-detail' && selectedMemberId && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminMemberDetail
              memberId={selectedMemberId}
              onBack={() => navigateTo('admin-members')}
            />
          </ProtectedAdminRoute>
        )}

        {currentTab === 'admin-campaigns' && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminCampaigns />
          </ProtectedAdminRoute>
        )}

        {currentTab === 'admin-whatsapp' && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminWhatsAppGroup />
          </ProtectedAdminRoute>
        )}

        {currentTab === 'admin-audit' && (
          <ProtectedAdminRoute adminUser={adminUser} onRedirectToLogin={() => navigateTo('admin-login')}>
            <AdminAuditLogs />
          </ProtectedAdminRoute>
        )}
      </main>

      {/* Store Footer */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Store Details */}
            <div>
              <div className="flex items-center space-x-2.5 text-white font-extrabold text-sm mb-2">
                <img
                  src="/logo.png"
                  alt="Kaveri Electronic"
                  className="w-7 h-7 object-contain rounded-lg shadow-sm border border-gold-400/30"
                />
                <span>KAVERI ELECTRONIC HALAGURU</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your trusted family electronics and home appliances store serving Halaguru, Kanakapura, Malavalli, and surrounding villages.
              </p>
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 mt-3">
                <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                <span>HMS Complex, Kanakapura Main Road, Karnataka - 571421</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                Club Information
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigateTo('register')} className="hover:text-white transition-colors">
                    Register as Member (50 Welcome Points)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('member-login')} className="hover:text-gold-400 font-bold transition-colors">
                    Member Sign In / ಲಾಗಿನ್
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('preferences')} className="hover:text-white transition-colors">
                    Communication Preferences & Opt-Out
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('privacy')} className="hover:text-white transition-colors">
                    DPDP Act Privacy Policy & Notice
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Hours */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                Customer Support
              </h4>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center space-x-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <a href="tel:+917204162882" className="hover:text-emerald-400 transition-colors">+91 72041 62882</a>
                </p>
                <p className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <a href="mailto:mathrushreemep@gmail.com" className="hover:text-blue-400 transition-colors">mathrushreemep@gmail.com</a>
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Store Hours: Monday – Sunday, 9:30 AM to 9:00 PM IST
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Kaveri Electronic Halaguru. All rights reserved.</p>
            <p className="mt-2 sm:mt-0 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>Compliant with Digital Personal Data Protection Act, 2023</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
