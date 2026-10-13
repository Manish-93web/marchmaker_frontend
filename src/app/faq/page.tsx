import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Marchmaker",
  description:
    "Answers to common questions about Marchmaker — how profiles work, how introductions are offered, verification, payments, privacy, and account management.",
};

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Marchmaker?",
        a: "Marchmaker is a premium Indian matchmaking platform for people who are seriously considering marriage. We focus on meaningful introductions rather than endless browsing. Every introduction is curated by our team and reviewed by a human before being offered to you.",
      },
      {
        q: "Who is Marchmaker for?",
        a: "Marchmaker is for individuals and their families who are looking for a life partner with genuine intention. We welcome all communities, professions, and backgrounds across India and the Indian diaspora.",
      },
      {
        q: "How is Marchmaker different from other matrimonial sites?",
        a: "We do not offer open browsing, swipe interfaces, or unlimited contact. Each introduction is individually reviewed by our team before it reaches you. You will never receive a match suggestion from an algorithm alone.",
      },
    ],
  },
  {
    category: "Profiles and Verification",
    items: [
      {
        q: "What information do I need to provide?",
        a: "You will complete a guided profile covering your personal background, education, profession, family, lifestyle, marriage intentions, and partner preferences. You can also add photographs. All sensitive fields are optional unless specifically noted.",
      },
      {
        q: "How does verification work?",
        a: "We ask members to submit a government-issued identity document and a clear selfie. Our verification team reviews submissions manually and may request additional information. Verified members receive a verification badge on their profile visible to other verified members only.",
      },
      {
        q: "Is verification mandatory?",
        a: "Verification is strongly encouraged and required before you can be considered for introductions. It protects every member on the platform and is a core part of our trust and safety commitment.",
      },
      {
        q: "How are my identity documents stored?",
        a: "Identity documents are stored in a private, encrypted object store accessible only to authorised verification staff. They are never visible to other members and are not shared with any third party except for the purpose of identity verification. Documents are deleted according to our retention policy after verification is completed.",
      },
    ],
  },
  {
    category: "Introductions",
    items: [
      {
        q: "How are introductions proposed?",
        a: "Our matching team identifies candidates whose profile, preferences, and compatibility assessment align with yours. Each candidate goes through a human review before an introduction is offered to you. You will be notified when a new introduction is available.",
      },
      {
        q: "How many introductions will I receive?",
        a: "We prioritise quality over quantity. The number of introductions depends on the active pool of eligible members and how closely profiles align. We do not guarantee a specific number of introductions.",
      },
      {
        q: "Can I see who has been proposed before I pay?",
        a: "Yes. You can view a limited introduction card — including relevant compatibility information and select profile details — before making any payment decision. Full profile and contact information is unlocked after payment.",
      },
      {
        q: "What happens after I accept an introduction?",
        a: "Once both parties have unlocked the introduction, full profile details and any introductory notes become accessible. You may then begin direct contact as appropriate. Our team remains available if you need guidance or encounter any concerns.",
      },
      {
        q: "What if I decline an introduction?",
        a: "You can decline at any time and optionally share a reason. Decline reasons help us improve future introductions. The other member is informed only that you have declined, not of any reason you may have shared.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        q: "How much does Marchmaker cost?",
        a: "Each introduction unlock costs ₹499 inclusive of 18% GST. There is no subscription or hidden monthly fee. You pay only for introductions you choose to pursue.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept UPI, credit and debit cards, and net banking through our payment partner Razorpay. All payments are processed securely and we never store card details.",
      },
      {
        q: "Will I receive a receipt or invoice?",
        a: "Yes. A GST invoice is generated automatically for every successful payment and is available in your account under Payments and Invoices.",
      },
      {
        q: "What is your refund policy?",
        a: "Please review our Refund and Cancellation Policy for full details. In general, introduction unlock fees are non-refundable once full profile details have been accessed. If there is a billing error or a technical issue, please contact our support team.",
      },
    ],
  },
  {
    category: "Privacy and Safety",
    items: [
      {
        q: "Who can see my profile?",
        a: "Your profile is only shown to members who have been specifically proposed as a potential match for you by our team. There is no public directory and no open browsing of profiles.",
      },
      {
        q: "Who can see my photographs?",
        a: "Photographs are only visible to members involved in an active introduction that has been approved and offered. Our team may review photographs as part of the verification and moderation process.",
      },
      {
        q: "Can I pause or hide my profile?",
        a: "Yes. You can pause your profile at any time from your privacy settings. While paused, you will not be considered for new introductions.",
      },
      {
        q: "How do I report a concern about another member?",
        a: "Use the Report option on any introduction card or contact our support team directly. All reports are reviewed by our moderation team. You can also block a member, which immediately prevents any further introductions or contact.",
      },
      {
        q: "How do I delete my account and data?",
        a: "You can submit a data deletion request from your Privacy settings or visit our Data Rights page. Requests are processed in accordance with applicable law and our data retention policy. Some information may be retained for legal, financial, or safety reasons.",
      },
    ],
  },
  {
    category: "Referrals and Wallet",
    items: [
      {
        q: "How does the referral programme work?",
        a: "When you refer a friend who completes registration and verification, you earn Marchmaker credits. Credits can be applied to introduction unlock fees. Full terms are available in your dashboard under Wallet.",
      },
      {
        q: "Can I withdraw my credits as cash?",
        a: "No. Marchmaker credits are non-transferable and can only be used against eligible service fees on the platform. Credits do not have cash value and cannot be refunded.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-1 rounded-full mb-4 tracking-wide">
            HELP &amp; SUPPORT
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about Marchmaker, from setting up your profile to managing your account.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-14">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">
                {section.category}
              </h2>
              <div className="space-y-6">
                {section.items.map((item) => (
                  <div key={item.q} className="bg-slate-50 rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-2">{item.q}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-rose-50 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Still have questions?</h2>
        <p className="text-slate-600 mb-8 max-w-lg mx-auto">
          Our support team is here to help. Reach out and we will respond as soon as possible.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="bg-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-rose-700 transition-colors"
          >
            Contact Support
          </Link>
          <Link
            href="/register"
            className="border border-rose-300 text-rose-700 font-semibold px-8 py-3 rounded-full hover:bg-rose-100 transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </section>
    </main>
  );
}
