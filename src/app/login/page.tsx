"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Lock, Mail, ArrowRight, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { api, setAuthToken, setStoredUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.login({ email, password });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Invalid email or password");
      }

      setAuthToken(res.data.token);
      setStoredUser(res.data.user);

      if (res.data.user.role !== "MEMBER") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 sm:p-10 border border-stone-200 shadow-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-100/50 rounded-full blur-2xl -z-10 pointer-events-none"></div>

        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-800 to-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Welcome Back</h1>
          <p className="text-xs text-stone-500">Sign in to review hand-curated introductions.</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center space-x-2 border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-stone-50/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 shadow-md shadow-rose-900/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Evaluation Credentials */}
        <div className="mt-8 pt-6 border-t border-stone-100 space-y-3">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block text-center">
            Quick 1-Click Evaluation Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickDemo("aarav.sharma@example.com", "SecurePassword123!")}
              className="p-2 text-[11px] rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-left"
            >
              <span className="font-semibold block text-rose-700">Member Demo</span>
              <span className="text-stone-400 text-[10px]">Aarav Sharma</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo("admin.match@marchmaker.in", "AdminPassword123!")}
              className="p-2 text-[11px] rounded-lg border border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100/50 text-left"
            >
              <span className="font-semibold block text-amber-800">Admin Staff</span>
              <span className="text-stone-400 text-[10px]">Chief Reviewer</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          New to Marchmaker?{" "}
          <Link href="/register" className="font-semibold text-rose-700 hover:underline">
            Register your profile
          </Link>
        </p>
      </div>
    </div>
  );
}
