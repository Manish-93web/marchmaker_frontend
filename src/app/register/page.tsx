"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Lock, Mail, User, Phone, ArrowRight, AlertCircle, Gift, ShieldCheck } from "lucide-react";
import { api, setAuthToken, setStoredUser } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referredByCode, setReferredByCode] = useState("");
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpdpConsent) {
      setError("Please accept the terms and privacy consent to proceed.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.register({
        fullName,
        email,
        phone,
        password,
        referredByCode: referredByCode || undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Registration failed");
      }

      setAuthToken(res.data.token);
      setStoredUser(res.data.user);

      // Record DPDP consent record
      await api.privacy.recordConsent({
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dpdpConsentAccepted: true,
        matchmakingConsentAccepted: true,
      });

      // Proceed straight to guided onboarding wizard
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 sm:p-10 border border-stone-200 shadow-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-rose-100/50 rounded-full blur-2xl -z-10 pointer-events-none"></div>

        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-800 to-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Create Member Profile</h1>
          <p className="text-xs text-stone-500">Join our exclusive, verified matrimony network.</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center space-x-2 border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Full Legal Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@example.com"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Mobile Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Referral Code <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Gift className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referredByCode}
                onChange={(e) => setReferredByCode(e.target.value.toUpperCase())}
                placeholder="e.g. PRIYA-4921"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50 uppercase"
              />
            </div>
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <input
              type="checkbox"
              id="consent"
              checked={dpdpConsent}
              onChange={(e) => setDpdpConsent(e.target.checked)}
              className="mt-0.5 rounded text-rose-700 focus:ring-rose-600"
            />
            <label htmlFor="consent" className="text-[11px] text-stone-600 leading-tight">
              I agree to the{" "}
              <Link href="/terms" className="text-rose-700 underline">
                Terms of Service
              </Link>{" "}
              and consent to processing my matrimonial preferences under the{" "}
              <Link href="/privacy" className="text-rose-700 underline">
                DPDP Act 2023
              </Link>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 shadow-md shadow-rose-900/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Creating Profile...</span>
            ) : (
              <>
                <span>Begin Guided Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-rose-700 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
