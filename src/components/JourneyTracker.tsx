"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ArrowRight, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { api } from "@/lib/api";

export interface JourneyStage {
  key: string;
  label: string;
  completed: boolean;
}

export interface JourneyData {
  currentStage: string;
  nextActionTitle: string;
  nextActionLink: string;
  isPendingTeamAction: boolean;
  stages: JourneyStage[];
}

export default function JourneyTracker() {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.journey.getStatus().then((res) => {
      if (res.success && res.data) {
        setJourney(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-stone-200 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-stone-100 rounded mb-4"></div>
      </div>
    );
  }

  if (!journey) return null;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 gap-4">
        <div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Curated Journey Tracker</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            Your Path to a Meaningful Marriage
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track your progression from verification to hand-curated introductions.
          </p>
        </div>

        {/* Action button */}
        {journey.nextActionLink && (
          <Link
            href={journey.nextActionLink}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              journey.isPendingTeamAction
                ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                : "bg-rose-700 text-white hover:bg-rose-800"
            }`}
          >
            {journey.isPendingTeamAction ? (
              <>
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <span>{journey.nextActionTitle}</span>
              </>
            ) : (
              <>
                <span>{journey.nextActionTitle}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Link>
        )}
      </div>

      {/* Progress Stepper */}
      <div className="pt-6 overflow-x-auto">
        <div className="min-w-[640px] flex items-center justify-between relative">
          {/* Progress bar line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-stone-100 -z-0"></div>

          {journey.stages.map((stage, idx) => {
            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10 text-center px-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    stage.completed
                      ? "bg-rose-700 text-white shadow-md shadow-rose-200"
                      : "bg-stone-100 text-stone-400 border border-stone-200"
                  }`}
                >
                  {stage.completed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium max-w-[90px] leading-tight ${
                    stage.completed ? "text-stone-900 font-semibold" : "text-stone-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
