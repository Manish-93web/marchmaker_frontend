import { Button } from '@marchmaker/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  ClipboardCheck,
  Flag,
  History,
  LayoutDashboard,
  ListChecks,
  Moon,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
  BookOpen,
  Search,
  Sliders,
  Heart,
  CreditCard,
  ShieldAlert,
  Gavel,
  LifeBuoy,
  Repeat,
  Webhook,
  Tag,
  Layers,
  Gift,
  BarChart3,
  FlaskConical,
  Quote,
  Headphones,
  Activity,
  Bell,
  FileText,
  HelpCircle,
  Receipt,
  Radar,
  Database,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { STAFF_KEY, can, type StaffMe } from '../lib/session';
import { applyTheme, useTheme } from '../lib/theme';
import { CommandPalette, type Command } from './CommandPalette';

interface NavItem {
  to: string;
  label: string;
  perm: string;
  icon: ComponentType<{ className?: string }>;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', perm: 'metrics.view', icon: LayoutDashboard },
  { to: '/insights', label: 'Insights', perm: 'metrics.view', icon: BarChart3 },
  { to: '/members', label: 'Members', perm: 'member.search', icon: Users },
  { to: '/profiles', label: 'Profile review', perm: 'profile.review', icon: ClipboardCheck },
  { to: '/photos', label: 'Photo review', perm: 'photo.review', icon: Camera },
  { to: '/matches', label: 'Match review', perm: 'match.review', icon: Heart },
  { to: '/verification', label: 'Verification', perm: 'verification.view_evidence', icon: ShieldCheck },
  { to: '/introductions', label: 'Introductions monitor', perm: 'introduction.view', icon: Radar },
  { to: '/moderation', label: 'Moderation', perm: 'moderation.view', icon: ShieldAlert },
  { to: '/appeals', label: 'Appeals', perm: 'moderation.view', icon: Gavel },
  { to: '/support', label: 'Support inbox', perm: 'support.view', icon: LifeBuoy },
  { to: '/referrals', label: 'Referrals', perm: 'wallet.adjust', icon: Gift },
  { to: '/payments', label: 'Payments', perm: 'payment.view', icon: CreditCard },
  { to: '/subscriptions', label: 'Subscriptions', perm: 'payment.view', icon: Repeat },
  { to: '/webhooks', label: 'Payment webhooks', perm: 'payment.view', icon: Webhook },
  { to: '/invoices', label: 'Invoices', perm: 'payment.view', icon: Receipt },
  { to: '/coupons', label: 'Coupons', perm: 'coupon.manage', icon: Tag },
  { to: '/plans', label: 'Plans and packs', perm: 'plan.manage', icon: Layers },
  { to: '/audit', label: 'Audit log', perm: 'audit.view', icon: History },
  { to: '/assessments', label: 'Question banks', perm: 'content.manage', icon: BookOpen },
  { to: '/team', label: 'Team', perm: 'admin_users.manage', icon: UserCog },
  { to: '/roles', label: 'Roles and permissions', perm: 'roles.manage', icon: ListChecks },
  { to: '/experiments', label: 'Experiments', perm: 'flags.manage', icon: FlaskConical },
  { to: '/guides', label: 'E-guides', perm: 'content.manage', icon: Headphones },
  { to: '/stories', label: 'Success stories', perm: 'content.manage', icon: Quote },
  { to: '/legal', label: 'Legal documents', perm: 'legal.manage', icon: FileText },
  { to: '/faqs', label: 'FAQ', perm: 'content.manage', icon: HelpCircle },
  { to: '/notifications', label: 'Notifications', perm: 'settings.manage', icon: Bell },
  { to: '/jobs', label: 'Jobs and providers', perm: 'jobs.manage', icon: Activity },
  { to: '/data-requests', label: 'Data requests', perm: 'data_requests.approve', icon: Database },
  { to: '/operations', label: 'Operations settings', perm: 'settings.manage', icon: Sliders },
  { to: '/flags', label: 'Feature flags', perm: 'flags.manage', icon: Flag },
  { to: '/settings', label: 'Matching settings', perm: 'settings.manage', icon: Sliders },
];

export function Shell({ me }: { me: StaffMe }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [palette, setPalette] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const items = NAV.filter((n) => can(me, n.perm));
  const dark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => applyTheme(theme), [theme]);

  // With a long menu, keep the page you are on in view without moving the rest of the screen.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  // Cmd/Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands: Command[] = useMemo(
    () => items.map((n) => ({ id: n.to, label: `Go to ${n.label}`, run: () => nav(n.to) })),
    [items, nav],
  );

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await qc.invalidateQueries({ queryKey: STAFF_KEY });
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        Skip to content
      </a>
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex shrink-0 items-center justify-between px-4 py-3 lg:block">
          <p className="font-display text-xl text-primary">Marchmaker</p>
          <p className="hidden text-xs text-muted lg:block">Admin console</p>
        </div>
        <nav ref={navRef} aria-label="Console" className="thin-scroll flex gap-1 overflow-x-auto px-2 pb-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-4">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[40px] shrink-0 items-center gap-2 rounded-card px-3 text-sm ${
                  isActive ? 'bg-surface-2 font-medium text-primary' : 'text-ink hover:bg-surface-2'
                }`
              }
            >
              <n.icon className="h-4 w-4" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-2 backdrop-blur">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-border px-4 text-sm text-muted hover:bg-surface-2"
          >
            <Search className="h-4 w-4" aria-hidden /> Search or jump to…
            <kbd className="ml-2 rounded border border-border px-1.5 text-xs">⌘K</kbd>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">
              {me.firstName} · {me.roles.map((r) => r.replace('_', ' ')).join(', ')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
            >
              {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>
        <main id="content" className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette commands={commands} open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
