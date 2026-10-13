"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  FileText,
  Lock,
  ArrowLeft,
  UploadCloud,
} from "lucide-react";
import { api } from "@/lib/api";

export default function VerificationPage() {
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [documentType, setDocumentType] = useState<"AADHAAR" | "PASSPORT" | "VOTER_ID" | "DRIVING_LICENSE">("AADHAAR");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("https://storage.marchmaker.in/private/docs/aadhaar_sample.pdf");
  const [selfieUrl, setSelfieUrl] = useState("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600");
  const [error, setError] = useState<string | null>(null);

  const loadVerification = async () => {
    try {
      const res = await api.verification.getMe();
      if (res.success) {
        setVerification(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerification();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim()) {
      setError("Document number is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.verification.submit({
        documentType,
        documentNumber,
        documentUrl,
        selfieUrl,
      });
      if (!res.success) {
        throw new Error(res.message || "Submission failed");
      }
      setVerification(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to submit verification request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
          Government Identity Verification
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Every Marchmaker member undergoes mandatory background identity authentication to ensure complete safety and trust.
        </p>
      </div>

      {/* Verification Status Card */}
      {verification && (
        <div
          className={`p-6 rounded-3xl border shadow-xs ${
            verification.status === "APPROVED"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : verification.status === "PENDING"
              ? "bg-amber-50 border-amber-200 text-amber-950"
              : "bg-red-50 border-red-200 text-red-950"
          }`}
        >
          <div className="flex items-start space-x-3">
            {verification.status === "APPROVED" ? (
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
            ) : verification.status === "PENDING" ? (
              <Clock className="w-7 h-7 text-amber-600 shrink-0 animate-spin" />
            ) : (
              <AlertCircle className="w-7 h-7 text-red-600 shrink-0" />
            )}
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-base">
                {verification.status === "APPROVED" && "Identity Verified Successfully ✅"}
                {verification.status === "PENDING" && "KYC Documents Under Review"}
                {verification.status === "ACTION_REQUIRED" && "Action Required: Resubmission Requested"}
                {verification.status === "REJECTED" && "Verification Not Approved"}
              </h3>
              <p className="text-xs opacity-90 leading-relaxed">
                {verification.status === "APPROVED" &&
                  "Your verified status badge is active across all curated candidate introductions."}
                {verification.status === "PENDING" &&
                  "Our New Delhi verification desk is reviewing your documents. Turnaround is typically 12-24 hours."}
                {verification.status === "ACTION_REQUIRED" &&
                  `Reviewer notes: ${verification.actionRequiredMessage || "Please submit clearer images"}`}
                {verification.status === "REJECTED" &&
                  `Reason: ${verification.rejectionReason || "Document mismatch. Please upload authentic proofs."}`}
              </p>
              <div className="pt-2 text-[11px] opacity-75">
                <span>Document: {verification.documentType} ({verification.maskedDocumentNumber})</span>
                <span className="block mt-0.5">
                  Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Form (shown if not verified or resubmission needed) */}
      {(!verification || verification.status !== "APPROVED") && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-serif font-bold text-stone-900">
              Submit KYC Documentation
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Encrypted, masked, and never accessible by other members or external parties.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Select Government ID Type
              </label>
              <select
                value={documentType}
                onChange={(e: any) => setDocumentType(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
              >
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PASSPORT">Indian Passport</option>
                <option value="VOTER_ID">Voter ID Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Document Identification Number
              </label>
              <input
                type="text"
                required
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g. 5482 1234 9012"
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Number will be automatically masked (e.g. XXXXXXXX9012) in our records.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Document Proof (Front & Back URL)
              </label>
              <input
                type="text"
                required
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Live Selfie URL (Cross-Verification)
              </label>
              <input
                type="text"
                required
                value={selfieUrl}
                onChange={(e) => setSelfieUrl(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50/50"
              />
            </div>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs text-stone-600 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span>
              Per Indian DPDP Act 2023, verification proofs are strictly restricted to authorized reviewers and scheduled for automated deletion after account closure.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-md disabled:opacity-50"
          >
            {submitting ? "Uploading Documents..." : "Submit Verification Documents"}
          </button>
        </form>
      )}
    </div>
  );
}
