import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
      <aside
        aria-hidden
        className="relative hidden items-end overflow-hidden bg-primary p-12 text-primary-fg lg:flex"
        style={{
          backgroundImage:
            'radial-gradient(70% 60% at 80% 0%, rgb(242 163 58 / 0.35), transparent), radial-gradient(60% 60% at 0% 100%, rgb(226 114 91 / 0.3), transparent)',
        }}
      >
        <div className="max-w-md">
          <p className="font-display text-2xl leading-snug">{t('auth.quote')}</p>
          <p className="mt-4 text-sm opacity-80">{t('auth.quoteSub')}</p>
          <Link to="/" tabIndex={-1} className="sr-only">
            Home
          </Link>
        </div>
      </aside>
    </div>
  );
}
