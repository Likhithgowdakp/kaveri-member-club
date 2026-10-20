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
import { Store, ShieldCheck, Phone, MapPin, Mail } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('register');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loggedInMember, setLoggedInMember] = useState<any>(null);
  const [justLoggedOut, setJustLoggedOut] = useState<boolean>(false);
  const [registeredMemberData, setRegisteredMemberData] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [prefMemberNumber, setPrefMemberNumber] = useState<string>('');

  // Check stored sessions on mount
  useEffect(() => {
    // 1. Admin session
    const storedUser = localStorage.getItem('kaveri_admin_user');
    const token = localStorage.getItem('kaveri_admin_token');
    if (storedUser && token) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('kaveri_admin_user');
      }
    }

    // 2. Member session
    const storedMember = localStorage.getItem('kaveri_member_session');
    if (storedMember) {
      try {
        const parsed = JSON.parse(storedMember);
        setLoggedInMember(parsed);
      } catch {
        localStorage.removeItem('kaveri_member_session');
      }
    }

    // Handle hash route
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('preferences')) {
      const params = new URLSearchParams(hash.split('?')[1] || '');
      const id = params.get('id');
      if (id) {
        setPrefMemberNumber(id);
      }
      setCurrentTab('preferences');
    } else if (hash === 'login' || hash === 'member-login') {
      setCurrentTab('member-login');
    } else if (hash === 'admin' || hash === 'admin-login') {
      setCurrentTab(storedUser && token ? 'admin-dashboard' : 'admin-login');
    }
  }, []);

  const handleAdminLogout = async () => {
    await api.adminLogout();
    setAdminUser(null);
    setCurrentTab('register');
  };

  const handleMemberLogin = (memberData: any) => {
    setLoggedInMember(memberData);
    setJustLoggedOut(false);
    setRegisteredMemberData({ member: memberData });
    setCurrentTab('card');
  };

  const handleMemberLogout = () => {
    localStorage.removeItem('kaveri_member_session');
    setLoggedInMember(null);
    setJustLoggedOut(true);
    setCurrentTab('member-login');
  };

  const handleRegistrationSuccess = (result: any) => {
    setRegisteredMemberData(result);
    if (result?.member) {
      setLoggedInMember(result.member);
      localStorage.setItem('kaveri_member_session', JSON.stringify(result.member));
    }
    setCurrentTab('card');
  };

  const handleNavigateToPreferences = (memberNumber: string) => {
    setPrefMemberNumber(memberNumber);
    setCurrentTab('preferences');
  };

  const handleSelectMember = (memberId: number) => {
    setSelectedMemberId(memberId);
    setCurrentTab('admin-member-detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-900 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdminLoggedIn={!!adminUser}
        onAdminLogout={handleAdminLogout}
        loggedInMember={loggedInMember}
        onMemberLogout={handleMemberLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'register' && (
          <RegisterPage onRegistrationSuccess={handleRegistrationSuccess} />
        )}

        {currentTab === 'member-login' && (
          <MemberLoginPage
            onLoginSuccess={handleMemberLogin}
            onNavigateToRegister={() => setCurrentTab('register')}
            justLoggedOut={justLoggedOut}
          />
        )}

        {currentTab === 'card' && (
          <CardPage
            initialMemberData={registeredMemberData}
            loggedInMember={loggedInMember}
            onNavigateToPreferences={handleNavigateToPreferences}
            onNavigateToLogin={() => setCurrentTab('member-login')}
          />
        )}

        {currentTab === 'preferences' && (
          <PreferencesPage
            initialMemberNumber={prefMemberNumber}
            loggedInMember={loggedInMember}
            onMemberLogout={handleMemberLogout}
            onNavigateToLogin={() => setCurrentTab('member-login')}
          />
        )}

        {currentTab === 'privacy' && <PrivacyPage />}

        {currentTab === 'admin-login' && (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              setCurrentTab('admin-dashboard');
            }}
          />
        )}

        {currentTab === 'admin-dashboard' && (
          <AdminDashboard onNavigate={(tab) => setCurrentTab(tab)} />
        )}

        {currentTab === 'admin-members' && (
          <AdminMembers onSelectMember={handleSelectMember} />
        )}

        {currentTab === 'admin-member-detail' && selectedMemberId && (
          <AdminMemberDetail
            memberId={selectedMemberId}
            onBack={() => setCurrentTab('admin-members')}
          />
        )}

        {currentTab === 'admin-campaigns' && <AdminCampaigns />}

        {currentTab === 'admin-whatsapp' && <AdminWhatsAppGroup />}

        {currentTab === 'admin-audit' && <AdminAuditLogs />}
      </main>

      {/* Store Footer */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Store Details */}
            <div>
              <div className="flex items-center space-x-2 text-white font-extrabold text-sm mb-2">
                <Store className="w-4 h-4 text-gold-400" />
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
                  <button onClick={() => setCurrentTab('register')} className="hover:text-white transition-colors">
                    Register as Member (50 Welcome Points)
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentTab('member-login')} className="hover:text-gold-400 font-bold transition-colors">
                    Member Sign In / ಲಾಗಿನ್
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentTab('preferences')} className="hover:text-white transition-colors">
                    Communication Preferences & Opt-Out
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentTab('privacy')} className="hover:text-white transition-colors">
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
                  <span>+91 94481 23456</span>
                </p>
                <p className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>support@kaverielectronics.in</span>
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
