import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { Shell } from './components/Shell';
import { NotFound } from './pages/NotFound';
import { publicRoutes } from './routes';

// Account pages are not pre-rendered; each is its own chunk.
const Login = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then((m) => ({ default: m.Register })));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail').then((m) => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./pages/auth/Recovery').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/Recovery').then((m) => ({ default: m.ResetPassword })));
const OtpLogin = lazy(() => import('./pages/auth/OtpLogin').then((m) => ({ default: m.OtpLogin })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Wizard = lazy(() => import('./pages/onboarding/Wizard').then((m) => ({ default: m.Wizard })));
const Preferences = lazy(() => import('./pages/onboarding/Preferences').then((m) => ({ default: m.Preferences })));
const AssessmentList = lazy(() => import('./pages/assessments/List').then((m) => ({ default: m.AssessmentList })));
const AssessmentRunner = lazy(() => import('./pages/assessments/Runner').then((m) => ({ default: m.AssessmentRunner })));
const AssessmentResult = lazy(() => import('./pages/assessments/Result').then((m) => ({ default: m.AssessmentResult })));
const Verification = lazy(() => import('./pages/verification/Verification').then((m) => ({ default: m.Verification })));
const IntroductionList = lazy(() => import('./pages/introductions/Introductions').then((m) => ({ default: m.IntroductionList })));
const IntroductionDetail = lazy(() => import('./pages/introductions/Introductions').then((m) => ({ default: m.IntroductionDetail })));
const MessageList = lazy(() => import('./pages/introductions/Messages').then((m) => ({ default: m.MessageList })));
const Conversation = lazy(() => import('./pages/introductions/Messages').then((m) => ({ default: m.Conversation })));
const Billing = lazy(() => import('./pages/billing/Billing').then((m) => ({ default: m.Billing })));
const NotificationsPage = lazy(() => import('./pages/notifications/Notifications').then((m) => ({ default: m.NotificationsPage })));
const NotificationSettings = lazy(() => import('./pages/notifications/Notifications').then((m) => ({ default: m.NotificationSettings })));
const Unsubscribe = lazy(() => import('./pages/notifications/Notifications').then((m) => ({ default: m.Unsubscribe })));
const SupportHome = lazy(() => import('./pages/support/Support').then((m) => ({ default: m.SupportHome })));
const TicketDetail = lazy(() => import('./pages/support/Support').then((m) => ({ default: m.TicketDetail })));
const Appeal = lazy(() => import('./pages/support/Support').then((m) => ({ default: m.Appeal })));
const Referrals = lazy(() => import('./pages/referrals/Referrals').then((m) => ({ default: m.Referrals })));
const Stories = lazy(() => import('./pages/stories/Stories').then((m) => ({ default: m.Stories })));
const GuidePage = lazy(() => import('./pages/guides/Guide').then((m) => ({ default: m.GuidePage })));
const Astrology = lazy(() => import('./pages/astrology/Astrology').then((m) => ({ default: m.Astrology })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

const page = (el: ReactNode) => <Suspense fallback={<div className="container py-10" aria-busy="true" />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      ...publicRoutes,
      { path: 'login', element: page(<Login />) },
      { path: 'login/code', element: page(<OtpLogin />) },
      { path: 'register', element: page(<Register />) },
      { path: 'verify-email', element: page(<VerifyEmail />) },
      { path: 'forgot-password', element: page(<ForgotPassword />) },
      { path: 'reset-password', element: page(<ResetPassword />) },
      { path: 'unsubscribe', element: page(<Unsubscribe />) },
      { path: 'guides/:slug', element: page(<GuidePage />) },
      { path: 'appeal', element: page(<Appeal />) },
      {
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: page(<Dashboard />) },
          { path: 'onboarding', element: page(<Wizard />) },
          { path: 'onboarding/:step', element: page(<Wizard />) },
          { path: 'assessments', element: page(<AssessmentList />) },
          { path: 'assessments/:key', element: page(<AssessmentRunner />) },
          { path: 'assessments/:key/result', element: page(<AssessmentResult />) },
          { path: 'verification', element: page(<Verification />) },
          { path: 'introductions', element: page(<IntroductionList />) },
          { path: 'introductions/:id', element: page(<IntroductionDetail />) },
          { path: 'messages', element: page(<MessageList />) },
          { path: 'messages/:id', element: page(<Conversation />) },
          { path: 'preferences', element: page(<Preferences />) },
          { path: 'billing', element: page(<Billing />) },
          { path: 'astrology', element: page(<Astrology />) },
          { path: 'stories', element: page(<Stories />) },
          { path: 'referrals', element: page(<Referrals />) },
          { path: 'support', element: page(<SupportHome />) },
          { path: 'support/:id', element: page(<TicketDetail />) },
          { path: 'notifications', element: page(<NotificationsPage />) },
          { path: 'notifications/settings', element: page(<NotificationSettings />) },
          { path: 'settings', element: page(<Settings />) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
