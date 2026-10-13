"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Compass, CheckCircle2, ArrowLeft, Save, Sliders, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function PartnerPreferencesPage() {
  const [preferences, setPreferences] = useState({
    ageMin: 23,
    ageMax: 32,
    heightCmMin: 155,
    heightCmMax: 185,
    maritalStatuses: ["NEVER_MARRIED"],
    religions: ["Hindu"],
    motherTongues: ["Hindi"],
    locations: ["Delhi", "Gurugram", "Noida", "Mumbai", "Bengaluru"],
    willingToRelocate: "OPEN_TO_DISCUSS",
    marriageTimelineMonths: 12,
    hardConstraints: {
      age: true,
      height: false,
      maritalStatus: true,
      religion: true,
      motherTongue: false,
      location: false,
      diet: false,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.preferences.getMe().then((res) => {
      if (res.success && res.data) {
        setPreferences((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.preferences.update(preferences);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Compass className="w-8 h-8 text-rose-700 animate-spin" />
      </div>
    );
  }

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
          Partner Expectations & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Hard constraints act as mandatory eligibility barriers. Flexible preferences guide matchmaking ranking scores.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8">
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Partner criteria updated. Your match pipeline has been refreshed.</span>
          </div>
        )}

        {/* Age & Height */}
        <div className="space-y-4">
          <h2 className="text-sm font-serif font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-rose-700" />
            <span>Age & Physical Stature</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Minimum Age</label>
              <input
                type="number"
                value={preferences.ageMin}
                onChange={(e) => setPreferences({ ...preferences, ageMin: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Maximum Age</label>
              <input
                type="number"
                value={preferences.ageMax}
                onChange={(e) => setPreferences({ ...preferences, ageMax: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Min Height (cm)</label>
              <input
                type="number"
                value={preferences.heightCmMin}
                onChange={(e) => setPreferences({ ...preferences, heightCmMin: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Max Height (cm)</label>
              <input
                type="number"
                value={preferences.heightCmMax}
                onChange={(e) => setPreferences({ ...preferences, heightCmMax: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
          </div>
        </div>

        {/* Culture, Language & Religion */}
        <div className="space-y-4">
          <h2 className="text-sm font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            Cultural & Marital Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Preferred Religions</label>
              <input
                type="text"
                value={preferences.religions.join(", ")}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    religions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Hindu, Sikh, Jain..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">Comma separated list</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Preferred Mother Tongues</label>
              <input
                type="text"
                value={preferences.motherTongues.join(", ")}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    motherTongues: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Hindi, Punjabi, Bengali, Marathi..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
          </div>
        </div>

        {/* Location & Relocation */}
        <div className="space-y-4">
          <h2 className="text-sm font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            Location & Timeline
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Preferred Cities / Regions</label>
              <input
                type="text"
                value={preferences.locations.join(", ")}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Delhi NCR, Mumbai, Bengaluru..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Open to Relocation</label>
              <select
                value={preferences.willingToRelocate}
                onChange={(e: any) => setPreferences({ ...preferences, willingToRelocate: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              >
                <option value="YES">Yes, open to relocation</option>
                <option value="OPEN_TO_DISCUSS">Open to discuss mutually</option>
                <option value="NO">No, prefer current city</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hard Constraints Checklist */}
        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-3">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-700" />
            <span>Strict Eligibility Filters (Hard Constraints)</span>
          </h3>
          <p className="text-xs text-stone-500">
            Select which criteria must strictly exclude candidates if not met:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preferences.hardConstraints.age}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    hardConstraints: { ...preferences.hardConstraints, age: e.target.checked },
                  })
                }
                className="rounded text-rose-700"
              />
              <span>Strict Age Range</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preferences.hardConstraints.religion}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    hardConstraints: { ...preferences.hardConstraints, religion: e.target.checked },
                  })
                }
                className="rounded text-rose-700"
              />
              <span>Strict Religion</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={preferences.hardConstraints.maritalStatus}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    hardConstraints: { ...preferences.hardConstraints, maritalStatus: e.target.checked },
                  })
                }
                className="rounded text-rose-700"
              />
              <span>Strict Marital Status</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-md flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Criteria..." : "Save Partner Expectations"}</span>
        </button>
      </form>
    </div>
  );
}
