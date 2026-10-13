import React from "react";
import Link from "next/link";
import { Check, ShieldCheck, CreditCard, Sparkles, HelpCircle } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4">
        <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
          Transparent Matrimonial Pricing
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900">
          No Monthly Subscriptions. Pay Per Genuine Introduction.
        </h1>
        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto">
          We believe you should never pay thousands of rupees in monthly recurring charges just to hope for a match. At Marchmaker, you pay only when you discover someone you are genuinely excited to meet.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Free Membership Card */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Membership & Curation
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                Always Free
              </span>
            </div>

            <div>
              <span className="text-4xl font-serif font-bold text-stone-900">₹0</span>
              <span className="text-xs text-stone-500 block mt-1">Free to create profile & receive recommendations</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Guided multi-step profile journey with autosave</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>6-Dimension compatibility values assessment</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Aadhaar & government ID verification check</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Human review by experienced matchmaking directors</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Receive curated introduction cards with compatibility highlights</span>
              </li>
            </ul>
          </div>

          <Link
            href="/register"
            className="mt-8 block text-center py-3 px-4 rounded-xl font-semibold text-xs text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Create Free Profile
          </Link>
        </div>

        {/* Introduction Unlock Card */}
        <div className="bg-gradient-to-br from-rose-900 via-rose-800 to-amber-900 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-200">
                Match Introduction Unlock
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>On-Demand</span>
              </span>
            </div>

            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white">₹499</span>
              <span className="text-xs text-rose-200 block mt-1">
                Per approved introduction unlock (Inclusive of 18% GST)
              </span>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 text-xs space-y-1.5 backdrop-blur-md">
              <div className="flex justify-between text-rose-100">
                <span>Base Service Fee</span>
                <span>₹422.88</span>
              </div>
              <div className="flex justify-between text-rose-200 text-[11px]">
                <span>CGST (9%) + SGST (9%)</span>
                <span>₹76.12</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-white/20">
                <span>Total Amount Charged</span>
                <span>₹499.00</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-rose-100">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Full candidate name & verified background</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Unblurred private photo access</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Direct phone & verified email reveal</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Exchanging courteous introductory notes</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Instant GST Tax Invoice delivered to your email</span>
              </li>
            </ul>
          </div>

          <Link
            href="/register"
            className="mt-8 block text-center py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-stone-900 bg-white hover:bg-rose-50 shadow-md transition-all relative z-10"
          >
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
}
