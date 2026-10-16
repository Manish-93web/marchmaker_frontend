import { formatInr } from '@marchmaker/shared';
import { Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface ReferralView {
  enabled: boolean;
  code: string | null;
  link: string | null;
  rules: { referrerRewardPaise: number; refereeRewardPaise: number; minPurchasePaise: number; holdDays: number; maxRewardsPerReferrer: number };
  wallet: { balancePaise: number };
  stats: { joined: number; inProgress: number; rewarded: number; earnedPaise: number };
  invited: { name: string; state: 'joined' | 'in_progress' | 'rewarded'; at: string }[];
  mine: { state: 'joined' | 'in_progress' | 'rewarded'; rewardPaise: number } | null;
}
interface WalletView {
  balancePaise: number;
  entries: { id: string; type: 'reward' | 'spend' | 'release' | 'adjust'; deltaPaise: number; balanceAfterPaise: number; reason: string | null; at: string }[];
}

const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function Referrals() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const q = useQuery({ queryKey: ['referrals'], queryFn: () => api<ReferralView>('/referrals') });
  const w = useQuery({ queryKey: ['wallet'], queryFn: () => api<WalletView>('/wallet') });

  if (q.isLoading) {
    return (
      <div className="container py-10" aria-busy="true">
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="container py-10">
        <Banner tone="danger">{t('r.loadError')}</Banner>
      </div>
    );
  }
  const v = q.data;
  const copy = async () => {
    if (!v.link) return;
    try {
      await navigator.clipboard.writeText(v.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is visible to copy by hand.
    }
  };
  const share = v.link ? `https://wa.me/?text=${encodeURIComponent(`${t('r.shareText')} ${v.link}`)}` : null;
  const how = t('r.how', {
    returnObjects: true,
    min: formatInr(v.rules.minPurchasePaise),
    days: v.rules.holdDays,
    you: formatInr(v.rules.referrerRewardPaise),
    them: formatInr(v.rules.refereeRewardPaise),
  }) as unknown as string[];

  return (
    <div className="container max-w-3xl space-y-8 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('r.title')}</h1>
        <p className="mt-1 text-muted">{t('r.intro')}</p>
      </header>

      {v.mine && (
        <Banner tone="info">
          {v.mine.state === 'rewarded' ? t('r.mineDone') : t('r.mine', { amount: formatInr(v.mine.rewardPaise) })}
        </Banner>
      )}
      {!v.enabled && <Banner tone="warning">{t('r.disabled')}</Banner>}

      {v.enabled && v.link && (
        <Card>
          <h2 className="font-display text-xl">{t('r.yourLink')}</h2>
          <p className="mt-2 break-all rounded-card bg-surface-2 p-3 text-sm" data-testid="invite-link">
            {v.link}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t('r.yourCode')}: <strong>{v.code}</strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copy()}>
              {copied ? t('r.copied') : t('r.copy')}
            </Button>
            {share && (
              <a href={share} target="_blank" rel="noopener noreferrer">
                <Button>{t('r.shareWhatsApp')}</Button>
              </a>
            )}
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? t('r.copied') : ''}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-xl">{t('r.howTitle')}</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          {how.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">{t('r.limits', { max: v.rules.maxRewardsPerReferrer })}</p>
      </Card>

      <section aria-labelledby="stats-h" className="space-y-3">
        <h2 id="stats-h" className="font-display text-xl">
          {t('r.statsTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['joined', String(v.stats.joined)],
              ['inProgress', String(v.stats.inProgress)],
              ['rewarded', String(v.stats.rewarded)],
              ['earned', formatInr(v.stats.earnedPaise)],
            ] as const
          ).map(([k, val]) => (
            <div key={k} className="rounded-card border border-border p-3">
              <dt className="text-xs text-muted">{t(`r.stats.${k}`)}</dt>
              <dd className="font-display text-2xl">{val}</dd>
            </div>
          ))}
        </dl>
        {v.invited.length === 0 ? (
          <p className="text-muted">{t('r.noneYet')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border">
            {v.invited.map((i, idx) => (
              <li key={idx} className="flex justify-between p-3 text-sm">
                <span>{i.name}</span>
                <span className="text-muted">
                  {t(`r.state.${i.state}`)} · {when(i.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="wallet-h" className="space-y-3">
        <h2 id="wallet-h" className="font-display text-xl">
          {t('r.walletTitle')}
        </h2>
        <p className="text-lg">{t('r.balance', { amount: formatInr(v.wallet.balancePaise) })}</p>
        <p className="text-sm text-muted">
          {t('r.walletUse')}{' '}
          <Link to="/billing" className="underline">
            Billing
          </Link>
        </p>
        {w.data && w.data.entries.length === 0 && <p className="text-muted">{t('r.walletEmpty')}</p>}
        <ul className="divide-y divide-border rounded-card border border-border">
          {w.data?.entries.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
              <span>
                {t(`r.entry.${e.type}`)}
                {e.reason ? <span className="ml-2 text-muted">{e.reason}</span> : null}
              </span>
              <span className={e.deltaPaise < 0 ? 'text-muted' : 'text-success'}>
                {e.deltaPaise < 0 ? '−' : '+'}
                {formatInr(Math.abs(e.deltaPaise))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
