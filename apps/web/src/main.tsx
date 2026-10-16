import '@fontsource-variable/fraunces';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/noto-sans-devanagari';
import './index.css';
import './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { applyTheme, useTheme } from './lib/theme';
import { registerServiceWorker } from './lib/pwa';

applyTheme(useTheme.getState().theme);
registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
