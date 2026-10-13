import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Marchmaker | Trusted Matrimonial & Guided Matchmaking Platform",
  description:
    "India's premier privacy-first matchmaking platform. Hand-reviewed introductions, verified profiles, zero swiping, and meaningful compatibility.",
  manifest: "/manifest.json",
  themeColor: "#9f1239",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Marchmaker",
  },
  keywords: [
    "Matrimony India",
    "Verified Matchmaking",
    "Guided Matchmaking",
    "Indian Marriage Platform",
    "Kundli Compatibility",
    "Aadhaar Verified Profiles",
  ],
  authors: [{ name: "Marchmaker Matchmaking Systems" }],
  openGraph: {
    title: "Marchmaker — Guided Human Matchmaking for Marriage",
    description: "Hand-reviewed introductions, verified government ID checks, and high-trust compatibility.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration note:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#faf8f5] text-stone-900 antialiased selection:bg-rose-100 selection:text-rose-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

