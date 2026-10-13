"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Compass, ArrowLeft, RefreshCw, Sparkles, Filter } from "lucide-react";
import IntroductionCard from "@/components/IntroductionCard";
import { api } from "@/lib/api";

export default function IntroductionsHubPage() {
  const [introductions, setIntroductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OFFERED" | "ACCEPTED" | "UNLOCKED">("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.introductions.getAll();
      if (res.success && res.data) {
        setIntroductions(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = introductions.filter((intro) => {
    if (filter === "ALL") return true;
    if (filter === "OFFERED") return intro.status === "OFFERED";
    if (filter === "ACCEPTED") return intro.status === "ACCEPTED";
    if (filter === "UNLOCKED") return intro.isUnlockedByMe;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Hand-Curated Introductions
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Carefully evaluated candidate profiles offered by our matchmaking leads.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={async () => {
              await api.introductions.findMatches();
              loadData();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search New Candidate Pair</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-stone-100 pb-3 text-xs font-semibold">
        {(["ALL", "OFFERED", "UNLOCKED", "ACCEPTED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === tab
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {tab === "ALL" && "All Introductions"}
            {tab === "OFFERED" && "Pending Decision"}
            {tab === "UNLOCKED" && "Unlocked Profiles"}
            {tab === "ACCEPTED" && "Mutual Matches"}
          </button>
        ))}
      </div>

      {/* Introductions List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Heart className="w-8 h-8 text-rose-700 animate-pulse fill-rose-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-lg mx-auto space-y-4">
          <Compass className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-base font-serif font-bold text-stone-900">No Introductions in this View</h3>
          <p className="text-xs text-stone-500">
            Try switching filter tabs or click "Search New Candidate Pair" to evaluate matching profiles.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((intro) => (
            <IntroductionCard key={intro._id} intro={intro} onRefresh={loadData} />
          ))}
        </div>
      )}
    </div>
  );
}
