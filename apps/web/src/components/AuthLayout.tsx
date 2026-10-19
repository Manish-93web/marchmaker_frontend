import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthArt } from '@marchmaker/ui';

/** Split layout: form on one side, an emotional quote panel on the other (hidden on small screens). */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="font-display text-2xl text-primary">{title}</h1>
            {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
      <aside aria-hidden className="relative hidden items-end overflow-hidden p-12 text-white lg:flex">
        <AuthArt />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative max-w-md">
          <p className="font-display text-3xl leading-snug">{t('auth.quote')}</p>
          <p className="mt-4 text-sm text-white/80">{t('auth.quoteSub')}</p>
          <Link to="/" tabIndex={-1} className="sr-only">
            Home
          </Link>
        </div>
      </aside>
    </div>
  );
}
