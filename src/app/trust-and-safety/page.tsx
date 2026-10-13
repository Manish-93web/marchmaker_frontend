import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Award, EyeOff, FileText, CheckCircle2 } from "lucide-react";

export default function TrustAndSafetyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4">
        <span className="text-emerald-700 font-semibold text-xs uppercase tracking-wider">
          Security & Privacy Standards
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900">
          Trust & Safety at Marchmaker
        </h1>
        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto">
          We protect your personal identity, photographs, and relationship values with uncompromising security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900">Government Identity Verification</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Every applicant must provide government identification (Aadhaar, Passport, or Voter ID) alongside an authenticated live selfie. Document numbers are masked in our database (e.g. XXXXXXXX1234), and original documents are stored in private, short-lived encrypted object storage accessible solely by vetted verification personnel.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <EyeOff className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900">The Zero-Swipe Guarantee</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Marchmaker strictly prohibits open public browsing, catalog search engines, and casual swiping. Your profile and photos will never appear in external web searches or be viewed by unverified members. Introductions are delivered exclusively to curated candidate pairs reviewed by our directors.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900">Private Photos Vault</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Members maintain granular control over their photographs. You can designate photos as private, in which case they are blurred and protected until an introduction is approved and mutually unlocked.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900">DPDP Act 2023 Compliance</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            We adhere strictly to the Digital Personal Data Protection Act 2023 of India. You possess the complete legal right to download a sanitized JSON export of all your stored data, revoke consents at any time, or request complete account deletion with automated data purge procedures.
          </p>
        </div>
      </div>
    </div>
  );
}
