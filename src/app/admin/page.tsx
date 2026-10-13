"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  History,
  LifeBuoy,
  Search,
  Filter,
  Check,
  Eye,
  Send,
  Sparkles,
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";

export default function AdminConsolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "MEMBERS" | "REVIEWS" | "VERIFICATIONS" | "MODERATION" | "SUPPORT" | "FINANCE" | "AUDIT"
  >("OVERVIEW");

  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision state
  const [reviewNote, setReviewNote] = useState("");
  const [supportReply, setSupportReply] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === "OVERVIEW") {
        const res = await api.admin.getStats();
        if (res.success) setStats(res.data);
      } else if (activeTab === "MEMBERS") {
        const res = await api.admin.getMembers({ search: memberSearch });
        if (res.success) setMembers(res.data?.members || []);
      } else if (activeTab === "REVIEWS") {
        const res = await api.admin.getReviews();
        if (res.success) setReviews(res.data?.introductions || []);
      } else if (activeTab === "VERIFICATIONS") {
        const res = await api.admin.getVerifications();
        if (res.success) setVerifications(res.data?.requests || []);
      } else if (activeTab === "MODERATION") {
        const res = await api.admin.getReports();
        if (res.success) setReports(res.data?.reports || []);
      } else if (activeTab === "SUPPORT") {
        const res = await api.admin.getTickets();
        if (res.success) setSupportTickets(res.data?.tickets || []);
      } else if (activeTab === "FINANCE") {
        const res = await api.admin.getPayments();
        if (res.success) setPayments(res.data?.payments || []);
      } else if (activeTab === "AUDIT") {
        const res = await api.admin.getAuditLogs();
        if (res.success) setAuditLogs(res.data?.logs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const handleReviewDecision = async (introId: string, decision: "APPROVE" | "REJECT") => {
    try {
      await api.admin.reviewIntro(introId, decision, reviewNote || undefined);
      setReviewNote("");
      loadTabData();
      alert(`Introduction has been ${decision === "APPROVE" ? "approved and offered to both members" : "rejected"}.`);
    } catch (err: any) {
      alert("Failed to record review decision");
    }
  };

  const handleKycDecision = async (reqId: string, decision: "APPROVE" | "REJECT" | "REQUEST_INFO") => {
    const reason = decision !== "APPROVE" ? prompt("Enter reason / message for applicant:") || undefined : undefined;
    try {
      await api.admin.reviewKyc(reqId, decision, reason);
      loadTabData();
      alert(`KYC status set to ${decision}. Member notified.`);
    } catch (err: any) {
      alert("Failed to record verification decision");
    }
  };

  const handleModerationAction = async (reportId: string, action: string) => {
    const notes = prompt("Enter moderation action notes:") || undefined;
    try {
      await api.admin.actionReport(reportId, action, notes);
      loadTabData();
      alert(`Report actioned: ${action}`);
    } catch (err: any) {
      alert("Failed to action report");
    }
  };

  const handleSendSupportReply = async (ticketId: string) => {
    if (!supportReply.trim()) return;
    try {
      await api.admin.replyTicket(ticketId, supportReply.trim());
      setSupportReply("");
      loadTabData();
      alert("Reply dispatched to member.");
    } catch (err: any) {
      alert("Failed to send reply");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1.5 mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Marchmaker Internal Operations & Governance Desk</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            Administrative Console
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Enforcing strict human review of introductions, KYC verifications, moderation, and financial audits.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          View as Member
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-stone-200 pb-3 overflow-x-auto text-xs font-semibold">
        {[
          { key: "OVERVIEW", label: "KPIs & Funnel", icon: Award },
          { key: "REVIEWS", label: "Human Review Queue", icon: Sparkles },
          { key: "VERIFICATIONS", label: "KYC Documents", icon: ShieldCheck },
          { key: "MEMBERS", label: "Members Directory", icon: Users },
          { key: "MODERATION", label: "Moderation & Reports", icon: AlertTriangle },
          { key: "SUPPORT", label: "Support Tickets", icon: LifeBuoy },
          { key: "FINANCE", label: "Revenue & GST Invoices", icon: CreditCard },
          { key: "AUDIT", label: "Audit Trails", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shrink-0 transition-colors ${
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === "OVERVIEW" && stats && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Total Members</span>
              <div className="text-2xl font-serif font-bold text-stone-900 mt-1">{stats.totalMembers}</div>
              <span className="text-[11px] text-emerald-600 font-medium">100% Onboarded</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Verified Members</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">{stats.verifiedMembers}</div>
              <span className="text-[11px] text-stone-400">Government KYC Approved</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Introductions in Review</span>
              <div className="text-2xl font-serif font-bold text-amber-700 mt-1">{stats.pendingReviews}</div>
              <span className="text-[11px] text-stone-400">Awaiting director sign-off</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Platform Revenue</span>
              <div className="text-2xl font-serif font-bold text-rose-700 mt-1">₹{stats.totalRevenueINR}</div>
              <span className="text-[11px] text-stone-400">{stats.paidTransactions} introductions unlocked</span>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900">
              Matchmaking Funnel Progression
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-xs text-stone-500 block">1. Registered Profiles</span>
                <span className="text-xl font-bold text-stone-900 mt-1 block">{stats.funnel?.registered || 0}</span>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-xs text-stone-500 block">2. KYC Approved</span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block">{stats.funnel?.kycApproved || 0}</span>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-xs text-stone-500 block">3. Hand-Reviewed Pairs</span>
                <span className="text-xl font-bold text-rose-700 mt-1 block">{stats.funnel?.handReviewed || 0}</span>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-xs text-stone-500 block">4. Mutual Matches</span>
                <span className="text-xl font-bold text-amber-700 mt-1 block">{stats.funnel?.mutualAccepted || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. HUMAN REVIEW QUEUE */}
      {activeTab === "REVIEWS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">
                Introductions Pending Human Approval ({reviews.length})
              </h2>
              <p className="text-xs text-stone-500">
                Examine candidate pairs side-by-side. Approve to offer introduction, or reject with rationale.
              </p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-400">
              Review queue is clear! All candidates have been evaluated.
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((r) => (
                <div key={r._id} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <span className="text-xs font-bold text-rose-700 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>{r.compatibilityScore}% Compatibility Alignment</span>
                    </span>
                    <span className="text-xs text-stone-400">
                      Created: {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Side by side candidate review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Candidate 1 */}
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-stone-900 text-sm">
                          {r.profile1?.fullName || r.member1Id?.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          {r.profile1?.gender}
                        </span>
                      </div>
                      <p className="text-stone-600">
                        {r.profile1?.city}, {r.profile1?.state} • {r.profile1?.occupationTitle} (₹{(r.profile1?.annualIncomeINR / 100000 || 0).toFixed(1)}L/yr)
                      </p>
                      <p className="text-stone-500 italic">"{r.profile1?.bio?.slice(0, 120)}..."</p>
                    </div>

                    {/* Candidate 2 */}
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-stone-900 text-sm">
                          {r.profile2?.fullName || r.member2Id?.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          {r.profile2?.gender}
                        </span>
                      </div>
                      <p className="text-stone-600">
                        {r.profile2?.city}, {r.profile2?.state} • {r.profile2?.occupationTitle} (₹{(r.profile2?.annualIncomeINR / 100000 || 0).toFixed(1)}L/yr)
                      </p>
                      <p className="text-stone-500 italic">"{r.profile2?.bio?.slice(0, 120)}..."</p>
                    </div>
                  </div>

                  {/* Explainable Highlights */}
                  <div>
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                      Algorithm Compatibility Rationale
                    </h4>
                    <ul className="space-y-1 text-xs text-stone-700">
                      {r.explainableHighlights?.map((hl: string, i: number) => (
                        <li key={i} className="flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Reviewer notes or reason..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200"
                    />
                    <button
                      onClick={() => handleReviewDecision(r._id, "APPROVE")}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Offer Introduction</span>
                    </button>
                    <button
                      onClick={() => handleReviewDecision(r._id, "REJECT")}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                    >
                      Reject Candidate Pair
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. KYC VERIFICATION QUEUE */}
      {activeTab === "VERIFICATIONS" && (
        <div className="space-y-6">
          <h2 className="text-lg font-serif font-bold text-stone-900">
            Pending Identity Documents ({verifications.length})
          </h2>

          {verifications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-400">
              No pending KYC requests. All members verified.
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v) => (
                <div key={v._id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold text-stone-900 text-sm block">
                        {v.userId?.fullName} ({v.userId?.email})
                      </span>
                      <span className="text-stone-500">
                        Doc: {v.documentType} • Masked ID: {v.maskedDocumentNumber}
                      </span>
                    </div>
                    <span className="text-stone-400">
                      Submitted: {new Date(v.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <a
                      href={v.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-rose-700 font-semibold hover:underline flex items-center space-x-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Inspect Document Proof (PDF / Image)</span>
                    </a>
                    <a
                      href={v.selfieUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-rose-700 font-semibold hover:underline flex items-center space-x-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Inspect Live Cross-Selfie</span>
                    </a>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex gap-2">
                    <button
                      onClick={() => handleKycDecision(v._id, "APPROVE")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Approve & Grant Verified Status
                    </button>
                    <button
                      onClick={() => handleKycDecision(v._id, "REQUEST_INFO")}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-semibold"
                    >
                      Request Better Photos
                    </button>
                    <button
                      onClick={() => handleKycDecision(v._id, "REJECT")}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                    >
                      Reject Proof
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. MEMBERS DIRECTORY */}
      {activeTab === "MEMBERS" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTabData()}
              className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200"
            />
            <button
              onClick={loadTabData}
              className="px-4 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-xl"
            >
              Search
            </button>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {members.map((m) => (
              <div key={m._id} className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-900">{m.fullName}</h4>
                  <p className="text-stone-400">{m.email} • Phone: {m.phone || "N/A"}</p>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    {m.profile?.city || "City Not Set"} • Completeness: {m.profile?.completionPercentage || 20}%
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      m.isSuspended
                        ? "bg-red-100 text-red-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {m.isSuspended ? "Suspended" : "Active Member"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. MODERATION & REPORTS */}
      {activeTab === "MODERATION" && (
        <div className="space-y-6">
          <h2 className="text-lg font-serif font-bold text-stone-900">
            Pending Moderation Reports ({reports.length})
          </h2>

          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-400">
              No reports pending moderation. Community standards intact.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => (
                <div key={rep._id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-red-600">Reason: {rep.reason}</span>
                    <span className="text-stone-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-stone-800 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    "{rep.details}"
                  </p>
                  <div className="text-[11px] text-stone-500">
                    Reporter: {rep.reporterId?.fullName} • Reported User: {rep.reportedUserId?.fullName}
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleModerationAction(rep._id, "WARNING_ISSUED")}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold"
                    >
                      Issue Formal Warning
                    </button>
                    <button
                      onClick={() => handleModerationAction(rep._id, "PROFILE_SUSPENDED")}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Suspend Profile
                    </button>
                    <button
                      onClick={() => handleModerationAction(rep._id, "NO_ACTION")}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
                    >
                      Dismiss Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. SUPPORT TICKETS */}
      {activeTab === "SUPPORT" && (
        <div className="space-y-6">
          <h2 className="text-lg font-serif font-bold text-stone-900">
            Support Desk Queue ({supportTickets.length})
          </h2>

          <div className="space-y-4">
            {supportTickets.map((tick) => (
              <div key={tick._id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-stone-400 block">#{tick.ticketNumber} • {tick.category}</span>
                    <h3 className="font-bold text-stone-900 text-sm mt-0.5">{tick.subject}</h3>
                    <p className="text-stone-500 mt-0.5">Applicant: {tick.userId?.fullName} ({tick.userId?.email})</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {tick.status}
                  </span>
                </div>

                <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-100 max-h-40 overflow-y-auto">
                  {tick.messages?.map((m: any, idx: number) => (
                    <div key={idx} className="text-stone-800">
                      <span className="font-bold text-[10px] text-stone-500">{m.senderRole}:</span> {m.message}
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Staff reply message to member..."
                    value={selectedTicketId === tick._id ? supportReply : ""}
                    onChange={(e) => {
                      setSelectedTicketId(tick._id);
                      setSupportReply(e.target.value);
                    }}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200"
                  />
                  <button
                    onClick={() => handleSendSupportReply(tick._id)}
                    className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold"
                  >
                    Reply
                  </button>
                  <button
                    onClick={async () => {
                      await api.admin.updateTicketStatus(tick._id, "RESOLVED");
                      loadTabData();
                    }}
                    className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. FINANCE & GST INVOICES */}
      {activeTab === "FINANCE" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-stone-900">
              Razorpay Transactions & GST Tax Invoices
            </h2>
            <span className="text-xs font-semibold text-stone-500">SAC Code: 998399</span>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {payments.map((p) => (
              <div key={p._id} className="py-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-stone-400 block text-[11px]">
                    Order: {p.razorpayOrderId} • PayID: {p.razorpayPaymentId || "Pending"}
                  </span>
                  <p className="font-bold text-stone-900 mt-0.5">
                    User: {p.userId?.fullName} ({p.userId?.email})
                  </p>
                  <span className="text-[10px] text-stone-400">
                    Date: {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-serif font-bold text-emerald-700 block">
                    ₹{p.amountINR}.00
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Status: {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. AUDIT LOGS */}
      {activeTab === "AUDIT" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
            <History className="w-4 h-4 text-rose-700" />
            <span>Immutable Administrative Audit Trail</span>
          </h2>
          <div className="divide-y divide-stone-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log._id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800">{log.action}</span>
                  <span className="text-stone-400 block text-[11px]">
                    Target: {log.targetCollection} ({log.targetId}) • By {log.actorId?.fullName || "Staff"} ({log.actorRole})
                  </span>
                </div>
                <span className="text-[10px] text-stone-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
