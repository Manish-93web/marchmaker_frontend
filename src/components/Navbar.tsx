"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  ShieldCheck,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { getStoredUser, clearAuthToken, api } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);

    if (user) {
      api.notifications.getAll().then((res) => {
        if (res.success && res.data) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(res.data.unreadCount || 0);
        }
      });
    }
  }, [pathname]);

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    router.push("/");
  };

  const markAllRead = async () => {
    await api.notifications.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-700 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-900 group-hover:text-rose-700 transition-colors">
                Marchmaker
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-amber-700">
                Curated Matrimony
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/how-it-works"
              className={`text-sm font-medium transition-colors hover:text-rose-700 ${
                pathname === "/how-it-works" ? "text-rose-700 font-semibold" : "text-stone-600"
              }`}
            >
              How It Works
            </Link>
            <Link
              href="/trust-and-safety"
              className={`text-sm font-medium transition-colors hover:text-rose-700 ${
                pathname === "/trust-and-safety" ? "text-rose-700 font-semibold" : "text-stone-600"
              }`}
            >
              Trust & Safety
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors hover:text-rose-700 ${
                pathname === "/pricing" ? "text-rose-700 font-semibold" : "text-stone-600"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors hover:text-rose-700 ${
                pathname === "/contact" ? "text-rose-700 font-semibold" : "text-stone-600"
              }`}
            >
              Support
            </Link>
          </nav>

          {/* User actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser ? (
              <>
                {/* Notification Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 relative transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 py-3 z-50">
                      <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
                        <span className="font-semibold text-sm text-stone-900">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-rose-700 hover:underline font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-stone-50">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-stone-500 text-center py-6">
                            No notifications yet
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              className={`p-3 text-xs hover:bg-stone-50 transition-colors ${
                                !n.isRead ? "bg-rose-50/50" : ""
                              }`}
                            >
                              <p className="font-medium text-stone-900">{n.title}</p>
                              <p className="text-stone-600 mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard Link */}
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-rose-700" />
                  <span>Dashboard</span>
                </Link>

                {/* Admin Console Link for staff / review */}
                <Link
                  href="/admin"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Admin Desk</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-semibold text-stone-700 hover:text-rose-700 px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 shadow-sm transition-all hover:shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 space-y-2">
            <Link
              href="/how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              How It Works
            </Link>
            <Link
              href="/trust-and-safety"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Trust & Safety
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Support
            </Link>
            {currentUser && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Member Dashboard
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 hover:bg-amber-50"
                >
                  Admin Operations Console
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
