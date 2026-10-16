import { Banner } from '@marchmaker/ui';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { NAV, Shell } from './components/Shell';
import { can, type StaffMe } from './lib/session';
import { Audit } from './pages/Audit';
import { Dashboard } from './pages/Dashboard';
import { GuidesAdmin } from './pages/Guides';
import { Experiments, Insights, StoryReview } from './pages/Growth';
import { Referrals } from './pages/Referrals';
import { Appeals, ModerationCase, ModerationQueue, SupportInbox, SupportTicket } from './pages/Safety';
import { Coupons, Payments, PlansAdmin, Subscriptions, Webhooks } from './pages/Finance';
import { MemberDetail } from './pages/MemberDetail';
import { Members } from './pages/Members';
import { MatchReview } from './pages/MatchReview';
import { Matches } from './pages/Matches';
import { MatchingSettings } from './pages/MatchingSettings';
import { ResetPassword } from './pages/ResetPassword';
import { PhotoQueue, ProfileQueue, ProfileReview } from './pages/Reviews';
import { Banks, Flags, Roles } from './pages/Settings';
import { Team } from './pages/Team';
import { VerificationCase, VerificationQueue } from './pages/VerificationQueue';
import { ViewAsMember } from './pages/ViewAsMember';

function Guard({ me, perm, children }: { me: StaffMe; perm: string; children: ReactNode }) {
  if (!can(me, perm)) {
    return <Banner tone="warning">You do not have access to this page. Ask a super admin if you need it.</Banner>;
  }
  return <>{children}</>;
}

/** The first page a person is allowed to see, so nobody lands on a blank "no access" screen. */
function Home({ me }: { me: StaffMe }) {
  if (can(me, 'metrics.view')) return <Dashboard />;
  const first = NAV.find((n) => can(me, n.perm));
  return first ? <Navigate to={first.to} replace /> : <Banner tone="info">Your role has no console pages yet.</Banner>;
}

function Console({ me }: { me: StaffMe }) {
  const g = (perm: string, el: ReactNode) => <Guard me={me} perm={perm}>{el}</Guard>;
  return (
    <Routes>
      <Route element={<Shell me={me} />}>
        <Route index element={<Home me={me} />} />
        <Route path="members" element={g('member.search', <Members />)} />
        <Route path="members/:id" element={g('member.view_basic', <MemberDetail />)} />
        <Route path="members/:id/view" element={g('member.impersonate_view', <ViewAsMember />)} />
        <Route path="profiles" element={g('profile.review', <ProfileQueue />)} />
        <Route path="profiles/:id" element={g('profile.review', <ProfileReview />)} />
        <Route path="photos" element={g('photo.review', <PhotoQueue />)} />
        <Route path="matches" element={g('match.review', <Matches />)} />
        <Route path="matches/:id" element={g('match.review', <MatchReview />)} />
        <Route path="settings" element={g('settings.manage', <MatchingSettings />)} />
        <Route path="verification" element={g('verification.view_evidence', <VerificationQueue />)} />
        <Route path="verification/:id" element={g('verification.view_evidence', <VerificationCase />)} />
        <Route path="moderation" element={g('moderation.view', <ModerationQueue />)} />
        <Route path="moderation/:id" element={g('moderation.view', <ModerationCase />)} />
        <Route path="appeals" element={g('moderation.view', <Appeals />)} />
        <Route path="support" element={g('support.view', <SupportInbox />)} />
        <Route path="support/:id" element={g('support.view', <SupportTicket />)} />
        <Route path="insights" element={g('metrics.view', <Insights />)} />
        <Route path="experiments" element={g('flags.manage', <Experiments />)} />
        <Route path="guides" element={g('content.manage', <GuidesAdmin />)} />
        <Route path="stories" element={g('content.manage', <StoryReview />)} />
        <Route path="referrals" element={g('wallet.adjust', <Referrals />)} />
        <Route path="payments" element={g('payment.view', <Payments />)} />
        <Route path="subscriptions" element={g('payment.view', <Subscriptions />)} />
        <Route path="webhooks" element={g('payment.view', <Webhooks />)} />
        <Route path="coupons" element={g('coupon.manage', <Coupons />)} />
        <Route path="plans" element={g('plan.manage', <PlansAdmin />)} />
        <Route path="audit" element={g('audit.view', <Audit />)} />
        <Route path="assessments" element={g('content.manage', <Banks />)} />
        <Route path="team" element={g('admin_users.manage', <Team />)} />
        <Route path="roles" element={g('roles.manage', <Roles />)} />
        <Route path="flags" element={g('flags.manage', <Flags />)} />
        <Route path="*" element={<Banner tone="info">That page does not exist.</Banner>} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Reachable while signed out: invitation and reset links land here. */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<AuthGate>{(me) => <Console me={me} />}</AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}
