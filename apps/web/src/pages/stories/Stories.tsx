import { storySubmitSchema } from '@marchmaker/shared';
import { Banner, Button, Card, Input, Textarea } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';

interface Story {
  id: string;
  coupleNames: string;
  city: string | null;
  quote: string;
  status: 'submitted' | 'published' | 'rejected';
  note: string | null;
}

export function Stories() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ['stories', 'mine'], queryFn: () => api<{ items: Story[] }>('/stories/mine') });
  const [names, setNames] = useState('');
  const [city, setCity] = useState('');
  const [quote, setQuote] = useState('');
  const [consent, setConsent] = useState(false);
  const [partner, setPartner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['stories'] });
  const send = useMutation({
    mutationFn: (body: unknown) => api('/stories', { method: 'POST', body }),
    onSuccess: () => {
      setSent(true);
      void refresh();
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });
  const withdraw = useMutation({ mutationFn: (id: string) => api(`/stories/${id}/withdraw`, { method: 'POST' }), onSuccess: refresh });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = storySubmitSchema.safeParse({ coupleNames: names, city: city || undefined, quote, consent, partnerConsent: partner });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.somethingWrong'));
      return;
    }
    setError(null);
    send.mutate(parsed.data);
  };

  const existing = mine.data?.items ?? [];
  const open = existing.some((s) => s.status === 'submitted' || s.status === 'published');

  return (
    <div className="container max-w-2xl space-y-8 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('g.stories.title')}</h1>
        <p className="mt-1 text-muted">{t('g.stories.intro')}</p>
      </header>

      {existing.length > 0 && (
        <section aria-labelledby="your-story" className="space-y-3">
          <h2 id="your-story" className="font-display text-xl">
            {t('g.stories.yours')}
          </h2>
          {existing.map((s) => (
            <Card key={s.id}>
              <p className="font-medium">{s.coupleNames}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{s.quote}</p>
              <p className="mt-2 text-sm text-muted">{t(`g.stories.status.${s.status}`)}</p>
              {s.note && <p className="mt-1 text-sm">{s.note}</p>}
              {s.status !== 'rejected' && (
                <Button className="mt-3" size="sm" variant="outline" loading={withdraw.isPending} onClick={() => withdraw.mutate(s.id)}>
                  {t('g.stories.withdraw')}
                </Button>
              )}
            </Card>
          ))}
        </section>
      )}

      {sent && <Banner tone="success">{t('g.stories.sent')}</Banner>}

      {!open && !sent && (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Input label={t('g.stories.names')} value={names} onChange={(e) => setNames(e.target.value)} maxLength={80} />
          <Input label={t('g.stories.city')} value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
          <Textarea label={t('g.stories.quote')} value={quote} onChange={(e) => setQuote(e.target.value)} rows={6} maxLength={600} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t('g.stories.consent')}
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={partner} onChange={(e) => setPartner(e.target.checked)} />
            {t('g.stories.partner')}
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={send.isPending}>
            {t('g.stories.send')}
          </Button>
        </form>
      )}
    </div>
  );
}
