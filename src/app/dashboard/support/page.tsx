"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  PlusCircle,
  MessageCircle,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

export default function MemberSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<any>("INTRODUCTION");
  const [priority, setPriority] = useState<any>("MEDIUM");
  const [initialMessage, setInitialMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await api.support.getTickets();
      if (res.success && res.data) {
        setTickets(res.data);
        if (res.data.length > 0 && !selectedTicket) {
          setSelectedTicket(res.data[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.support.createTicket({
        subject,
        category,
        priority,
        initialMessage,
      });
      if (res.success && res.data) {
        setIsCreateOpen(false);
        setSubject("");
        setInitialMessage("");
        await loadTickets();
        setSelectedTicket(res.data);
      }
    } catch (err: any) {
      alert("Failed to create ticket");
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      const res = await api.support.replyTicket(selectedTicket._id, replyMessage.trim());
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setReplyMessage("");
        loadTickets();
      }
    } catch (err: any) {
      alert("Failed to send message");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Concierge Support Desk
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Direct assistance with verification, matching criteria, or billing inquiries.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open New Ticket</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Tickets List */}
        <div className="md:col-span-4 bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Your Tickets ({tickets.length})
          </h2>

          {tickets.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center italic">No tickets found.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {tickets.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    selectedTicket?._id === t._id
                      ? "bg-rose-50 border-rose-300 shadow-xs"
                      : "border-stone-100 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-stone-400">#{t.ticketNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        t.status === "OPEN"
                          ? "bg-amber-100 text-amber-800"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-stone-900 line-clamp-1">{t.subject}</h4>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ticket Thread */}
        <div className="md:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between min-h-[500px]">
          {selectedTicket ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-stone-400">#{selectedTicket.ticketNumber}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 rounded-full text-stone-700">
                      Category: {selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>

                {/* Messages conversation */}
                <div className="py-6 space-y-4 max-h-[350px] overflow-y-auto">
                  {selectedTicket.messages?.map((msg: any, i: number) => {
                    const isMember = msg.senderRole === "MEMBER";
                    return (
                      <div
                        key={i}
                        className={`flex flex-col ${isMember ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md p-4 rounded-2xl text-xs ${
                            isMember
                              ? "bg-rose-700 text-white rounded-br-none"
                              : "bg-stone-100 text-stone-900 rounded-bl-none border border-stone-200"
                          }`}
                        >
                          <p className="font-semibold text-[10px] opacity-75 mb-1">
                            {isMember ? "You" : "Concierge Specialist"}
                          </p>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-stone-400 mt-1">
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply box */}
              {selectedTicket.status !== "CLOSED" && (
                <form onSubmit={handleReply} className="pt-4 border-t border-stone-100 flex gap-2">
                  <input
                    type="text"
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message to support..."
                    className="flex-1 text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-stone-400 italic">
              Select a ticket from the left to view the message thread.
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Open a Support Ticket</h3>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of inquiry..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              >
                <option value="PROFILE">Profile Onboarding</option>
                <option value="VERIFICATION">Identity Verification / KYC</option>
                <option value="INTRODUCTION">Introductions & Matching</option>
                <option value="PAYMENT">Payments & GST Tax Invoices</option>
                <option value="PRIVACY">Privacy & Data Protection</option>
                <option value="OTHER">Other Assistance</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Describe Your Issue</label>
              <textarea
                rows={4}
                required
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Provide detailed information so our team can assist swiftly..."
                className="w-full text-xs p-3 rounded-xl border border-stone-200"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
