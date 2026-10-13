"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";

interface ReviewerStat {
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  totalReviewed: number;
  approved: number;
  rejected: number;
  approvalRate: number;
}

interface QueueSummary {
  pendingReview: number;
  escalated: number;
  approvedToday: number;
  rejectedToday: number;
}

interface ReviewerStatsData {
  queueSummary: QueueSummary;
  reviewerWorkload: ReviewerStat[];
}

interface FeedbackAnalytics {
  totalFeedback: number;
  averageRelevanceRating: number;
  expectationsMetBreakdown: { YES: number; PARTIALLY: number; NO: number };
  ratingDistribution: { rating: number; count: number }[];
  lowRatedIntroductions: Array<{
    introductionId: string;
    averageRating: number;
    feedbackCount: number;
    expectationsMet: string;
  }>;
  matchQualityTrend: Array<{ month: string; avgRating: number; total: number }>;
}

export default function ReviewerOpsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReviewerStatsData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workload" | "quality">("workload");

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !["SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      router.push("/login");
      return;
    }
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, feedbackRes] = await Promise.all([
        api.admin.getReviewerStats(),
        api.admin.getFeedbackAnalytics(90),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (feedbackRes.success) setFeedback(feedbackRes.data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-600 border-t-rose-500" />
      </div>
    );
  }

  const qs = stats?.queueSummary;
  const qualityColor = (avg: number) => avg >= 4 ? "text-emerald-400" : avg >= 3 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Reviewer Operations</h1>
          <p className="text-slate-400 mt-1">Queue status, reviewer workload, and match quality analytics.</p>
        </div>

        {/* Queue KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending Review", value: qs?.pendingReview ?? "—", color: "text-amber-400" },
            { label: "Escalated", value: qs?.escalated ?? "—", color: "text-rose-400" },
            { label: "Approved Today", value: qs?.approvedToday ?? "—", color: "text-emerald-400" },
            { label: "Rejected Today", value: qs?.rejectedToday ?? "—", color: "text-slate-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6 w-fit">
          {(["workload", "quality"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                activeTab === t ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "workload" ? "Reviewer Workload" : "Match Quality"}
            </button>
          ))}
        </div>

        {/* Workload Tab */}
        {activeTab === "workload" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-slate-200">Reviewer Workload &amp; Approval Rates</h2>
              <p className="text-slate-500 text-sm mt-0.5">All-time review activity per team member.</p>
            </div>
            {!stats?.reviewerWorkload?.length ? (
              <div className="p-12 text-center text-slate-500">No review data yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Reviewer", "Total Reviewed", "Approved", "Rejected", "Approval Rate"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.reviewerWorkload.map((r) => (
                    <tr key={r.reviewerId} className="border-b border-slate-800 hover:bg-slate-750">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-200 text-sm">{r.reviewerName}</p>
                        <p className="text-slate-500 text-xs">{r.reviewerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-semibold">{r.totalReviewed}</td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold">{r.approved}</td>
                      <td className="px-6 py-4 text-rose-400 font-semibold">{r.rejected}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${r.approvalRate}%` }}
                            />
                          </div>
                          <span className="text-slate-300 text-sm font-semibold">{r.approvalRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === "quality" && feedback && (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Avg Relevance Rating</p>
                <p className={`text-4xl font-black ${qualityColor(feedback.averageRelevanceRating)}`}>
                  {feedback.averageRelevanceRating.toFixed(1)}
                  <span className="text-slate-500 text-lg font-normal"> / 5</span>
                </p>
                <p className="text-slate-500 text-xs mt-1">From {feedback.totalFeedback} feedback responses</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Expectations Met</p>
                {(["YES", "PARTIALLY", "NO"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs w-16 text-slate-400">{k}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${k === "YES" ? "bg-emerald-500" : k === "PARTIALLY" ? "bg-amber-400" : "bg-rose-500"}`}
                        style={{
                          width: feedback.totalFeedback > 0
                            ? `${Math.round((feedback.expectationsMetBreakdown[k] / feedback.totalFeedback) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs w-6 text-right">{feedback.expectationsMetBreakdown[k]}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Rating Distribution</p>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const found = feedback.ratingDistribution.find((r) => r.rating === rating);
                  const count = found?.count || 0;
                  const pct = feedback.totalFeedback > 0 ? Math.round((count / feedback.totalFeedback) * 100) : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 text-xs w-3">{rating}★</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low-rated introductions */}
            {feedback.lowRatedIntroductions.length > 0 && (
              <div className="bg-slate-800 border border-rose-500/30 rounded-2xl p-6">
                <h3 className="font-semibold text-rose-400 mb-4">⚠ Low-Rated Introductions (avg &lt; 3★)</h3>
                <p className="text-slate-400 text-sm mb-5">
                  These introductions received consistently low feedback. Consider reviewing the matching criteria used.
                </p>
                <div className="space-y-2">
                  {feedback.lowRatedIntroductions.map((item) => (
                    <div key={item.introductionId} className="flex items-center justify-between gap-4 bg-slate-900 rounded-xl px-4 py-3">
                      <code className="text-xs text-slate-400 font-mono truncate">{item.introductionId}</code>
                      <div className="flex gap-4 text-sm shrink-0">
                        <span className="text-rose-400 font-semibold">avg {item.averageRating}★</span>
                        <span className="text-slate-500">{item.feedbackCount} responses</span>
                        <span className={`font-medium ${item.expectationsMet === "NO" ? "text-rose-400" : "text-amber-400"}`}>
                          {item.expectationsMet}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly trend */}
            {feedback.matchQualityTrend.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-200 mb-4">Match Quality Trend</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-4 text-slate-500 font-normal">Month</th>
                        <th className="text-left py-2 px-4 text-slate-500 font-normal">Avg Rating</th>
                        <th className="text-left py-2 px-4 text-slate-500 font-normal">Responses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.matchQualityTrend.map((t) => (
                        <tr key={t.month} className="border-b border-slate-700/50">
                          <td className="py-2 px-4 text-slate-300">{t.month}</td>
                          <td className={`py-2 px-4 font-semibold ${qualityColor(t.avgRating)}`}>{t.avgRating}★</td>
                          <td className="py-2 px-4 text-slate-400">{t.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
