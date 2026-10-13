import React from "react";

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-stone-800">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-amber-700 font-semibold text-xs uppercase tracking-wider">
          Financial Policies
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
          Refund & Cancellation Policy
        </h1>
        <p className="text-xs text-stone-500 mt-1">Clear, fair guidelines regarding per-introduction fees and cancellations</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-700">
        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">1. Pay-Per-Introduction Model</h2>
          <p>
            Marchmaker does not utilize recurring subscriptions or auto-renewing debits. All payments of ₹499 (inclusive of 18% GST) are made on an individual, on-demand basis to unlock a specific hand-reviewed introduction.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">2. Refund Eligibility Criteria</h2>
          <p>
            You are entitled to a full refund (or equivalent wallet credit, at your choice) under the following validated scenarios:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Verified Profile Misrepresentation:</strong> If our moderation team confirms that the candidate provided materially falsified marital, occupational, or criminal background details.</li>
            <li><strong>Technical Duplicate Charges:</strong> If payment gateway glitches or duplicate webhooks result in multiple debits for a single introduction.</li>
            <li><strong>Unresponsive Candidate Prior to Contact:</strong> If the candidate deletes their account or becomes unreachable before any introductory communication occurs.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">3. Non-Refundable Scenarios</h2>
          <p>
            Matchmaking involves mutual human compatibility and personal discretion. A refund is not available simply because a candidate politely declines an introduction, or because initial conversations reveal differing personal values or life goals.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">4. Processing Timelines</h2>
          <p>
            Approved refunds are initiated through Razorpay to the original payment source (UPI, Credit/Debit card, or Net Banking) within 3 to 5 business days, in accordance with Reserve Bank of India (RBI) payment guidelines.
          </p>
        </section>
      </div>
    </div>
  );
}
