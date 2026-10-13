"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Camera,
  Trash2,
  Lock,
  Eye,
  ShieldCheck,
  Save,
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [autosaving, setAutosaving] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(20);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  const [formData, setFormData] = useState({
    // Step 1: Basics
    fullName: "",
    gender: "MALE",
    dateOfBirth: "1995-05-10",
    heightCm: 175,
    maritalStatus: "NEVER_MARRIED",
    motherTongue: "Hindi",
    religion: "Hindu",
    caste: "",
    manglikStatus: "NO",

    // Step 2: Education & Career
    educationLevel: "Masters",
    highestDegree: "M.Tech Computer Science",
    collegeName: "IIT Delhi",
    employedIn: "Private Sector",
    occupationTitle: "Senior Software Architect",
    annualIncomeINR: 2800000,

    // Step 3: Location & Family
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    familyType: "NUCLEAR",
    familyValues: "MODERATE",
    fathersOccupation: "Retired Government Officer",
    mothersOccupation: "Homemaker",
    siblingsCount: 1,

    // Step 4: Lifestyle & Bio
    diet: "VEGETARIAN",
    smoking: "NEVER",
    drinking: "NEVER",
    bio: "I am a thoughtful and grounded individual who balances professional ambitions with family values. Looking for a compassionate partner with mutual respect.",

    // Step 5: Photos
    photos: [] as any[],
  });

  // Load existing profile / draft
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    api.profile.getMe().then((res) => {
      if (res.success && res.data) {
        const p = res.data;
        setFormData((prev) => ({
          ...prev,
          fullName: p.fullName || prev.fullName,
          gender: p.gender || prev.gender,
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : prev.dateOfBirth,
          heightCm: p.heightCm || prev.heightCm,
          maritalStatus: p.maritalStatus || prev.maritalStatus,
          motherTongue: p.motherTongue || prev.motherTongue,
          religion: p.religion || prev.religion,
          caste: p.caste || prev.caste,
          manglikStatus: p.manglikStatus || prev.manglikStatus,
          educationLevel: p.educationLevel || prev.educationLevel,
          highestDegree: p.highestDegree || prev.highestDegree,
          collegeName: p.collegeName || prev.collegeName,
          employedIn: p.employedIn || prev.employedIn,
          occupationTitle: p.occupationTitle || prev.occupationTitle,
          annualIncomeINR: p.annualIncomeINR || prev.annualIncomeINR,
          city: p.city || prev.city,
          state: p.state || prev.state,
          country: p.country || prev.country,
          familyType: p.familyType || prev.familyType,
          familyValues: p.familyValues || prev.familyValues,
          fathersOccupation: p.fathersOccupation || prev.fathersOccupation,
          mothersOccupation: p.mothersOccupation || prev.mothersOccupation,
          siblingsCount: p.siblingsCount ?? prev.siblingsCount,
          diet: p.diet || prev.diet,
          smoking: p.smoking || prev.smoking,
          drinking: p.drinking || prev.drinking,
          bio: p.bio || prev.bio,
          photos: p.photos || [],
        }));
        setCompletionPercentage(p.completionPercentage || 30);
        // Resume from last step
        if (p.stepCompleted && p.stepCompleted > 1 && p.stepCompleted <= 5) {
          setStep(p.stepCompleted);
        }
      }
      setLoading(false);
    });
  }, [router]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Trigger debounced autosave
      triggerAutosave(next);
      return next;
    });
  };

  const triggerAutosave = async (dataToSave = formData) => {
    setAutosaving(true);
    try {
      const res = await api.profile.saveDraft(step, dataToSave);
      if (res.success && res.data) {
        setCompletionPercentage(res.data.completionPercentage);
      }
    } finally {
      setTimeout(() => setAutosaving(false), 500);
    }
  };

  const handleNext = async () => {
    await triggerAutosave();
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Final submission
      setLoading(true);
      try {
        await api.profile.submitProfile();
        router.push("/dashboard");
      } catch (err: any) {
        alert(err.message || "Failed to submit profile");
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    try {
      const res = await api.profile.addPhoto({
        url: newPhotoUrl.trim(),
        isPrivate: false,
        isPrimary: formData.photos.length === 0,
      });
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, photos: res.data.photos }));
        setNewPhotoUrl("");
      }
    } catch (err: any) {
      alert("Failed to upload photo");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await api.profile.deletePhoto(photoId);
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, photos: res.data.photos }));
      }
    } catch (err: any) {
      alert("Failed to remove photo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Heart className="w-8 h-8 text-rose-700 animate-pulse mx-auto fill-rose-600" />
          <p className="text-xs text-stone-500">Loading your profile journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Top Header with Progress */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-1">
              Step {step} of 5 • Guided Profile Setup
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              {step === 1 && "Basic Background & Identity"}
              {step === 2 && "Education & Professional Credentials"}
              {step === 3 && "Location & Family Background"}
              {step === 4 && "Lifestyle, Habits & Personal Bio"}
              {step === 5 && "Photographs & Privacy Settings"}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {autosaving ? (
              <span className="text-[11px] text-stone-400 flex items-center space-x-1 animate-pulse">
                <Save className="w-3.5 h-3.5" />
                <span>Autosaving...</span>
              </span>
            ) : (
              <span className="text-[11px] text-emerald-700 flex items-center space-x-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {completionPercentage}% Complete
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-800 to-rose-600 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-6">
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Height (in cm)</label>
                <input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => handleChange("heightCm", parseInt(e.target.value, 10))}
                  placeholder="175"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => handleChange("maritalStatus", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="NEVER_MARRIED">Never Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="AWAITING_DIVORCE">Awaiting Divorce</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Religion</label>
                <input
                  type="text"
                  value={formData.religion}
                  onChange={(e) => handleChange("religion", e.target.value)}
                  placeholder="e.g. Hindu, Sikh, Jain, Muslim, Christian"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Mother Tongue</label>
                <input
                  type="text"
                  value={formData.motherTongue}
                  onChange={(e) => handleChange("motherTongue", e.target.value)}
                  placeholder="e.g. Hindi, Punjabi, Bengali, Marathi, Tamil"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Caste / Subcaste (Optional)</label>
                <input
                  type="text"
                  value={formData.caste}
                  onChange={(e) => handleChange("caste", e.target.value)}
                  placeholder="e.g. Brahmin, Khatri, Agarwal"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Manglik Status</label>
                <select
                  value={formData.manglikStatus}
                  onChange={(e) => handleChange("manglikStatus", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="NO">Non-Manglik</option>
                  <option value="YES">Manglik</option>
                  <option value="DON_T_KNOW">Don't Know / Doesn't Matter</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EDUCATION & CAREER */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Highest Education Level</label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) => handleChange("educationLevel", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="Bachelors">Bachelors (B.Tech, BA, B.Sc, B.Com)</option>
                  <option value="Masters">Masters (MBA, M.Tech, MS, MA)</option>
                  <option value="Doctorate">Doctorate (PhD / DM)</option>
                  <option value="Chartered">Professional (CA, CS, ICWA, CFA)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Highest Degree / Specialization</label>
                <input
                  type="text"
                  value={formData.highestDegree}
                  onChange={(e) => handleChange("highestDegree", e.target.value)}
                  placeholder="e.g. MBA Finance / M.Tech AI"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">College / University</label>
                <input
                  type="text"
                  value={formData.collegeName}
                  onChange={(e) => handleChange("collegeName", e.target.value)}
                  placeholder="e.g. IIT, IIM, Delhi University"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Employed In</label>
                <select
                  value={formData.employedIn}
                  onChange={(e) => handleChange("employedIn", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="Private Sector">Private Sector / MNC</option>
                  <option value="Government">Government / Public Sector</option>
                  <option value="Business/Self-Employed">Business / Entrepreneur</option>
                  <option value="Civil Services">Civil Services / Defense</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Occupation Title</label>
                <input
                  type="text"
                  value={formData.occupationTitle}
                  onChange={(e) => handleChange("occupationTitle", e.target.value)}
                  placeholder="e.g. Senior Software Architect / VP Finance"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Annual Income (INR / year)</label>
                <input
                  type="number"
                  value={formData.annualIncomeINR}
                  onChange={(e) => handleChange("annualIncomeINR", parseInt(e.target.value, 10))}
                  placeholder="2500000"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Approx. ₹{(formData.annualIncomeINR / 100000).toFixed(1)} Lakhs per annum
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & FAMILY */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Current City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="New Delhi, Mumbai, Bengaluru..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="Delhi, Maharashtra, Karnataka..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Family Type</label>
                <select
                  value={formData.familyType}
                  onChange={(e) => handleChange("familyType", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="NUCLEAR">Nuclear Family</option>
                  <option value="JOINT">Joint Family</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Family Values</label>
                <select
                  value={formData.familyValues}
                  onChange={(e) => handleChange("familyValues", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="MODERATE">Moderate / Balanced</option>
                  <option value="TRADITIONAL">Traditional</option>
                  <option value="LIBERAL">Liberal</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Father's Profession</label>
                <input
                  type="text"
                  value={formData.fathersOccupation}
                  onChange={(e) => handleChange("fathersOccupation", e.target.value)}
                  placeholder="e.g. Senior Business Owner / Retired Officer"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Mother's Profession</label>
                <input
                  type="text"
                  value={formData.mothersOccupation}
                  onChange={(e) => handleChange("mothersOccupation", e.target.value)}
                  placeholder="e.g. Homemaker / Educationist"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: LIFESTYLE & BIO */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Dietary Habits</label>
                <select
                  value={formData.diet}
                  onChange={(e) => handleChange("diet", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="VEGETARIAN">Vegetarian</option>
                  <option value="EGGETARIAN">Eggetarian</option>
                  <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                  <option value="VEGAN">Vegan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Smoking</label>
                <select
                  value={formData.smoking}
                  onChange={(e) => handleChange("smoking", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="NEVER">Never</option>
                  <option value="OCCASIONALLY">Occasionally</option>
                  <option value="REGULARLY">Regularly</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Drinking</label>
                <select
                  value={formData.drinking}
                  onChange={(e) => handleChange("drinking", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <option value="NEVER">Never</option>
                  <option value="OCCASIONALLY">Occasionally / Socially</option>
                  <option value="REGULARLY">Regularly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Personal Bio & Partner Expectations
              </label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="Share a thoughtful introduction about your personality, passions, and what you cherish in a long-term marriage partner..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>
          </div>
        )}

        {/* STEP 5: PHOTOS */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Privacy Guaranteed</span>
                <span>Your photos will never be visible on public internet searches. Only verified members in an approved introduction can view unblurred photographs.</span>
              </div>
            </div>

            {/* Photos List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.photos?.map((photo: any, idx: number) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden aspect-square border border-stone-200 group">
                  <img src={photo.url} alt="Profile" className="w-full h-full object-cover" />
                  {photo.isPrimary && (
                    <span className="absolute top-2 left-2 bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo._id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Photo Form */}
            <form onSubmit={handleAddPhoto} className="flex gap-2">
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="Enter image URL (e.g. Unsplash or Cloudflare URL)..."
                className="flex-1 text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
              />
              <button
                type="submit"
                disabled={!newPhotoUrl.trim()}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-white bg-stone-900 hover:bg-black transition-colors disabled:opacity-50"
              >
                Add Photo
              </button>
            </form>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 shadow-md transition-all flex items-center space-x-1.5"
          >
            <span>{step === 5 ? "Submit Profile & Continue" : "Save & Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
