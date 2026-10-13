"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  Gift,
  LifeBuoy,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import JourneyTracker from "@/components/JourneyTracker";
import IntroductionCard from "@/components/IntroductionCard";
import { api, getStoredUser } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [introductions, setIntroductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);

    try {
      const [pRes, vRes, iRes] = await Promise.all([
        api.profile.getMe(),
        api.verification.getMe(),
        api.introductions.getAll(),
      ]);

      if (pRes.success) setProfile(pRes.data);
      if (vRes.success) setVerification(vRes.data);
      if (iRes.success) setIntroductions(iRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Heart className="w-8 h-8 text-rose-700 animate-pulse fill-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Verified Member Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Namaste, {currentUser?.fullName || "Member"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Welcome to your confidential matchmaking command centre.
          </p>
        </div>

        {/* Quick Nav Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/verification"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border ${
              verification?.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {verification?.status === "APPROVED"
                ? "ID Verified"
                : verification?.status === "PENDING"
                ? "KYC Under Review"
                : "Verify Identity"}
            </span>
          </Link>

          <Link
            href="/dashboard/assessment"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Values Questionnaire</span>
          </Link>

          <Link
            href="/dashboard/wallet"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200 flex items-center space-x-1.5"
          >
            <Gift className="w-3.5 h-3.5 text-stone-600" />
            <span>Referrals & Wallet</span>
          </Link>
        </div>
      </div>

      {/* Feature M-13: Journey Status Tracker */}
      <JourneyTracker />

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/dashboard/introductions"
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-rose-600" />
          </div>
          <h3 className="font-semibold text-sm text-stone-900">Curated Matches</h3>
          <p className="text-[11px] text-stone-500 mt-1">Review active hand-picked introductions</p>
        </Link>

        <Link
          href="/dashboard/preferences"
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-stone-900">Partner Criteria</h3>
          <p className="text-[11px] text-stone-500 mt-1">Mandatory vs flexible preferences</p>
        </Link>

        <Link
          href="/dashboard/photos"
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-stone-900">Private Photos</h3>
          <p className="text-[11px] text-stone-500 mt-1">Control blur & access permissions</p>
        </Link>

        <Link
          href="/dashboard/support"
          className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-stone-900">Concierge Desk</h3>
          <p className="text-[11px] text-stone-500 mt-1">Support tickets & inquiries</p>
        </Link>
      </div>

      {/* Active Introductions Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Active Hand-Reviewed Introductions
            </h2>
            <p className="text-xs text-stone-500">
              Profiles paired and approved by our senior matchmaking review team.
            </p>
          </div>
          <Link
            href="/dashboard/introductions"
            className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {introductions.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-base font-serif font-bold text-stone-900">
              Matching Pipeline Active
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Our directors are currently evaluating candidate profiles matching your partner preferences. You will be notified the instant a compatible match passes human review.
            </p>
            <button
              onClick={async () => {
                await api.introductions.findMatches();
                loadData();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              Trigger Compatibility Search
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {introductions.slice(0, 2).map((intro) => (
              <IntroductionCard key={intro._id} intro={intro} onRefresh={loadData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
