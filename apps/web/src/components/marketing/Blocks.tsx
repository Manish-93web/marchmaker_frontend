import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@marchmaker/ui';

/** Staggered scroll reveal that respects prefers-reduced-motion. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.25, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

export function Section({
  title,
  subtitle,
  children,
  id,
  tone = 'plain',
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
  tone?: 'plain' | 'soft';
  className?: string;
}) {
  return (
    <section id={id} className={cn('py-14 sm:py-20', tone === 'soft' && 'bg-surface-2', className)} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="container">
        {title && (
          <Reveal className="mb-8 max-w-2xl sm:mb-12">
            <h2 id={id ? `${id}-h` : undefined} className="font-display text-2xl text-primary">
              {title}
            </h2>
            {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="border-b border-border bg-surface-2 py-12 sm:py-16">
      <div className="container max-w-3xl">
        <h1 className="font-display text-3xl text-primary">{title}</h1>
        {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      </div>
    </header>
  );
}

/** Native <details> keeps the accordion keyboard- and screen-reader-accessible without JS. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
            {it.q}
            <span aria-hidden className="text-accent transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
