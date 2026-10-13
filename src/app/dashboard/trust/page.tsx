"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api";

type TrustItemStatus = "COMPLETE" | "PENDING" | "ACTION_REQUIRED" | "NOT_STARTED";
type OverallLevel = "UNVERIFIED" | "PARTIAL" | "VERIFIED" | "TRUSTED";

interface TrustItem {
  key: string;
  label: string;
  status: TrustItemStatus;
  detail: string;
  actionLabel?: string;
  actionLink?: string;
}

interface TrustStatus {
  overallLevel: OverallLevel;
  completionPercent: number;
  items: TrustItem[];
  nextAction?: { label: string; link: string };
}

const STATUS_CONFIG: Record<TrustItemStatus, { label: string; color: string; bg: string; icon: string }> = {
  COMPLETE:        { label: "Verified",        color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "✓" },
  PENDING:         { label: "Under Review",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",    icon: "⏳" },
  ACTION_REQUIRED: { label: "Action Required", color: "text-rose-700",    bg: "bg-rose-50 border-rose-200",      icon: "!" },
  NOT_STARTED:     { label: "Not Started",     color: "text-slate-500",   bg: "bg-slate-50 border-slate-200",    icon: "○" },
};

const LEVEL_CONFIG: Record<OverallLevel, { label: string; color: string; bg: string; description: string }> = {
  UNVERIFIED: { label: "Unverified",    color: "text-slate-600",   bg: "bg-slate-100",    description: "Complete the steps below to be considered for introductions." },
  PARTIAL:    { label: "Getting There", color: "text-amber-700",   bg: "bg-amber-50",     description: "Good progress. A few more steps and you'll be eligible for matching." },
  VERIFIED:   { label: "Verified",      color: "text-emerald-700", bg: "bg-emerald-50",   description: "Your profile is eligible for introductions. Complete remaining steps for priority matching." },
  TRUSTED:    { label: "Fully Trusted", color: "text-rose-700",    bg: "bg-rose-50",      description: "Your profile is fully verified and will receive the highest quality introductions." },
};

const ITEM_ICONS: Record<string, string> = {
  email:      "✉️",
  profile:    "👤",
  kyc:        "🪪",
  photo:      "📸",
  assessment: "📝",
};

export default function TrustDashboardPage() {
  const router = useRouter();
  const [trust, setTrust] = useState<TrustStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.push("/login"); return; }
    fetchTrustStatus();
  }, []);

  async function fetchTrustStatus() {
    setLoading(true);
    try {
      const res = await api.journey.getTrustStatus();
      if (res.success && res.data) {
        setTrust(res.data);
      } else {
        setError(res.message || "Could not load trust status.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    );
  }

  if (error || !trust) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-600 text-sm mb-4">{error || "Could not load data."}</p>
          <button onClick={fetchTrustStatus} className="text-rose-600 font-semibold text-sm hover:underline">Try Again</button>
        </div>
      </div>
    );
  }

  const levelCfg = LEVEL_CONFIG[trust.overallLevel];
  const completeCount = trust.items.filter((i) => i.status === "COMPLETE").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Trust &amp; Verification</h1>
          <p className="text-slate-500 mt-1">
            Your verification status determines which introductions you are eligible to receive.
          </p>
        </div>

        {/* Overall Trust Level Card */}
        <div className={`rounded-2xl border p-6 mb-8 ${levelCfg.bg}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Overall Trust Level</p>
              <h2 className={`text-2xl font-bold ${levelCfg.color}`}>{levelCfg.label}</h2>
              <p className="text-slate-600 text-sm mt-2 max-w-lg">{levelCfg.description}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-4xl font-black ${levelCfg.color}`}>{trust.completionPercent}%</span>
              <p className="text-xs text-slate-400 mt-1">{completeCount} of {trust.items.length} steps complete</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-700"
              style={{ width: `${trust.completionPercent}%` }}
            />
          </div>

          {/* Next action CTA */}
          {trust.nextAction && (
            <div className="mt-5">
              <Link
                href={trust.nextAction.link}
                className="inline-flex items-center gap-2 bg-rose-600 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-rose-700 transition-colors"
              >
                {trust.nextAction.label}
                <span>→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Verification Steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Verification Steps</h2>

          {trust.items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const icon = ITEM_ICONS[item.key] || "📋";
            return (
              <div
                key={item.key}
                className={`rounded-2xl border p-5 flex gap-4 items-start transition-shadow hover:shadow-sm ${cfg.bg}`}
              >
                {/* Item icon */}
                <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center text-xl shrink-0 shadow-sm">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{item.label}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border ${cfg.color}`}>
                      <span>{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.detail}</p>
                  {item.actionLabel && item.actionLink && item.status !== "COMPLETE" && (
                    <div className="mt-3">
                      <Link
                        href={item.actionLink}
                        className={`inline-block text-xs font-semibold px-4 py-2 rounded-lg border transition-colors ${
                          item.status === "ACTION_REQUIRED"
                            ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {item.actionLabel} →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Status tick */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  item.status === "COMPLETE"
                    ? "bg-emerald-500 text-white"
                    : item.status === "PENDING"
                    ? "bg-amber-400 text-white"
                    : item.status === "ACTION_REQUIRED"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}>
                  {item.status === "COMPLETE" ? "✓" : item.status === "PENDING" ? "⏳" : item.status === "ACTION_REQUIRED" ? "!" : "○"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-5 flex gap-3 items-start">
          <span className="text-2xl shrink-0">🔒</span>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Your identity documents remain private</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Identity documents submitted for verification are reviewed only by our authorised verification team and are never shared with other members. Only your verification status badge is visible to matched members. Documents are deleted after verification in line with our{" "}
              <Link href="/data-rights" className="text-rose-600 hover:underline">data retention policy</Link>.
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Verification", href: "/dashboard/verification" },
            { label: "Add Photos", href: "/dashboard/photos" },
            { label: "Assessment", href: "/dashboard/assessment" },
            { label: "Data Rights", href: "/data-rights" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white border border-slate-100 rounded-xl p-3 text-center text-sm font-medium text-slate-700 hover:border-rose-200 hover:shadow-sm transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
