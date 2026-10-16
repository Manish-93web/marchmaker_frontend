import { birthDetailsSchema } from '@marchmaker/shared';
import { Banner, Button, Card, Input, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';
import { useFlag } from '../../lib/flags';

interface Status {
  available: boolean;
  consent: boolean;
  hasDetails: boolean;
  place: string | null;
  shareWithMatches: boolean;
  disclaimer: string;
}
interface Report {
  sample: boolean;
  chart: { sunSign: string; moonSign: string; ascendant: string; nakshatra: string; highlights: string[] };
  disclaimer: string;
}

export function Astrology() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const on = useFlag('astrology');
  const status = useQuery({ queryKey: ['astro'], enabled: on, queryFn: () => api<Status>('/astrology') });
  const report = useQuery({
    queryKey: ['astro', 'report'],
    enabled: on && !!status.data?.hasDetails && !!status.data?.consent,
    retry: 0,
    queryFn: () => api<Report>('/astrology/report'),
  });
  const [form, setForm] = useState({ time: '', place: '', latitude: '', longitude: '', share: false });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['astro'] });
  const fail = (e: unknown) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
  const consent = useMutation({
    mutationFn: () => api('/account/consents', { method: 'POST', body: { purpose: 'astrology', granted: true } }),
    onSuccess: refresh,
    onError: fail,
  });
  const save = useMutation({
    mutationFn: (body: unknown) => api('/astrology/details', { method: 'PUT', body }),
    onSuccess: () => {
      setError(null);
      setMessage(t('x.astro.saved'));
      void refresh();
    },
    onError: fail,
  });
  const erase = useMutation({
    mutationFn: () => api('/astrology', { method: 'DELETE' }),
    onSuccess: () => {
      setMessage(t('x.astro.deleted'));
      void refresh();
    },
    onError: fail,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = birthDetailsSchema.safeParse({
      time: form.time,
      place: form.place,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.somethingWrong'));
      return;
    }
    setError(null);
    save.mutate({ ...parsed.data, shareWithMatches: form.share });
  };

  if (!on) {
    return (
      <div className="container py-10">
        <Banner tone="info">{t('x.astro.unavailable')}</Banner>
      </div>
    );
  }
  if (status.isLoading) {
    return (
      <div className="container py-10" aria-busy="true">
        <Skeleton className="h-64" />
      </div>
    );
  }
  const s = status.data;

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('x.astro.title')}</h1>
        <p className="mt-1 text-muted">{t('x.astro.intro')}</p>
      </header>
      {status.isError && <Banner tone="warning">{status.error instanceof ApiRequestError ? status.error.message : t('x.astro.unavailable')}</Banner>}

      {s && !s.consent && (
        <Card className="space-y-3">
          <p>{t('x.astro.consent')}</p>
          <Button loading={consent.isPending} onClick={() => consent.mutate()}>
            {t('x.astro.consentSave')}
          </Button>
        </Card>
      )}

      {s?.consent && (
        <Card>
          <h2 className="font-display text-xl">{t('x.astro.detailsTitle')}</h2>
          {s.hasDetails && <p className="mt-1 text-sm text-muted">{s.place}</p>}
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
            <Input label={t('x.astro.time')} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="06:45" />
            <Input label={t('x.astro.place')} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            <Input label={t('x.astro.lat')} inputMode="decimal" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <Input label={t('x.astro.lon')} inputMode="decimal" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={form.share} onChange={(e) => setForm({ ...form, share: e.target.checked })} />
              {t('x.astro.share')}
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" loading={save.isPending}>
                {t('x.astro.save')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {report.isError && report.error instanceof ApiRequestError && report.error.code === 'PREMIUM_ONLY' && <Banner tone="info">{t('x.astro.premium')}</Banner>}

      {report.data && (
        <Card className="space-y-3">
          <h2 className="font-display text-xl">{t('x.astro.report')}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {(
              [
                ['sun', report.data.chart.sunSign],
                ['moon', report.data.chart.moonSign],
                ['asc', report.data.chart.ascendant],
                ['nak', report.data.chart.nakshatra],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{t(`x.astro.${k}`)}</dt>
                <dd className="text-lg">{v}</dd>
              </div>
            ))}
          </dl>
          {report.data.sample && <Banner tone="warning">{t('x.astro.sample')}</Banner>}
          <p className="text-xs text-muted">{report.data.disclaimer}</p>
        </Card>
      )}

      {s?.hasDetails && (
        <Button variant="ghost" loading={erase.isPending} onClick={() => erase.mutate()}>
          {t('x.astro.delete')}
        </Button>
      )}
    </div>
  );
}
