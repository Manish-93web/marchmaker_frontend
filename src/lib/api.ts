// Frontend API Client connecting to marchmaker_backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marchmaker_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("marchmaker_token", token);
};

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("marchmaker_token");
  localStorage.removeItem("marchmaker_user");
};

export const getStoredUser = (): any | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("marchmaker_user");
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user: any): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("marchmaker_user", JSON.stringify(user));
};

async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error(`[API Error] ${endpoint}:`, error);
    return {
      success: false,
      message: error.message || "Network error. Please ensure the backend is running.",
    };
  }
}

export const api = {
  // Auth
  auth: {
    register: (payload: any) =>
      apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: any) =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    logout: () => apiRequest("/auth/logout", { method: "POST" }),
    getMe: () => apiRequest("/auth/me"),
    forgotPassword: (email: string) =>
      apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (payload: { token: string; newPassword: string }) =>
      apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      apiRequest("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),
    verifyEmail: () => apiRequest("/auth/verify-email", { method: "POST" }),
    verifyEmailToken: (token: string) => apiRequest(`/auth/verify-email/${token}`),
    resendVerificationEmail: () => apiRequest("/auth/resend-verification-email", { method: "POST" }),
    sendPhoneOtp: (phone: string) =>
      apiRequest("/auth/phone/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
    verifyPhoneOtp: (otp: string) =>
      apiRequest("/auth/phone/verify-otp", { method: "POST", body: JSON.stringify({ otp }) }),
  },

  // Profile & Onboarding
  profile: {
    getMe: () => apiRequest("/profile/me"),
    saveDraft: (step: number, data: any) =>
      apiRequest("/profile/draft", {
        method: "PATCH",
        body: JSON.stringify({ step, data }),
      }),
    submitProfile: () => apiRequest("/profile/submit", { method: "POST" }),
    addPhoto: (photo: { url: string; isPrivate?: boolean; isPrimary?: boolean }) =>
      apiRequest("/profile/photos", { method: "POST", body: JSON.stringify(photo) }),
    deletePhoto: (photoId: string) =>
      apiRequest(`/profile/photos/${photoId}`, { method: "DELETE" }),
    getPresignedUploadUrl: (fileName: string, contentType: string) =>
      apiRequest("/profile/photos/presigned-upload", {
        method: "POST",
        body: JSON.stringify({ fileName, contentType }),
      }),
  },

  // Preferences
  preferences: {
    getMe: () => apiRequest("/preferences/me"),
    update: (data: any) =>
      apiRequest("/preferences/me", { method: "PUT", body: JSON.stringify(data) }),
  },

  // Assessment
  assessment: {
    getQuestions: () => apiRequest("/assessment/questions"),
    getMe: () => apiRequest("/assessment/me"),
    submit: (answers: any[]) =>
      apiRequest("/assessment/submit", {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
  },

  // KYC Verification & Interactive Liveness
  verification: {
    getMe: () => apiRequest("/verification/me"),
    submit: (data: any) =>
      apiRequest("/verification/submit", { method: "POST", body: JSON.stringify(data) }),
    validateDocument: (documentType: string, documentNumber: string) =>
      apiRequest("/verification/validate-document", {
        method: "POST",
        body: JSON.stringify({ documentType, documentNumber }),
      }),
    startLiveness: () =>
      apiRequest("/verification/liveness/start", { method: "POST" }),
    verifyLiveness: (sessionId: string, completedActions: string[], selfieImageBase64?: string) =>
      apiRequest("/verification/liveness/verify", {
        method: "POST",
        body: JSON.stringify({ sessionId, completedActions, selfieImageBase64 }),
      }),
    getPresignedUploadUrl: (category: "KYC_DOCUMENT" | "SELFIE", fileName: string, contentType: string) =>
      apiRequest("/verification/presigned-upload", {
        method: "POST",
        body: JSON.stringify({ category, fileName, contentType }),
      }),
  },

  // Educational E-Guides & Relationship Audio
  guides: {
    getAll: () => apiRequest("/guides"),
    getBySlug: (slug: string) => apiRequest(`/guides/${slug}`),
    saveProgress: (guideId: string, playbackPositionSeconds: number, isCompleted?: boolean) =>
      apiRequest("/guides/progress", {
        method: "POST",
        body: JSON.stringify({ guideId, playbackPositionSeconds, isCompleted }),
      }),
  },

  // Introductions
  introductions: {
    getAll: () => apiRequest("/introductions"),
    findMatches: () => apiRequest("/introductions/find-matches", { method: "POST" }),
    respond: (id: string, decision: "ACCEPTED" | "DECLINED", declineReason?: string) =>
      apiRequest(`/introductions/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ decision, declineReason }),
      }),
    sendNote: (id: string, content: string) =>
      apiRequest(`/introductions/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    submitFeedback: (id: string, feedback: any) =>
      apiRequest(`/introductions/${id}/feedback`, {
        method: "POST",
        body: JSON.stringify(feedback),
      }),
  },

  // Payments
  payments: {
    createOrder: (introductionId: string) =>
      apiRequest("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ introductionId }),
      }),
    verify: (payload: {
      introductionId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => apiRequest("/payments/verify", { method: "POST", body: JSON.stringify(payload) }),
    getInvoices: () => apiRequest("/payments/invoices"),
  },

  // Wallet
  wallet: {
    getMe: () => apiRequest("/wallet/me"),
    getLedger: () => apiRequest("/wallet/ledger"),
  },

  // Moderation
  moderation: {
    report: (data: any) =>
      apiRequest("/moderation/report", { method: "POST", body: JSON.stringify(data) }),
    block: (blockedUserId: string) =>
      apiRequest("/moderation/block", {
        method: "POST",
        body: JSON.stringify({ blockedUserId }),
      }),
  },

  // Support
  support: {
    getTickets: () => apiRequest("/support/tickets"),
    createTicket: (data: any) =>
      apiRequest("/support/tickets", { method: "POST", body: JSON.stringify(data) }),
    replyTicket: (ticketId: string, message: string) =>
      apiRequest(`/support/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  },

  // Notifications
  notifications: {
    getAll: () => apiRequest("/notifications"),
    markRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () => apiRequest("/notifications/read-all", { method: "POST" }),
  },

  // Privacy & DPDP Act
  privacy: {
    exportData: () => apiRequest("/privacy/export"),
    requestDeletion: (reason?: string) =>
      apiRequest("/privacy/delete-request", {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    recordConsent: (consent: any) =>
      apiRequest("/privacy/consent", { method: "POST", body: JSON.stringify(consent) }),
  },

  // Journey Tracker
  journey: {
    getStatus: () => apiRequest("/member/journey-status"),
    getTrustStatus: () => apiRequest("/member/trust-status"),
  },

  // Admin Console
  admin: {
    getStats: () => apiRequest("/admin/stats"),
    getMembers: (params?: { page?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", params.page.toString());
      if (params?.search) q.set("search", params.search);
      return apiRequest(`/admin/members?${q.toString()}`);
    },
    getReviews: (page = 1) => apiRequest(`/admin/reviews?page=${page}`),
    getReviewQueue: (page = 1, priority?: string) => {
      const q = new URLSearchParams({ page: String(page) });
      if (priority) q.set("priority", priority);
      return apiRequest(`/admin/reviews/queue?${q.toString()}`);
    },
    reviewIntro: (id: string, decision: "APPROVE" | "REJECT", notes?: string) =>
      apiRequest(`/admin/reviews/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, notes }),
      }),
    escalateReview: (id: string, reason: string) =>
      apiRequest(`/admin/reviews/${id}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    setReviewPriority: (id: string, priority: "NORMAL" | "HIGH" | "URGENT") =>
      apiRequest(`/admin/reviews/${id}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority }),
      }),
    getReviewerStats: () => apiRequest("/admin/reviewer-stats"),
    getVerifications: (page = 1) => apiRequest(`/admin/verifications?page=${page}`),
    reviewKyc: (id: string, decision: "APPROVE" | "REJECT" | "REQUEST_INFO", reason?: string) =>
      apiRequest(`/admin/verifications/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reason }),
      }),
    getReports: (page = 1) => apiRequest(`/admin/reports?page=${page}`),
    actionReport: (id: string, action: string, moderatorNotes?: string) =>
      apiRequest(`/admin/reports/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, moderatorNotes }),
      }),
    getTickets: (page = 1) => apiRequest(`/admin/support/tickets?page=${page}`),
    replyTicket: (id: string, message: string) =>
      apiRequest(`/admin/support/tickets/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    updateTicketStatus: (id: string, status: string) =>
      apiRequest(`/admin/support/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    getPayments: (page = 1) => apiRequest(`/admin/payments?page=${page}`),
    getReconciliation: (days = 30) => apiRequest(`/admin/payments/reconciliation?days=${days}`),
    requestRefund: (id: string, reason: string, refundAmountINR?: number) =>
      apiRequest(`/admin/payments/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason, refundAmountINR }),
      }),
    confirmRefund: (id: string, razorpayRefundId: string) =>
      apiRequest(`/admin/payments/${id}/confirm-refund`, {
        method: "POST",
        body: JSON.stringify({ razorpayRefundId }),
      }),
    getFeedbackAnalytics: (days = 90) => apiRequest(`/admin/feedback-analytics?days=${days}`),
    getAuditLogs: (page = 1) => apiRequest(`/admin/audit-logs?page=${page}`),
  },
};
