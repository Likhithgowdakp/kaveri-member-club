import React from 'react';
import { ShieldCheck, MapPin, Mail } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <div className="text-center">
        <span className="text-xs uppercase font-extrabold tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          DPDP ACT 2023 COMPLIANCE
        </span>
        <h1 className="text-3xl font-extrabold text-brand-950 mt-3">
          Membership Privacy & Data Protection Notice
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Kaveri Electronic Halaguru • Version 1.0 (Commencement: 2026)
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-700" />
            <span>1. Identity of the Data Fiduciary</span>
          </h2>
          <p>
            <strong>Kaveri Electronic Halaguru</strong> operates as the Data Fiduciary under the provisions of the Digital Personal Data Protection (DPDP) Act, 2023.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span>HMS Complex, Kanakapura Main Road, Halaguru Hobli, Karnataka - 571421</span>
            </p>
            <p className="flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-brand-700" />
              <span>Grievance Officer: mathrushreemep@gmail.com | Phone: +91 72041 62882</span>
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            2. Personal Data Processed & Business Need
          </h2>
          <p>
            We process minimal personal data voluntarily provided during registration:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Full Name:</strong> To personalize your membership card, loyalty profile, and store billing records.</li>
            <li><strong>Primary Mobile Number:</strong> Serving as your unique account identifier and for warranty verification.</li>
            <li><strong>Alternative Mobile / Email (Optional):</strong> For secondary backup communication if you choose to provide it.</li>
            <li><strong>Address (Optional):</strong> For verifying appliance delivery feasibility within Halaguru and neighboring areas.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            3. Strict Unbundling of Promotional Consent
          </h2>
          <p>
            In compliance with Indian law, promotional communication consent for WhatsApp and SMS is <strong>never bundled</strong> into membership registration.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Marketing checkboxes are unchecked by default.</li>
            <li>Customers may join the club, earn loyalty points, and receive warranty service without agreeing to promotional messages.</li>
            <li>Re-registration does NOT reactivate previously withdrawn consent.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            4. Customer Rights (Access, Correction & Erasure)
          </h2>
          <p>
            Every registered member has the statutory right to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Immediate Opt-Out:</strong> Withdraw consent anytime through the online Customer Preference Portal. Opt-outs immediately stop scheduled promotional dispatches.</li>
            <li><strong>Correction:</strong> Update obsolete phone numbers, misspelled names, or addresses.</li>
            <li><strong>Account Closure & Erasure:</strong> Close membership and cease all data processing, subject only to mandatory legal invoice retention requirements under Indian tax regulations.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            5. Security Safeguards & Provider Policies
          </h2>
          <p>
            Customer records are stored in access-controlled PostgreSQL database storage, protected by server-side Argon2id password hashing and encrypted sessions. We do not sell or trade customer lists to any third parties. Outbound messaging is routed strictly through official Meta WhatsApp Business Cloud API or TRAI DLT-registered SMS gateways.
          </p>
        </section>
      </div>
    </div>
  );
};
