"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, ArrowLeft, Copy, Check, TrendingUp, History, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.wallet.getMe(), api.wallet.getLedger()]).then(([wRes, lRes]) => {
      if (wRes.success) setWallet(wRes.data);
      if (lRes.success) setLedger(lRes.data || []);
      setLoading(false);
    });
  }, []);

  const referralLink = wallet
    ? `http://localhost:3000/register?ref=${wallet.referralCode}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
          Referrals & Wallet Ledger
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Invite trusted friends. Earn ₹250 wallet credit towards introduction unlocks when they complete verified KYC.
        </p>
      </div>

      {/* Balance & Referral Code Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-rose-900 via-rose-800 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-200">
            Available Wallet Balance
          </span>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-white">
            ₹{wallet?.balanceINR || 0}.00
          </div>
          <p className="text-[11px] text-rose-100">
            Can be applied automatically towards unlocking introductions.
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
              <Gift className="w-4 h-4 text-amber-600" />
              <span>Your Unique Referral Invitation</span>
            </span>
            <p className="text-xs text-stone-600">
              Share your link with marriage-seeking friends or family:
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
            <input
              type="text"
              readOnly
              value={referralLink || "Generating code..."}
              className="flex-1 bg-transparent text-xs font-mono text-stone-800 focus:outline-none px-2"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Double-Entry Ledger History */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
          <History className="w-4 h-4 text-rose-700" />
          <span>Double-Entry Wallet Accounting Ledger</span>
        </h2>

        {ledger.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center italic">
            No ledger transactions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {ledger.map((entry) => (
              <div key={entry._id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-stone-800">{entry.reason}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString()} • Idempotency Ref: {entry.idempotencyKey.slice(0, 16)}...
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold text-sm ${
                      entry.type === "CREDIT" ? "text-emerald-600" : "text-rose-700"
                    }`}
                  >
                    {entry.type === "CREDIT" ? "+" : "-"}₹{entry.amountINR}
                  </span>
                  <span className="block text-[10px] text-stone-400">
                    Balance: ₹{entry.balanceAfterINR}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
