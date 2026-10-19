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
  },
}));
