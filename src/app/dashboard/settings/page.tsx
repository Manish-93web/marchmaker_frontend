"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";

type Tab = "password" | "notifications" | "sessions";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("password");
  const [user, setUser] = useState<any>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Notification prefs (mocked — would fetch from /api/v1/notifications/preferences)
  const [notifPrefs, setNotifPrefs] = useState({
    emailIntroductions: true,
    emailPayments: true,
    emailSecurity: true,
    emailMarketing: false,
    inAppAll: true,
  });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.push("/login"); return; }
    setUser(stored);
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPassword !== confirmPassword) { setPwError("New passwords do not match."); return; }
    if (newPassword.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    setPwSaving(true);
    try {
      const res = await api.auth.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPwSuccess(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => setPwSuccess(false), 4000);
      } else {
        setPwError(res.message || "Failed to change password.");
      }
    } catch {
      setPwError("A network error occurred. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "password", label: "Password" },
    { id: "notifications", label: "Notification Preferences" },
    { id: "sessions", label: "Account Security" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Account Settings</h1>
        <p className="text-slate-500 mb-8">Manage your password, notifications, and security preferences.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-sm font-semibold px-4 py-3 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Password Tab */}
        {activeTab === "password" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Change Password</h2>
            {pwSuccess && (
              <div className="mb-5 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
                ✓ Password changed successfully. All other sessions have been signed out.
              </div>
            )}
            {pwError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {pwError}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-5">
              {[
                { label: "Current Password", value: currentPassword, set: setCurrentPassword, id: "currentPw" },
                { label: "New Password", value: newPassword, set: setNewPassword, id: "newPw" },
                { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, id: "confirmPw" },
              ].map(({ label, value, set, id }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
                  <input
                    id={id}
                    type="password"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {pwSaving ? "Changing Password…" : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Notification Preferences</h2>
            <p className="text-slate-500 text-sm mb-6">
              You will always receive critical security and account notifications. Other notifications can be adjusted below.
            </p>
            <div className="space-y-5">
              {[
                { key: "emailIntroductions", label: "Introduction updates", description: "When a new introduction is offered or decided." },
                { key: "emailPayments", label: "Payment and invoice emails", description: "Receipts, payment confirmations, and refund notices." },
                { key: "emailSecurity", label: "Security alerts", description: "Login from new devices, password changes." },
                { key: "emailMarketing", label: "Platform news and updates", description: "Product improvements, tips, and announcements. Optional." },
                { key: "inAppAll", label: "In-app notifications", description: "All notification types within the Marchmaker dashboard." },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-4 py-4 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                      notifPrefs[key as keyof typeof notifPrefs] ? "bg-rose-600" : "bg-slate-200"
                    }`}
                    aria-pressed={notifPrefs[key as keyof typeof notifPrefs]}
                    aria-label={label}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        notifPrefs[key as keyof typeof notifPrefs] ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm">
              Save Preferences
            </button>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Account Security</h2>
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Signed-in Account</h3>
                <p className="text-slate-600 text-sm">{user?.email || "—"}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Email verified:{" "}
                  <span className={user?.isEmailVerified ? "text-green-600" : "text-rose-600"}>
                    {user?.isEmailVerified ? "Yes" : "No"}
                  </span>
                </p>
              </div>

              {!user?.isEmailVerified && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-rose-900 mb-2">Verify Your Email</h3>
                  <p className="text-rose-700 text-sm mb-4">
                    Please verify your email address to protect your account and enable all features.
                  </p>
                  <button
                    onClick={async () => {
                      const res = await api.auth.verifyEmail();
                      if (res.success) {
                        const stored = getStoredUser();
                        if (stored) {
                          stored.isEmailVerified = true;
                          localStorage.setItem("marchmaker_user", JSON.stringify(stored));
                          setUser({ ...stored, isEmailVerified: true });
                        }
                      }
                    }}
                    className="bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Send Verification Email
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-slate-100 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Sign Out All Sessions</h3>
                <p className="text-slate-500 text-sm mb-4">
                  This will sign you out of all devices where you are currently logged in.
                </p>
                <button
                  onClick={async () => {
                    await api.auth.logout();
                    localStorage.clear();
                    router.push("/login");
                  }}
                  className="border border-red-300 text-red-600 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Sign Out All Sessions
                </button>
              </div>

              <div className="rounded-xl border border-slate-100 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Delete Account</h3>
                <p className="text-slate-500 text-sm mb-4">
                  To permanently delete your account and request erasure of your data, use the Privacy settings or our Data Rights page.
                </p>
                <a
                  href="/data-rights"
                  className="text-sm text-rose-600 font-semibold hover:underline"
                >
                  Learn about data deletion →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
