"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  Unlock,
  Heart,
  XCircle,
  MessageCircle,
  Send,
  Star,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import PaymentModal from "./PaymentModal";
import { api } from "@/lib/api";

interface IntroductionCardProps {
  intro: any;
  onRefresh: () => void;
}

export default function IntroductionCard({ intro, onRefresh }: IntroductionCardProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [expectationsMet, setExpectationsMet] = useState<"YES" | "PARTIALLY" | "NO">("YES");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const candidate = intro.candidate;
  if (!candidate) return null;

  const handleRespond = async (decision: "ACCEPTED" | "DECLINED") => {
    setLoading(true);
    try {
      await api.introductions.respond(
        intro._id,
        decision,
        decision === "DECLINED" ? declineReason : undefined
      );
      setIsDeclineModalOpen(false);
      onRefresh();
      if (decision === "ACCEPTED") {
        setIsFeedbackOpen(true);
      }
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setLoading(true);
    try {
      await api.introductions.sendNote(intro._id, noteContent.trim());
      setNoteContent("");
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to send note");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.introductions.submitFeedback(intro._id, {
        candidateId: candidate.userId,
        relevanceRating: rating,
        expectationsMet,
        feedbackNotes,
      });
      setIsFeedbackOpen(false);
      alert("Thank you for helping us refine your future matches!");
    } catch (err: any) {
      alert(err.message || "Failed to submit feedback");
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.moderation.report({
        reportedUserId: candidate.userId,
        introductionId: intro._id,
        reason: reportReason,
        details: reportDetails,
      });
      setIsReportOpen(false);
      alert("Member reported and removed from your introductions.");
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Report failed");
    }
  };

  // Primary photo or placeholder
  const primaryPhoto = candidate.photos?.find((p: any) => p.isPrimary)?.url ||
    candidate.photos?.[0]?.url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800";

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Photo Column */}
        <div className="md:col-span-5 relative min-h-[320px] md:min-h-full bg-stone-100 overflow-hidden">
          <img
            src={primaryPhoto}
            alt={candidate.fullName}
            className={`w-full h-full object-cover object-top transition-all duration-500 ${
              !intro.isUnlockedByMe ? "filter blur-sm scale-105" : ""
            }`}
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent"></div>

          {/* Verification badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-600/90 text-white text-xs font-semibold backdrop-blur-md shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ID Verified</span>
          </div>

          {/* Locked Badge if not paid */}
          {!intro.isUnlockedByMe && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white z-20">
              <div className="w-12 h-12 rounded-full bg-stone-900/80 backdrop-blur-md flex items-center justify-center mb-3 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-serif font-bold">Private Profile Protected</h4>
              <p className="text-xs text-stone-200 mt-1 max-w-xs">
                Photos & direct contact are unlocked strictly upon approved introduction.
              </p>
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/50 transition-all flex items-center space-x-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock for ₹499 (GST Incl.)</span>
              </button>
            </div>
          )}

          {/* Bottom name and city overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10 text-white">
            <h3 className="text-xl font-serif font-bold">{candidate.fullName}</h3>
            <p className="text-xs text-stone-300 flex items-center space-x-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{candidate.city ? `${candidate.city}, ${candidate.state || "India"}` : "India"}</span>
            </p>
          </div>
        </div>

        {/* Details Column */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header: compatibility badge and status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hand-Curated Match</span>
                </span>
                <span className="text-xs text-stone-400">•</span>
                <span className="text-xs font-semibold text-rose-700">
                  {intro.compatibilityScore}% Compatibility
                </span>
              </div>

              {/* Report button */}
              <button
                onClick={() => setIsReportOpen(true)}
                className="text-stone-400 hover:text-stone-600 text-xs flex items-center space-x-1"
                title="Report Concern"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Height</span>
                <span className="font-semibold text-stone-800">{candidate.heightCm ? `${candidate.heightCm} cm` : "Not specified"}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Religion / Caste</span>
                <span className="font-semibold text-stone-800">{candidate.religion || "Hindu"}{candidate.caste ? ` (${candidate.caste})` : ""}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Mother Tongue</span>
                <span className="font-semibold text-stone-800">{candidate.motherTongue || "Hindi"}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Education</span>
                <span className="font-semibold text-stone-800">{candidate.highestDegree || candidate.educationLevel || "Masters"}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Profession</span>
                <span className="font-semibold text-stone-800">{candidate.occupationTitle || "Professional"}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Annual Income</span>
                <span className="font-semibold text-stone-800">
                  {candidate.annualIncomeINR
                    ? `₹${(candidate.annualIncomeINR / 100000).toFixed(1)} Lakh/yr`
                    : "Confidential"}
                </span>
              </div>
            </div>

            {/* Bio */}
            {candidate.bio && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">About Her / Him</h4>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                  "{candidate.bio}"
                </p>
              </div>
            )}

            {/* Explainable Compatibility Highlights */}
            {intro.explainableHighlights && intro.explainableHighlights.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Matchmaker's Compatibility Rationale
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {intro.explainableHighlights.map((hl: string, i: number) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unlocked Contact Details */}
            {intro.isUnlockedByMe && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1">
                <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Verified Contact Access</span>
                </span>
                <p className="text-emerald-800">Email: {candidate.email || "Verified"}</p>
                <p className="text-emerald-800">Phone: {candidate.phone || "Verified Contact"}</p>
              </div>
            )}

            {/* Notes Exchange thread if unlocked */}
            {intro.isUnlockedByMe && (
              <div className="pt-2 border-t border-stone-100">
                <h4 className="text-xs font-semibold text-stone-600 mb-2 flex items-center space-x-1.5">
                  <MessageCircle className="w-4 h-4 text-rose-700" />
                  <span>Introductory Notes Exchange</span>
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto mb-3">
                  {intro.notesExchange?.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No notes exchanged yet. Send a warm opening note below.</p>
                  ) : (
                    intro.notesExchange?.map((note: any, idx: number) => (
                      <div key={idx} className="bg-stone-50 p-2.5 rounded-xl text-xs text-stone-800">
                        <p>{note.content}</p>
                        <span className="text-[10px] text-stone-400 block mt-1">
                          {new Date(note.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Note form */}
                <form onSubmit={handleSendNote} className="flex space-x-2">
                  <input
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write a courteous introductory note..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
                  />
                  <button
                    type="submit"
                    disabled={loading || !noteContent.trim()}
                    className="px-3 py-2 bg-rose-700 text-white rounded-xl text-xs font-semibold hover:bg-rose-800 transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Action Footer: Accept / Decline / Unlock */}
          <div className="pt-6 mt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            {!intro.isUnlockedByMe ? (
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Full Profile (₹499)</span>
              </button>
            ) : intro.bothAccepted ? (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                <span>Both members accepted! It's a mutual connection. 🎉</span>
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="text-emerald-700 underline hover:text-emerald-900"
                >
                  Give Feedback
                </button>
              </div>
            ) : intro.myDecision === "ACCEPTED" ? (
              <div className="text-xs font-semibold text-stone-600 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>You accepted! Awaiting response from candidate.</span>
              </div>
            ) : intro.myDecision === "DECLINED" ? (
              <div className="text-xs font-semibold text-stone-400">
                You respectfully declined this introduction.
              </div>
            ) : (
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => handleRespond("ACCEPTED")}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center space-x-1.5"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Accept Introduction</span>
                </button>
                <button
                  onClick={() => setIsDeclineModalOpen(true)}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-all flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Unlock Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        introductionId={intro._id}
        candidateName={candidate.fullName}
        onSuccess={onRefresh}
      />

      {/* Decline Dialog */}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200">
            <h3 className="font-serif font-bold text-lg text-stone-900">Decline Introduction</h3>
            <p className="text-xs text-stone-500 mt-1">
              Help our matchmakers understand your preferences better. (Optional & completely private).
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Location preference mismatch, marriage timeline differences..."
              className="mt-3 w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setIsDeclineModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespond("DECLINED")}
                disabled={loading}
                className="flex-1 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-black rounded-xl"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSubmitFeedback} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center space-x-2 text-rose-700 text-xs font-semibold uppercase mb-1">
              <Star className="w-4 h-4 fill-rose-600" />
              <span>Match Quality Feedback</span>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">How accurate was this match?</h3>
            <p className="text-xs text-stone-500 mt-1">
              Your feedback is analyzed strictly by our senior matchmaking leads to calibrate future recommendations.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Rating (1 to 5 Stars)</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-lg text-xs font-bold ${
                        rating >= star ? "text-amber-500" : "text-stone-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Did this match align with your expectations?</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["YES", "PARTIALLY", "NO"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExpectationsMet(opt)}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        expectationsMet === opt ? "bg-rose-50 border-rose-700 text-rose-800" : "border-stone-200 text-stone-600"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Additional Private Notes</label>
                <textarea
                  rows={2}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Any constructive feedback for the director..."
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Skip
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl"
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleReport} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200">
            <h3 className="font-serif font-bold text-lg text-stone-900 text-red-600">Report Member</h3>
            <p className="text-xs text-stone-500 mt-1">
              Your safety is our top priority. The member will also be blocked from contacting you.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full p-2 text-xs rounded-xl border border-stone-200"
                >
                  <option value="">Select reason...</option>
                  <option value="MISREPRESENTATION">Inaccurate profile or background details</option>
                  <option value="HARASSMENT">Inappropriate communication or harassment</option>
                  <option value="COMMERCIAL">Solicitation or commercial intent</option>
                  <option value="OTHER">Other violation of community standards</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Details</label>
                <textarea
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context for moderation investigation..."
                  className="w-full p-2 text-xs rounded-xl border border-stone-200"
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
