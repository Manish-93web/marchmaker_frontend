import { Banner, Card, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface View {
  readOnly: true;
  me: { firstName: string; journeyState: string; status: string; emailVerified: boolean; plan: { planCode: string } };
  profile: { status: string; data: Record<string, Record<string, unknown>> };
  photos: { id: string; status: string; sm: string | null }[];
  assessmentsCompleted: { key: string }[];
}

/** Read-only mirror of the member's own view. Opening it is logged. */
export function ViewAsMember() {
  const { id = '' } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['as-member', id],
    queryFn: () => api<View>(`/admin/members/${id}/as-member`),
    staleTime: Infinity,
    gcTime: 0,
  });
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const v = q.data;
  return (
    <div className="space-y-4">
      <Banner tone="warning">
        Read-only view. This access has been recorded in the audit log.{' '}
        <Link to={`/members/${id}`} className="underline">
          Back to member
        </Link>
      </Banner>
      <h1 className="font-display text-2xl text-primary">{v.me.firstName}&apos;s view</h1>
      <Card>
        <p className="text-sm">
          Journey: {v.me.journeyState.replace(/_/g, ' ')} · Account: {v.me.status} · Plan: {v.me.plan.planCode} · Profile:{' '}
          {v.profile.status.replace('_', ' ')}
        </p>
        <p className="mt-2 text-sm text-muted">Assessments completed: {v.assessmentsCompleted.map((a) => a.key).join(', ') || 'none'}</p>
      </Card>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {v.photos.map((p) =>
          p.sm ? <img key={p.id} src={p.sm} alt="" className="aspect-[3/4] rounded-card object-cover" /> : null,
        )}
      </div>
    </div>
  );
}
