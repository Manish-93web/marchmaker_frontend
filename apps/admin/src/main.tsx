import '@fontsource-variable/fraunces';
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, useTheme } from './lib/theme';
import { Sentry, initSentry } from './lib/sentry';
import { CrashPage } from './components/CrashPage';

initSentry('admin');
applyTheme(useTheme.getState().theme);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashPage />}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
