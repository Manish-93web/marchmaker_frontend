import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Approach to Compatibility | Marchmaker",
  description:
    "Learn how Marchmaker evaluates compatibility through values, life goals, communication styles and long-term expectations — not just photos and age.",
  openGraph: {
    title: "Our Approach to Compatibility | Marchmaker",
    description:
      "Marchmaker uses a thoughtful, explainable compatibility framework rooted in values, intentions, and lifestyle fit — not opaque algorithms.",
    type: "website",
  },
};

const dimensions = [
  {
    icon: "💍",
    title: "Marriage Timeline",
    description:
      "We align members who share a similar readiness for marriage. Whether you are planning to wed within a year or prefer a longer courtship, we ensure introductions respect your timeline.",
  },
  {
    icon: "🗣️",
    title: "Communication Expectations",
    description:
      "Great relationships thrive on compatible communication. We explore how often you prefer to connect, how you share important matters, and how you navigate disagreement.",
  },
  {
    icon: "💼",
    title: "Career and Ambition",
    description:
      "We consider whether both partners' professional goals leave room for a shared life. We do not judge any career path — we find pairs whose ambitions are mutually respectful.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family Involvement",
    description:
      "Family plays a central role in many Indian households. We explore each member's expectations around extended family involvement, living arrangements, and decision-making.",
  },
  {
    icon: "🌍",
    title: "Lifestyle and Values",
    description:
      "Daily habits, dietary preferences, social life, and personal values all shape how two people build a life together. We evaluate alignment across the dimensions that matter most.",
  },
  {
    icon: "🧒",
    title: "Views on Children",
    description:
      "Expectations about starting or growing a family are among the most important long-term considerations. We carefully handle these preferences with sensitivity and privacy.",
  },
  {
    icon: "✈️",
    title: "Relocation and Location",
    description:
      "Whether you wish to stay near your family or are open to relocating, we factor in geography and flexibility so that distance is never an unpleasant surprise.",
  },
  {
    icon: "🧘",
    title: "Personal Goals and Growth",
    description:
      "Beyond the relationship, each person has individual aspirations. We look for introductions where both partners genuinely support each other's personal development.",
  },
];

const principles = [
  {
    number: "01",
    title: "Explainable, Not Algorithmic",
    body: "We do not use an opaque AI model to rank your matches. Every compatibility consideration we apply is transparent and reviewable.",
  },
  {
    number: "02",
    title: "Hard Preferences Respected",
    body: "Where you have stated a non-negotiable preference — such as age range, location, or views on children — we honour it absolutely.",
  },
  {
    number: "03",
    title: "Human Review Before Every Introduction",
    body: "A trained Marchmaker reviewer evaluates each proposed introduction before it is offered to you. No algorithm alone determines who you meet.",
  },
  {
    number: "04",
    title: "No Compatibility Scores",
    body: "We deliberately avoid showing you a numerical compatibility score. Numbers invite comparison, not connection. We describe compatibility in natural language instead.",
  },
  {
    number: "05",
    title: "Privacy in Every Step",
    body: "Your compatibility assessment answers are confidential. They inform our matching process but are never shared with other members.",
  },
  {
    number: "06",
    title: "Reassessment When Life Changes",
    body: "If your circumstances or preferences change, you can update your assessment. We will recalibrate your matching profile to reflect who you are today.",
  },
];

export default function CompatibilityPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-rose-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-rose-100 text-rose-700 text-sm font-semibold px-4 py-1 rounded-full mb-4 tracking-wide">
            COMPATIBILITY PHILOSOPHY
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Matching on what matters most
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Marchmaker evaluates compatibility through values, life intentions, and long-term expectations —
            not swipes, ratings, or opaque scoring systems.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Our Guiding Principles</h2>
          <p className="text-slate-500 text-center mb-14 text-lg">These principles govern every introduction we propose.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {principles.map((p) => (
              <div key={p.number} className="flex gap-5 p-6 rounded-2xl border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all">
                <span className="text-3xl font-bold text-rose-200 shrink-0">{p.number}</span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Compatibility Dimensions</h2>
          <p className="text-slate-500 text-center mb-14 text-lg max-w-2xl mx-auto">
            Eight core dimensions that shape long-term compatibility.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dimensions.map((d) => (
              <div key={d.title} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-all">
                <span className="text-3xl mb-4 block">{d.icon}</span>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{d.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-rose-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to begin?</h2>
        <p className="text-rose-100 text-lg mb-8 max-w-xl mx-auto">
          Create your profile today and complete your compatibility assessment. Our team will handle the rest.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="bg-white text-rose-600 font-semibold px-8 py-3 rounded-full hover:bg-rose-50 transition-colors">
            Create Your Profile
          </Link>
          <Link href="/how-it-works" className="border border-rose-300 text-white font-semibold px-8 py-3 rounded-full hover:bg-rose-700 transition-colors">
            How It Works
          </Link>
        </div>
      </section>
    </main>
  );
}
