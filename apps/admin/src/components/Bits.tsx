import { Button } from '@marchmaker/ui';
import { useState, type ReactNode } from 'react';

export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');
export const inputCls = 'mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3';
export const areaCls = 'mt-1 min-h-[96px] w-full rounded-card border border-border bg-surface p-3';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full space-y-4 overflow-y-auto rounded-hero bg-surface p-6 shadow-lg ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <h2 className="font-display text-xl text-primary">{title}</h2>
        {children}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Accessible tab strip: arrow keys move between tabs, the panel is labelled by the active tab. */
export function Tabs({ tabs, initial }: { tabs: { id: string; label: string; render: () => ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]!.id);
  const idx = tabs.findIndex((t) => t.id === active);
  return (
    <div>
      <div role="tablist" aria-label="Sections" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setActive(tabs[(i + 1) % tabs.length]!.id);
              if (e.key === 'ArrowLeft') setActive(tabs[(i - 1 + tabs.length) % tabs.length]!.id);
            }}
            className={`min-h-[44px] px-4 text-sm font-medium ${t.id === active ? 'border-b-2 border-primary text-primary' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {tabs[idx]?.render()}
      </div>
    </div>
  );
}

export function PageTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <header className="mb-4">
      <h1 className="font-display text-2xl text-primary">{children}</h1>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </header>
  );
}
