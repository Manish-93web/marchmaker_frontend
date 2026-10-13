"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
          Concierge Assistance
        </span>
        <h1 className="text-4xl font-serif font-bold text-stone-900">
          Contact Our Concierge Desk
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Whether you need assistance with verification, profile onboarding, or corporate inquiries, our dedicated team in New Delhi is here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <h2 className="text-lg font-serif font-bold text-stone-900">Direct Contacts</h2>
          <div className="space-y-4 text-xs text-stone-600">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-rose-700 shrink-0" />
              <div>
                <p className="font-semibold text-stone-900">Corporate Headquarters</p>
                <p>Marchmaker Matchmaking Technologies Pvt. Ltd.</p>
                <p>Barakhamba Road, Connaught Place, New Delhi, India 110001</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-rose-700 shrink-0" />
              <div>
                <p className="font-semibold text-stone-900">Email Support</p>
                <p>concierge@marchmaker.in</p>
                <p>grievance@marchmaker.in (Grievance Officer)</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-rose-700 shrink-0" />
              <div>
                <p className="font-semibold text-stone-900">Helpline</p>
                <p>+91 11 4050 9000</p>
                <p className="text-[11px] text-stone-400">Available Monday - Saturday, 10:00 AM - 7:00 PM IST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-serif font-bold text-lg text-stone-900">Message Received</h3>
              <p className="text-xs text-stone-600">
                Our support team will get in touch with you within 2 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-serif font-bold text-stone-900">Send an Inquiry</h2>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our matchmaking concierge assist you?"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
