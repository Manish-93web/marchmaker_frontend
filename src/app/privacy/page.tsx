import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 text-stone-800">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-emerald-700 font-semibold text-xs uppercase tracking-wider">
          DPDP Act 2023 Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mt-2">
          Privacy Policy & Data Protection
        </h1>
        <p className="text-xs text-stone-500 mt-1">Compliant with the Digital Personal Data Protection Act 2023 (DPDP Act)</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-700">
        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">1. Data Minimization & Collection Notice</h2>
          <p>
            Marchmaker collects personal data strictly necessary for matchmaking verification, compatibility scoring, and contact facilitation. We collect:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Basic demographic details (Full Name, Date of Birth, Gender, City, Education, Occupation).</li>
            <li>Government Identification (Aadhaar/Passport number masked and verified).</li>
            <li>Lifestyle and compatibility values responses.</li>
            <li>Photographs uploaded under explicit member visibility controls.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">2. Storage Security & Cryptographic Masking</h2>
          <p>
            Identity document numbers are irreversibly masked (e.g. XXXXXXXX1234). Sensitive identity proofs and live selfies are held in encrypted AWS S3/Cloudflare R2 private storage and served strictly via temporary, short-lived signed URLs. Passwords are hashed using bcrypt with dynamic salting.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">3. Rights of Data Principals (Under DPDP Act 2023)</h2>
          <p>
            As a registered Data Principal under Indian law, you have absolute rights to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Right to Access & Summary:</strong> Download a comprehensive JSON export of all your stored data anytime from your Privacy Dashboard.</li>
            <li><strong>Right to Correction & Erasure:</strong> Request permanent deletion of your profile, verification evidence, and relationship history.</li>
            <li><strong>Right to Grievance Redressal:</strong> Direct complaints to our appointed Grievance Officer at grievance@marchmaker.in.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-serif font-bold text-stone-900">4. Prohibition of Third-Party Advertising Sharing</h2>
          <p>
            We never sell, rent, or disclose personal member information, relationship assessment scores, or photographs to third-party ad networks, social data brokers, or marketing intermediaries.
          </p>
        </section>
      </div>
    </div>
  );
}
