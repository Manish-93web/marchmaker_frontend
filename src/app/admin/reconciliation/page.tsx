"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";

interface Discrepancy {
  type: string;
  paymentId: string;
  detail: string;
}

interface ReconciliationSummary {
  period: string;
  totalCaptured: number;
  totalRefunded: number;
  totalFailed: number;
  totalCreatedPending: number;
  grossRevenueINR: number;
  netRevenueINR: number;
  totalRefundedINR: number;
  invoicesIssued: number;
  discrepancies: Discrepancy[];
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function ReconciliationPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Refund modal
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(user.role)) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [days]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.admin.getReconciliation(days);
      if (res.success) setSummary(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefundRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!refundPaymentId || refundReason.length < 10) return;
    setRefundSaving(true);
    setRefundMsg(null);
    try {
      const amt = refundAmount ? parseFloat(refundAmount) : undefined;
      const res = await api.admin.requestRefund(refundPaymentId, refundReason, amt);
      if (res.success) {
        setRefundMsg("✓ Refund request recorded. Member has been notified.");
        setRefundPaymentId(""); setRefundReason(""); setRefundAmount("");
      } else {
        setRefundMsg("Error: " + (res.message || "Unknown error"));
      }
    } finally {
      setRefundSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Financial Reconciliation</h1>
            <p className="text-slate-400 mt-1">Payment totals, discrepancy detection, and refund management.</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  days === d ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-slate-600 border-t-rose-500" />
          </div>
        ) : summary ? (
          <>
            {/* Revenue KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Gross Revenue", value: formatINR(summary.grossRevenueINR), sub: `${summary.totalCaptured} transactions`, color: "text-emerald-400" },
                { label: "Net Revenue", value: formatINR(summary.netRevenueINR), sub: "After refunds", color: "text-emerald-300" },
                { label: "Refunded", value: formatINR(summary.totalRefundedINR), sub: `${summary.totalRefunded} transactions`, color: "text-rose-400" },
                { label: "Invoices Issued", value: summary.invoicesIssued.toString(), sub: summary.period, color: "text-slate-300" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                  <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Captured", value: summary.totalCaptured, color: "text-emerald-400" },
                { label: "Pending", value: summary.totalCreatedPending, color: "text-amber-400" },
                { label: "Failed", value: summary.totalFailed, color: "text-rose-400" },
                { label: "Refunded", value: summary.totalRefunded, color: "text-slate-400" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{s.label}</span>
                  <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Discrepancies */}
            {summary.discrepancies.length > 0 ? (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-6 mb-8">
                <h2 className="font-semibold text-rose-400 mb-4">
                  ⚠ {summary.discrepancies.length} Discrepanc{summary.discrepancies.length === 1 ? "y" : "ies"} Detected
                </h2>
                <div className="space-y-3">
                  {summary.discrepancies.map((d, i) => (
                    <div key={i} className="bg-slate-900/60 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold bg-rose-800 text-rose-200 px-2 py-0.5 rounded-full shrink-0">
                          {d.type.replace(/_/g, " ")}
                        </span>
                        <div>
                          <p className="text-slate-300 text-sm">{d.detail}</p>
                          <code className="text-xs text-slate-500 font-mono">{d.paymentId}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 mb-8 flex items-center gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <p className="text-emerald-300 text-sm font-medium">No discrepancies detected for the selected period.</p>
              </div>
            )}

            {/* Refund Request Form */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-200 mb-1">Issue a Refund Request</h2>
              <p className="text-slate-500 text-sm mb-5">
                Refund requests are logged and require Razorpay confirmation before completion. The member will be notified immediately.
              </p>
              {refundMsg && (
                <div className={`mb-4 text-sm px-4 py-3 rounded-xl ${refundMsg.startsWith("✓") ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                  {refundMsg}
                </div>
              )}
              <form onSubmit={handleRefundRequest} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Payment ID</label>
                  <input
                    id="refundPaymentId"
                    type="text"
                    value={refundPaymentId}
                    onChange={(e) => setRefundPaymentId(e.target.value)}
                    placeholder="MongoDB ObjectId of payment"
                    required
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Refund Amount INR (leave blank for full)</label>
                    <input
                      id="refundAmount"
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="499"
                      min="1"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Reason (min 10 characters)</label>
                    <input
                      id="refundReason"
                      type="text"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Customer requested refund due to..."
                      required
                      minLength={10}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={refundSaving}
                  className="bg-rose-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-rose-700 transition-colors text-sm disabled:opacity-60"
                >
                  {refundSaving ? "Processing…" : "Submit Refund Request"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-center py-16">Could not load reconciliation data.</p>
        )}
      </div>
    </main>
  );
}
