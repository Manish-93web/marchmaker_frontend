"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";

type ProfileField = {
  label: string;
  key: string;
  section: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
};

const PROFILE_FIELDS: ProfileField[] = [
  { label: "Full Name", key: "fullName", section: "Basic Information", type: "text" },
  { label: "Current City", key: "city", section: "Basic Information", type: "text" },
  { label: "State", key: "state", section: "Basic Information", type: "text" },
  { label: "Country", key: "country", section: "Basic Information", type: "text" },
  { label: "Languages Spoken", key: "languages", section: "Basic Information", type: "text" },
  { label: "Education", key: "education", section: "Basic Information", type: "text" },
  { label: "Occupation", key: "occupation", section: "Basic Information", type: "text" },
  { label: "Professional Background", key: "professionalBackground", section: "Basic Information", type: "textarea" },
  { label: "Family Background", key: "familyBackground", section: "Personal Background", type: "textarea" },
  { label: "Lifestyle", key: "lifestyle", section: "Personal Background", type: "text" },
  { label: "Interests & Hobbies", key: "interests", section: "Personal Background", type: "text" },
  { label: "Dietary Preferences", key: "dietaryPreferences", section: "Personal Background", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "No Preference"] },
  { label: "Personal Introduction", key: "bio", section: "Personal Background", type: "textarea" },
  { label: "Marriage Timeline", key: "marriageTimeline", section: "Marriage Intentions", type: "select", options: ["Within 6 months", "Within 1 year", "1-2 years", "Flexible"] },
  { label: "Views on Children", key: "childrenExpectations", section: "Marriage Intentions", type: "text" },
  { label: "Relocation Preferences", key: "relocationPreferences", section: "Marriage Intentions", type: "text" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { router.push("/login"); return; }
    setUser(storedUser);
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await api.profile.getMe();
      if (res.success && res.data) {
        setProfile(res.data);
        setDraft(flattenProfile(res.data));
      }
    } catch {
      setError("Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }

  function flattenProfile(p: any): any {
    return {
      fullName: user?.fullName || "",
      city: p.location?.city || "",
      state: p.location?.state || "",
      country: p.location?.country || "",
      languages: (p.languages || []).join(", "),
      education: p.education || "",
      occupation: p.occupation || "",
      professionalBackground: p.professionalBackground || "",
      familyBackground: p.familyBackground || "",
      lifestyle: p.lifestyle || "",
      interests: (p.interests || []).join(", "),
      dietaryPreferences: p.dietaryPreferences || "",
      bio: p.bio || "",
      marriageTimeline: p.marriageTimeline || "",
      childrenExpectations: p.childrenExpectations || "",
      relocationPreferences: p.relocationPreferences || "",
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const structured = {
        step: 0,
        data: {
          location: { city: draft.city, state: draft.state, country: draft.country },
          languages: draft.languages.split(",").map((l: string) => l.trim()).filter(Boolean),
          education: draft.education,
          occupation: draft.occupation,
          professionalBackground: draft.professionalBackground,
          familyBackground: draft.familyBackground,
          lifestyle: draft.lifestyle,
          interests: draft.interests.split(",").map((l: string) => l.trim()).filter(Boolean),
          dietaryPreferences: draft.dietaryPreferences,
          bio: draft.bio,
          marriageTimeline: draft.marriageTimeline,
          childrenExpectations: draft.childrenExpectations,
          relocationPreferences: draft.relocationPreferences,
        },
      };
      const res = await api.profile.saveDraft(structured.step, structured.data);
      if (res.success) {
        setSaveSuccess(true);
        setEditMode(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        await fetchProfile();
      } else {
        setError(res.message || "Failed to save profile.");
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const sections = [...new Set(PROFILE_FIELDS.map((f) => f.section))];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-rose-200 border-t-rose-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">
              Status: <span className="font-medium text-rose-600 capitalize">{profile.status || "Draft"}</span>
            </p>
          </div>
          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={() => { setEditMode(false); setDraft(flattenProfile(profile)); setError(null); }}
                  className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-5 py-3 rounded-xl text-sm font-medium">
            ✓ Profile updated successfully.
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {sections.map((section) => (
          <div key={section} className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">
              {section}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PROFILE_FIELDS.filter((f) => f.section === section).map((field) => (
                <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {field.label}
                  </label>
                  {editMode ? (
                    field.type === "textarea" ? (
                      <textarea
                        value={draft[field.key] || ""}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={draft[field.key] || ""}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                      >
                        <option value="">Select…</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={draft[field.key] || ""}
                        onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                      />
                    )
                  ) : (
                    <p className="text-slate-800 text-sm py-2 min-h-[2.5rem]">
                      {draft[field.key] || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {profile.status === "DRAFT" && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-rose-900 mb-2">Ready to submit your profile?</h3>
            <p className="text-rose-700 text-sm mb-5">
              Once you submit, your profile will be reviewed by our team and considered for matching.
            </p>
            <button
              onClick={async () => {
                const res = await api.profile.submitProfile();
                if (res.success) fetchProfile();
                else setError(res.message || "Submission failed.");
              }}
              className="bg-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-rose-700 transition-colors"
            >
              Submit Profile for Review
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
