"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  ShieldCheck,
  Award,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Users,
  Compass,
  Star,
  Check,
  FileCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold shadow-xs mb-8">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>Guaranteed Human-Reviewed Introductions • Zero Endless Swipes</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-stone-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Matrimony Designed for People{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-800 via-rose-700 to-amber-700">
              Serious About Marriage.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Every profile is Aadhaar & government ID verified. Every introduction is hand-picked by experienced matchmaking directors. Your photographs remain strictly private until an approved introduction.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-rose-800 via-rose-700 to-rose-600 hover:from-rose-900 hover:to-rose-800 shadow-xl shadow-rose-900/20 transition-all flex items-center justify-center space-x-2.5 group"
            >
              <span>Begin Your Guided Profile</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/how-it-works"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-sm sm:text-base text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>Explore The Process</span>
            </Link>
          </div>

          {/* Trust Highlights Strip */}
          <div className="mt-16 pt-8 border-t border-stone-200/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-stone-700">100% ID Verified</span>
            </div>
            <div className="flex items-center space-x-3">
              <Award className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="text-xs font-semibold text-stone-700">Director Reviewed</span>
            </div>
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-stone-700">Private Photos Vault</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-stone-700">DPDP Act Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy / The Contrast Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">
              The Marchmaker Promise
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white leading-snug">
              Why Casual Dating Apps Fail at Marriage — And How We Changed It.
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Swiping creates superficial paradoxes of choice, ghosting, unverified intentions, and privacy exposure. Marchmaker operates like a premier confidential bespoke matchmaking firm — combining modern compatibility psychology with trusted human curation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-stone-800">
            <div className="bg-stone-800/60 p-6 rounded-2xl border border-stone-700">
              <div className="w-10 h-10 rounded-xl bg-rose-900/60 text-rose-400 flex items-center justify-center font-bold mb-4">
                01
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Intentional Exclusivity</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Only verified members serious about marriage within 6 to 24 months enter our matchmaking pool.
              </p>
            </div>

            <div className="bg-stone-800/60 p-6 rounded-2xl border border-stone-700">
              <div className="w-10 h-10 rounded-xl bg-amber-900/60 text-amber-400 flex items-center justify-center font-bold mb-4">
                02
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Human Review Queue</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                No automated matches are offered blindly. Every introduction is evaluated by a matchmaking lead for lifestyle and family harmony.
              </p>
            </div>

            <div className="bg-stone-800/60 p-6 rounded-2xl border border-stone-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/60 text-emerald-400 flex items-center justify-center font-bold mb-4">
                03
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Total Photo Privacy</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Your photograph is never indexed by search engines or displayed to strangers. Unblurred access is granted solely to approved introductions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Process Walkthrough */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
            Clear, Dignified & Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
            How Marchmaker Works
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            A structured journey designed to protect your privacy and ensure mutual seriousness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-serif font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Guided Profile & Values</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Complete a comprehensive profile with autosave: lifestyle, career aspirations, family values, and relationship expectations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-serif font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Government ID Verification</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Upload Aadhaar, Passport, or Voter ID plus a live selfie. Masked storage ensures full compliance with Indian privacy laws.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-serif font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Human-Curated Introductions</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Our matchmaking desk pairs you with eligible profiles matching your hard constraints and relationship goals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-serif font-bold text-lg mb-4">
              4
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1.5">Mutual Connection & Notes</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Review explainable compatibility, unlock full details for a nominal fee, and exchange direct introductory notes with dignity.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-rose-50/50 rounded-3xl border border-rose-100 p-8 sm:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
                Fair & Transparent Model
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
                Pay Only When You Discover a Genuine Match.
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Traditional platforms trap you in recurring ₹10,000+ subscription charges regardless of whether they deliver quality matches. At Marchmaker, registration, profile assessment, and receiving hand-reviewed recommendations are 100% free.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-stone-700">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free Profile Creation & Autosave Onboarding</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free Government ID Verification Review</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free Compatibility Assessment & Highlights</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instant GST Tax Invoices delivered per transaction</span>
                </li>
              </ul>
            </div>

            {/* Pricing Card */}
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-lg text-center space-y-6">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                Per-Introduction Unlock
              </span>
              <div>
                <span className="text-4xl sm:text-5xl font-serif font-bold text-stone-900">₹499</span>
                <span className="text-xs text-stone-500 block mt-1 font-medium">
                  Inclusive of 18% GST (Base: ₹422.88 + CGST/SGST: ₹76.12)
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Unlock full candidate profile, unblurred private photos, verified contact information, and direct introductory messaging.
              </p>
              <Link
                href="/register"
                className="w-full block py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 shadow-md transition-all"
              >
                Create Your Profile Today
              </Link>
              <p className="text-[11px] text-stone-400">
                Supported via UPI (GPay, PhonePe, Paytm), Net Banking & Cards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
          Ready to Meet Someone with the Same Intentions?
        </h2>
        <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto">
          Join thousands of verified members across Delhi NCR, Mumbai, Bengaluru, Pune, and NRI communities who chose respect, privacy, and true compatibility.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl font-semibold text-sm text-white bg-rose-700 hover:bg-rose-800 shadow-lg shadow-rose-900/20 transition-all"
        >
          <span>Register Your Verified Profile</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
