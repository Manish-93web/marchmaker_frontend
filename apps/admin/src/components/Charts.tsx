import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLOR = 'var(--color-primary, #4A1D3F)';

/** Screen readers get the numbers as text; the drawing itself is hidden from them. */
function Summary({ label, points }: { label: string; points: { label: string; value: number }[] }) {
  return (
    <p className="sr-only">
      {label}: {points.length ? points.map((p) => `${p.label} ${p.value}`).join(', ') : 'no data'}
    </p>
  );
}

export function TrendChart({ points, label, format = (n: number) => String(n) }: { points: { label: string; value: number }[]; label: string; format?: (n: number) => string }) {
  if (points.length < 2) return <p className="text-sm text-muted">Not enough days yet.</p>;
  return (
    <>
      <Summary label={label} points={points} />
      <div role="img" aria-label={label} className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={120}>
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={format} />
            <Tooltip formatter={(v) => format(Number(v))} />
            <Area type="monotone" dataKey="value" stroke={COLOR} fill={COLOR} fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function BarsChart({ points, label }: { points: { label: string; value: number }[]; label: string }) {
  if (!points.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <>
      <Summary label={label} points={points} />
      <div role="img" aria-label={label} className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={120}>
          <BarChart data={points} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="value" fill={COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
