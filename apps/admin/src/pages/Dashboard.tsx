import { Banner, Card, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface DashboardData {
  members: number;
  signups7d: number;
  queues: { profiles: number; photos: number; verifications: number; verificationsNeedingReview: number };
  oldestProfileWaitingHours: number | null;
  restricted: number;
  activeSessions15m: number;
}

function Tile({ label, value, to, note }: { label: string; value: number | string; to?: string; note?: string }) {
  const body = (
    <Card className="h-full">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl text-primary">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-card focus-visible:outline-offset-4">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Dashboard() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardData>('/admin/dashboard'), refetchInterval: 60_000 });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-primary">Dashboard</h1>
      {q.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.data && (
        <>
          <section aria-label="Queues" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Profiles awaiting review"
              value={q.data.queues.profiles}
              to="/profiles"
              note={q.data.oldestProfileWaitingHours !== null ? `Oldest waiting ${q.data.oldestProfileWaitingHours} h` : undefined}
            />
            <Tile label="Photos awaiting review" value={q.data.queues.photos} to="/photos" />
            <Tile label="Verifications waiting" value={q.data.queues.verifications} to="/verification" />
            <Tile label="Needing a person's judgement" value={q.data.queues.verificationsNeedingReview} to="/verification" />
          </section>
          <section aria-label="Members" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Members" value={q.data.members} to="/members" />
            <Tile label="New in the last 7 days" value={q.data.signups7d} />
            <Tile label="Suspended or banned" value={q.data.restricted} to="/members?status=suspended" />
            <Tile label="Active sessions (15 min)" value={q.data.activeSessions15m} />
          </section>
        </>
      )}
    </div>
  );
}
