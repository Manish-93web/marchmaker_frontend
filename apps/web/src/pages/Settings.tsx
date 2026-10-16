import { InstallCard } from '../components/extras/InstallCard';
import { PhoneChange } from '../components/PhoneChange';
import { Banner, Button, Card, Input } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, ApiRequestError } from '../lib/api';
import { ME_KEY, useMe } from '../lib/auth';

interface SessionRow {
  id: string;
  current: boolean;
  userAgent: string | null;
  lastSeenAt: string;
}

const msg = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

export function Settings() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const refreshMe = () => qc.invalidateQueries({ queryKey: ME_KEY });
  const fail = (e: unknown) => toast.error(msg(e, t('common.somethingWrong')));

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api<{ items: SessionRow[] }>('/auth/sessions'),
  });

  const [name, setName] = useState(me?.firstName ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const saveProfile = useMutation({
    mutationFn: () => api('/account', { method: 'PATCH', body: { firstName: name } }),
    onSuccess: () => {
      toast.success(t('settings.saved'));
      void refreshMe();
    },
    onError: fail,
  });
  const changePassword = useMutation({
    mutationFn: () => api('/account', { method: 'PATCH', body: { currentPassword: current, newPassword: next } }),
    onSuccess: () => {
      toast.success(t('settings.saved'));
      setCurrent('');
      setNext('');
      void qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: fail,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: fail,
  });
  const logoutAll = useMutation({
    mutationFn: () => api('/auth/logout-all', { method: 'POST' }),
    onSuccess: () => qc.setQueryData(ME_KEY, null),
    onError: fail,
  });
  const consent = useMutation({
    mutationFn: (v: { purpose: string; granted: boolean }) => api('/account/consents', { method: 'POST', body: v }),
    onSuccess: () => void refreshMe(),
    onError: fail,
  });
  const pause = useMutation({
    mutationFn: (paused: boolean) => api(paused ? '/account/resume' : '/account/pause', { method: 'POST' }),
    onSuccess: () => void refreshMe(),
    onError: fail,
  });
  const exportData = useMutation({
    mutationFn: () => api('/account/export', { method: 'POST' }),
    onSuccess: () => toast.success(t('settings.exportRequested')),
    onError: fail,
  });
  const del = useMutation({
    mutationFn: () => api('/account/delete', { method: 'POST', body: { confirm: 'DELETE', password: deletePassword || undefined } }),
    onSuccess: () => qc.setQueryData(ME_KEY, null),
    onError: fail,
  });

  if (!me) return null;
  const paused = me.status === 'paused';

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <h1 className="font-display text-2xl text-primary">{t('settings.title')}</h1>
      <InstallCard />
      <PhoneChange masked={me.phoneMasked} verified={me.phoneVerified} />

      <Card className="space-y-4">
        <h2 className="font-medium">{t('settings.account')}</h2>
        <Input label={t('settings.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Button loading={saveProfile.isPending} disabled={!name.trim() || name === me.firstName} onClick={() => saveProfile.mutate()}>
          {t('common.save')}
        </Button>
      </Card>

      {me.hasPassword && (
        <Card className="space-y-4">
          <h2 className="font-medium">{t('settings.changePassword')}</h2>
          <Input label={t('settings.currentPassword')} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input label={t('settings.newPassword')} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Button loading={changePassword.isPending} disabled={!current || next.length < 10} onClick={() => changePassword.mutate()}>
            {t('common.save')}
          </Button>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-medium">{t('settings.sessions')}</h2>
        {sessions.isLoading && <p>{t('common.loading')}</p>}
        {sessions.isError && <Banner tone="danger">{t('common.somethingWrong')}</Banner>}
        <ul className="divide-y divide-border">
          {sessions.data?.items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-muted">
                  {s.current ? `${t('settings.thisDevice')} · ` : ''}
                  {new Date(s.lastSeenAt).toLocaleString('en-IN')}
                </p>
              </div>
              {!s.current && (
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(s.id)}>
                  {t('settings.signOutDevice')}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <Button variant="outline" loading={logoutAll.isPending} onClick={() => logoutAll.mutate()}>
          {t('settings.signOutAll')}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{t('settings.privacy')}</h2>
        {(
          [
            ['analytics', t('settings.analytics')],
            ['marketing_email', t('settings.marketing')],
          ] as const
        ).map(([purpose, label]) => (
          <label key={purpose} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={me.consents[purpose]?.granted ?? false}
              onChange={(e) => consent.mutate({ purpose, granted: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{paused ? t('settings.resume') : t('settings.pause')}</h2>
        <p className="text-sm text-muted">{t('settings.pauseBody')}</p>
        <Button variant="outline" loading={pause.isPending} onClick={() => pause.mutate(paused)}>
          {paused ? t('settings.resume') : t('settings.pause')}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium">{t('settings.export')}</h2>
        <p className="text-sm text-muted">{t('settings.exportBody')}</p>
        <Button variant="outline" loading={exportData.isPending} onClick={() => exportData.mutate()}>
          {t('settings.export')}
        </Button>
      </Card>

      <Card className="space-y-3 border-danger">
        <h2 className="font-medium text-danger">{t('settings.delete')}</h2>
        <p className="text-sm text-muted">{t('settings.deleteBody')}</p>
        {me.hasPassword && (
          <Input label={t('settings.currentPassword')} type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
        )}
        <Input label={t('settings.deleteConfirm')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button variant="destructive" loading={del.isPending} disabled={confirm !== 'DELETE'} onClick={() => del.mutate()}>
          {t('settings.delete')}
        </Button>
      </Card>
    </div>
  );
}
