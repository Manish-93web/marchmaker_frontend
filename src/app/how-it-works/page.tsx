import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Heart, Lock, UserCheck, MessageCircle } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4">
        <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
          Guided Human Matchmaking
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900">
          How Marchmaker Works
        </h1>
        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto">
          Unlike casual dating apps with endless swiping, Marchmaker is a structured, privacy-first journey crafted specifically for marriage.
        </p>
      </div>

      <div className="space-y-12">
        {/* Step 1 */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-8 items-start">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-serif font-bold text-xl shrink-0">
            01
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              1. Guided Profile Creation & Autosave
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Begin by sharing your personal background, education, career, lifestyle preferences, and family values. Our multi-step onboarding wizard autosaves your draft continuously so you never lose progress. You decide which photos are shared publicly or kept confidential.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-8 items-start">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-serif font-bold text-xl shrink-0">
            02
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              2. Aadhaar & Government ID Verification
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Trust begins with verified identities. Members submit government-issued identification (Aadhaar, Passport, or Voter ID) alongside a live selfie. Identification numbers are cryptographically masked, documents are stored in private encrypted storage, and verified exclusively by authorized review staff.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-8 items-start">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-serif font-bold text-xl shrink-0">
            03
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              3. Compatibility Assessment & Human Review Queue
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Our 6-dimension compatibility questionnaire assesses core relationship values: communication expectations, financial philosophy, living arrangements, and career-family balance. When an eligible candidate is identified, they are submitted to our Human Review Queue where matchmaking directors evaluate qualitative fit before offering the introduction.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-8 items-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-serif font-bold text-xl shrink-0">
            04
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              4. Match Reveal, Accept/Decline & First Note
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              When an introduction is approved, both members receive an introduction card with compatibility highlights. For a transparent unlock fee of ₹499 (GST inclusive), members can view verified contact details, unblurred photos, and exchange courteous introductory notes. Both members can accept or decline with complete dignity.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pt-8">
        <Link
          href="/register"
          className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl font-semibold text-sm text-white bg-rose-700 hover:bg-rose-800 shadow-md transition-all"
        >
          <span>Begin Your Membership</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
