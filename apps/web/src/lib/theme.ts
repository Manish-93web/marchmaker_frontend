import { create } from 'zustand';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'mm_theme';

/** Light unless the person chose dark. The operating system's setting is deliberately not followed by default. */
function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

interface ThemeState {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: read(),
  setTheme: (theme) => {
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable: the choice still applies for this session */
    }
    applyTheme(theme);
    set({ theme });
    // Signed-in members keep the choice on every device. Fire and forget: the browser copy already applies.
    void import('./api').then(({ api }) => api('/account', { method: 'PATCH', body: { theme } }).catch(() => undefined));
  },
}));

/** Used once after sign-in: adopt the account's saved choice without writing it back. */
export function adoptAccountTheme(choice: ThemeChoice | undefined): void {
  // An account that never picked a theme reports 'system'; that must not override the light default.
  if (!choice || choice === 'system' || choice === useTheme.getState().theme) return;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage unavailable */
  }
  applyTheme(choice);
  useTheme.setState({ theme: choice });
}
