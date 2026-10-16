import { Button, Dialog, Tabs as UiTabs } from '@marchmaker/ui';
import type { ReactNode } from 'react';

export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');
export const inputCls = 'mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3';
export const areaCls = 'mt-1 min-h-[96px] w-full rounded-card border border-border bg-surface p-3';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={title} size={wide ? 'lg' : 'md'} sheet={false}>
      {children}
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}

/** Tabs from the shared UI package: arrow keys move between them and only the active panel is rendered. */
export function Tabs({ tabs, initial }: { tabs: { id: string; label: string; render: () => ReactNode }[]; initial?: string }) {
  return <UiTabs label="Sections" defaultValue={initial ?? tabs[0]!.id} items={tabs.map((t) => ({ value: t.id, label: t.label, content: t.render() }))} />;
}

export function PageTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <header className="mb-4">
      <h1 className="font-display text-2xl text-primary">{children}</h1>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </header>
  );
}
