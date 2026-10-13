import React from "react";

export default function CommunityStandardsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-stone-800">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
          Safety & Decorum
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
          Community Standards
        </h1>
        <p className="text-xs text-stone-500 mt-1">Our non-negotiable standards for a safe, respectful, and dignified matrimony community</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-700">
        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">1. Zero Tolerance for Harassment or Coercion</h2>
          <p>
            Any form of abusive language, persistent unwanted contact following a polite decline, non-consensual sharing of private contact details, or emotional harassment results in immediate account suspension and a permanent platform ban.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">2. Prohibited Content & Commercial Solicitation</h2>
          <p>
            Marchmaker is strictly for individuals seeking marriage. The following activities are categorically banned:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Casual hookup solicitations or extramarital dating.</li>
            <li>Financial fraud, investment advice, or demands for dowry.</li>
            <li>Commercial business promotions or affiliate marketing links.</li>
            <li>Explicit, sexually suggestive, or offensive photographs.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">3. Rapid Moderation & Member Reporting</h2>
          <p>
            Every introduction card contains an immediate "Report Member" option. When you report a member, they are immediately blocked from your account, and an alert is flagged in our Admin Moderation Queue for review within 4 hours.
          </p>
        </section>
      </div>
    </div>
  );
}
