import React from "react";
import Link from "next/link";
import { Heart, ShieldCheck, Lock, Award, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Guarantees Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-stone-800">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">Government ID Verified</h4>
              <p className="text-xs text-stone-400 mt-1">Aadhaar, Passport & live selfie checks for every member.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Award className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">Human-Curated Introductions</h4>
              <p className="text-xs text-stone-400 mt-1">Every match is reviewed by seasoned matchmaking directors.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Lock className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">Zero Public Browsing</h4>
              <p className="text-xs text-stone-400 mt-1">Your photos and details are never exposed to public swiping.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Heart className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">DPDP Act 2023 Compliant</h4>
              <p className="text-xs text-stone-400 mt-1">Full control over personal data export and deletion rights.</p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-12 border-b border-stone-800">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xl font-serif font-bold text-white tracking-tight">Marchmaker</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Marchmaker is an exclusive guided matchmaking platform created for Indians and global NRI families who are serious about marriage. Built on genuine compatibility, verified backgrounds, and human review.
            </p>
            <div className="text-xs text-stone-400 space-y-1">
              <p className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-stone-500" />
                <span>Connaught Place, New Delhi, India 110001</span>
              </p>
              <p className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span>concierge@marchmaker.in</span>
              </p>
              <p className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-stone-500" />
                <span>+91 11 4050 9000 (Mon - Sat, 10 AM - 7 PM IST)</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link href="/how-it-works" className="hover:text-rose-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/trust-and-safety" className="hover:text-rose-400 transition-colors">
                  Trust & Safety
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-rose-400 transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-rose-400 transition-colors">
                  Concierge Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Legal & Trust</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link href="/terms" className="hover:text-rose-400 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-rose-400 transition-colors">
                  Privacy Policy (DPDP Act)
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-rose-400 transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/community-standards" className="hover:text-rose-400 transition-colors">
                  Community Standards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Member Operations</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>
                <Link href="/login" className="hover:text-rose-400 transition-colors">
                  Member Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-rose-400 transition-colors">
                  Register Profile
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-rose-400 transition-colors">
                  Member Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-400 transition-colors">
                  Reviewer & Admin Console
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and disclaimer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} Marchmaker Matchmaking Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="text-[11px] text-stone-500">
            GSTIN: 07AAACM1234F1Z8 | HSN/SAC: 998399 (Personal Matchmaking Services)
          </p>
        </div>
      </div>
    </footer>
  );
}
