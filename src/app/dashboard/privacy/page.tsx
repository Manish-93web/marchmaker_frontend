"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Trash2, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, FileCode } from "lucide-react";
import { api } from "@/lib/api";

export default function PrivacyDashboardPage() {
  const [downloading, setDownloading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setDownloading(true);
    try {
      const res = await api.privacy.exportData();
      if (res.success && res.data) {
        // Trigger browser JSON download
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Marchmaker_Data_Export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert("Failed to export data");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.privacy.requestDeletion(deleteReason);
      if (res.success) {
        setIsDeleteModalOpen(false);
        setDeleteSuccess(true);
      }
    } catch (err) {
      alert("Failed to record deletion request");
    } finally {
      setLoading(false);
    }
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
          Privacy Rights & Data Governance (DPDP Act 2023)
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          You retain full sovereignty over your personal data, identity proofs, and relationship assessment records.
        </p>
      </div>

      {deleteSuccess && (
        <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-xs flex items-center space-x-2 border border-amber-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            Deletion request confirmed. In accordance with the DPDP Act 2023, your profile has been deactivated and will be permanently purged after the 30-day grace period.
          </span>
        </div>
      )}

      {/* Grid of rights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Data */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-base font-serif font-bold text-stone-900">
              Download Your Data Archive
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Export an official sanitized JSON archive of all records linked to your account: user profile, preferences, assessment answers, introduction history, and billing records.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={downloading}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <FileCode className="w-4 h-4" />
            <span>{downloading ? "Preparing JSON Archive..." : "Download JSON Data Export"}</span>
          </button>
        </div>

        {/* Account Deletion */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-serif font-bold text-stone-900 text-red-700">
              Request Permanent Erasure
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Exercise your Right to Erasure under the DPDP Act 2023. Irreversibly purges your identity proofs, assessment vectors, and photos after an administrative 30-day grace window.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Request Account Deletion</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleDeleteRequest} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-red-600">Confirm Deletion Request</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure? Once submitted, your profile will be immediately hidden from matching queues and scheduled for permanent purge after 30 days.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Reason for Leaving (Optional)</label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Found partner on Marchmaker, taking a personal break..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Confirm Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
