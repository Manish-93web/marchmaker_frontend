import { ROLES, STAFF_ROLES, type Role } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Chip, Input } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface StaffRow {
  id: string;
  firstName: string;
  email: string | null;
  roles: Role[];
  status: string;
  twoFactorEnabled: boolean;
}

export function Team() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['staff'], queryFn: () => api<{ items: StaffRow[] }>('/admin/staff') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff'] });
  const [form, setForm] = useState({ email: '', firstName: '' });
  const [roles, setRoles] = useState<Role[]>(['support_agent']);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Role[]>([]);

  const invite = useMutation({
    mutationFn: () => api('/admin/staff', { method: 'POST', body: { ...form, roles } }),
    onSuccess: () => {
      setForm({ email: '', firstName: '' });
      void refresh();
    },
  });
  const saveRoles = useMutation({
    mutationFn: (id: string) => api(`/admin/staff/${id}/roles`, { method: 'PUT', body: { roles: draft } }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const active = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => api(`/admin/staff/${id}/active`, { method: 'POST', body: { active: on } }),
    onSuccess: refresh,
  });

  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const reset2fa = useMutation({
    mutationFn: (id: string) => api(`/admin/staff/${id}/reset-2fa`, { method: 'POST' }),
    onSuccess: () => {
      setConfirmReset(null);
      void refresh();
    },
  });

  const toggle = (list: Role[], r: Role) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]);
  const assignable = ROLES.filter((r) => r !== 'member') as Role[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-primary">Team</h1>

      <Card className="space-y-4">
        <h2 className="font-medium">Invite a team member</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Roles">
          {assignable.map((r) => (
            <Chip key={r} selected={roles.includes(r)} onClick={() => setRoles((l) => toggle(l, r))}>
              {r.replace('_', ' ')}
            </Chip>
          ))}
        </div>
        {invite.isError && <Banner tone="danger">{errorMessage(invite.error)}</Banner>}
        {invite.isSuccess && <Banner tone="success">Invitation sent. The link works once for 48 hours.</Banner>}
        <Button
          loading={invite.isPending}
          disabled={!form.email || !form.firstName || roles.length === 0}
          onClick={() => invite.mutate()}
        >
          Send invitation
        </Button>
      </Card>

      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {(saveRoles.isError || active.isError || reset2fa.isError) && (
        <Banner tone="danger">{errorMessage(saveRoles.error ?? active.error ?? reset2fa.error)}</Banner>
      )}
      <ul className="space-y-3">
        {q.data?.items.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {s.firstName} <span className="font-normal text-muted">{s.email}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-2 text-sm">
                  {editing === s.id ? (
                    STAFF_ROLES.map((r) => (
                      <Chip key={r} selected={draft.includes(r)} onClick={() => setDraft((d) => toggle(d, r))}>
                        {r.replace('_', ' ')}
                      </Chip>
                    ))
                  ) : (
                    s.roles.map((r) => <Badge key={r}>{r.replace('_', ' ')}</Badge>)
                  )}
                  <Badge tone={s.twoFactorEnabled ? 'verified' : 'danger'}>{s.twoFactorEnabled ? '2FA on' : '2FA not set up'}</Badge>
                  {s.status !== 'active' && <Badge tone="danger">{s.status}</Badge>}
                </p>
              </div>
              <div className="flex gap-2">
                {editing === s.id ? (
                  <>
                    <Button size="sm" loading={saveRoles.isPending} disabled={draft.length === 0} onClick={() => saveRoles.mutate(s.id)}>
                      Save roles
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(s.id);
                        setDraft(s.roles);
                      }}
                    >
                      Edit roles
                    </Button>
                    {confirmReset === s.id ? (
                      <>
                        <Button size="sm" variant="destructive" loading={reset2fa.isPending} onClick={() => reset2fa.mutate(s.id)}>
                          Yes, reset sign-in
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmReset(null)}>
                          Keep it
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmReset(s.id)}>
                        Reset 2FA
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={s.status === 'active' ? 'destructive' : 'primary'}
                      onClick={() => active.mutate({ id: s.id, on: s.status !== 'active' })}
                    >
                      {s.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
