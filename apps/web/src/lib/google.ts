/** The slice of Google Identity Services this app uses. */
export interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; use_fedcm_for_prompt?: boolean }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let loading: Promise<GoogleIdentity> | null = null;

/** Loads Google's script once; the promise is dropped on failure so a later attempt can retry. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google script missing')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Google script failed to load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}
