import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your Data Rights | Marchmaker",
  description:
    "Understand your rights over your personal data under the Digital Personal Data Protection Act 2023. Learn how to export, correct, or delete your information.",
};

const rights = [
  {
    icon: "📥",
    title: "Right to Access Your Data",
    description:
      "You can request a summary of the personal data we hold about you at any time. This includes your profile, preferences, assessment responses, payment records, and consent history.",
    action: "Export your data from your Privacy settings.",
  },
  {
    icon: "✏️",
    title: "Right to Correction",
    description:
      "If any of your personal information is inaccurate or incomplete, you may update it directly in your profile or contact our support team for assistance.",
    action: "Edit your profile or contact support.",
  },
  {
    icon: "🗑️",
    title: "Right to Erasure (Deletion)",
    description:
      "You may request deletion of your personal data. We will process your request in accordance with our retention policy and applicable law. Some data may be retained for legal, financial, or safety reasons — we will explain what is retained and why.",
    action: "Submit a deletion request from Privacy settings.",
  },
  {
    icon: "🔒",
    title: "Right to Withdraw Consent",
    description:
      "Where we process your data on the basis of consent, you may withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing prior to withdrawal.",
    action: "Manage your consent settings in Privacy settings.",
  },
  {
    icon: "📣",
    title: "Right to Grievance Redressal",
    description:
      "If you believe your data rights have not been respected, you may file a complaint with our Data Protection Officer or with the applicable Data Protection Board under the Digital Personal Data Protection Act 2023.",
    action: "Contact our Data Protection Officer at privacy@marchmaker.in.",
  },
  {
    icon: "👧",
    title: "Protection for Children and Minors",
    description:
      "Marchmaker does not knowingly collect data from individuals under 18. If we become aware of any such account, it will be suspended and the data deleted. Parental or guardian consent is required for any processing involving minors.",
    action: "Contact support@marchmaker.in immediately if you have a concern.",
  },
];

const retentionItems = [
  { type: "Profile data", period: "Retained while your account is active; deleted within 30 days of a completed deletion request, subject to legal holds." },
  { type: "Identity documents", period: "Deleted within 7 days of verification completion unless a dispute or legal requirement requires retention." },
  { type: "Payment records and invoices", period: "Retained for 8 years for tax and legal compliance requirements." },
  { type: "Audit logs", period: "Retained for 3 years for security and fraud investigation purposes." },
  { type: "Support correspondence", period: "Retained for 2 years after ticket closure." },
  { type: "Consent records", period: "Retained for 3 years or the duration required by applicable law." },
];

export default function DataRightsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-20 px-4 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-1 rounded-full mb-4 tracking-wide">
            DATA RIGHTS &amp; DPDP ACT 2023
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Your Data. Your Rights.</h1>
          <p className="text-xl text-slate-300 max-w-xl mx-auto leading-relaxed">
            Marchmaker is committed to handling your personal data responsibly and transparently. This page explains
            your rights under the Digital Personal Data Protection Act 2023 and how to exercise them.
          </p>
        </div>
      </section>

      {/* Rights Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Your Rights as a Data Principal</h2>
          <p className="text-slate-500 text-center mb-14 text-lg max-w-2xl mx-auto">
            The Digital Personal Data Protection Act 2023 grants you specific rights over your personal data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rights.map((r) => (
              <div key={r.title} className="p-6 rounded-2xl border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all">
                <span className="text-3xl mb-4 block">{r.icon}</span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-3">{r.description}</p>
                <p className="text-sm font-medium text-rose-600">→ {r.action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Retention Table */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Data Retention Periods</h2>
          <p className="text-slate-500 text-center mb-12 text-lg max-w-xl mx-auto">
            We retain different categories of data for different periods based on legal, financial, and safety requirements.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full bg-white">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data Category</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Retention Period</th>
                </tr>
              </thead>
              <tbody>
                {retentionItems.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How to Exercise Rights */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">How to Exercise Your Rights</h2>
          <p className="text-slate-500 text-center mb-12 text-lg">
            Most actions can be completed directly in your account. For complex requests, our support team is available.
          </p>
          <ol className="space-y-6">
            {[
              ["Log in to your account", "Navigate to Dashboard → Privacy &amp; Security → Data Rights."],
              ["Select your request type", "Choose from Export Data, Correct Data, Delete Account, or Withdraw Consent."],
              ["Submit your request", "Provide any required information and confirm your identity if prompted."],
              ["Receive confirmation", "You will receive a confirmation notification and email. Complex requests are processed within 30 days."],
              ["Contact support if needed", "If you cannot complete your request through the portal, email privacy@marchmaker.in with your registered email address and request details."],
            ].map(([title, body], i) => (
              <li key={i} className="flex gap-5">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1" dangerouslySetInnerHTML={{ __html: title }} />
                  <p className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* DPO Contact */}
      <section className="py-16 px-4 bg-slate-900 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Contact our Data Protection Officer</h2>
        <p className="text-slate-300 mb-6 max-w-lg mx-auto">
          For data-related grievances, requests that cannot be completed through the platform, or questions about
          our data practices, contact our Data Protection Officer directly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="mailto:privacy@marchmaker.in" className="bg-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-rose-700 transition-colors">
            privacy@marchmaker.in
          </a>
          <Link href="/dashboard/privacy" className="border border-slate-600 text-slate-300 font-semibold px-8 py-3 rounded-full hover:bg-slate-800 transition-colors">
            Manage Your Privacy Settings
          </Link>
        </div>
        <p className="text-slate-500 text-sm mt-8 max-w-xl mx-auto">
          This page provides general information about your data rights. It does not constitute legal advice.
          The Digital Personal Data Protection Act 2023 and its rules are subject to ongoing implementation.
          We recommend reviewing the applicable legislation or consulting a qualified legal professional for authoritative guidance.
        </p>
      </section>
    </main>
  );
}
