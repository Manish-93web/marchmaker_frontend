import React from "react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-stone-800">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-rose-700 font-semibold text-xs uppercase tracking-wider">
          Legal Agreement
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
          Terms & Conditions of Service
        </h1>
        <p className="text-xs text-stone-500 mt-1">Last Updated: October 2026 • Effective for all Indian and Overseas Members</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-700">
        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">1. Acceptance of Terms & Eligibility</h2>
          <p>
            By accessing or using the Marchmaker platform ("Platform"), operated by Marchmaker Matchmaking Technologies Pvt. Ltd., you explicitly agree to comply with and be legally bound by these Terms and Conditions. To register as a member, you must be legally eligible for marriage under Indian law (minimum 21 years for men, 18 years for women) and possess legal capacity to enter into binding matrimonial arrangements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">2. Mandatory Identity Verification (KYC)</h2>
          <p>
            The Platform operates exclusively as a verified matchmaking service. Every applicant agrees to submit authentic government-issued identification (Aadhaar, Passport, or Voter ID) and a live selfie check. Submission of fraudulent, counterfeit, or misleading documents constitutes criminal misrepresentation and results in immediate permanent expulsion, forfeiture of credits, and referral to Indian law enforcement authorities.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">3. Non-Commercial & Personal Use Only</h2>
          <p>
            Membership is strictly personal and non-transferable. Commercial agencies, unauthorized third-party brokers, or automated crawlers are prohibited from harvesting profile information or utilizing Platform resources.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">4. Human Review & Matchmaking Discretion</h2>
          <p>
            Marchmaker provides human-curated introductions based on mutual partner preferences and compatibility evaluations. While our team applies rigorous standards, Marchmaker does not guarantee marriage, engagement, or partner availability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">5. Governing Law & Dispute Resolution</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute or controversy arising out of these Terms shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.
          </p>
        </section>
      </div>
    </div>
  );
}
