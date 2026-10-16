import { create } from 'zustand';

const KEY = 'mm_consent';
const VERSION = 1;

export interface ConsentChoice {
  analytics: boolean;
  decidedAt: string;
  version: number;
}

function read(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ConsentChoice;
    return v.version === VERSION ? v : null;
  } catch {
    return null;
  }
}

interface ConsentState {
  choice: ConsentChoice | null;
  /** Banner visibility: shown until a choice exists, and again when reopened from the footer. */
  open: boolean;
  hydrate: () => void;
  decide: (analytics: boolean) => ConsentChoice;
  reopen: () => void;
}

export const useConsent = create<ConsentState>((set) => ({
  choice: null,
  open: false,
  hydrate: () => {
    const choice = read();
    set({ choice, open: choice === null });
  },
  decide: (analytics) => {
    const choice: ConsentChoice = { analytics, decidedAt: new Date().toISOString(), version: VERSION };
    try {
      localStorage.setItem(KEY, JSON.stringify(choice));
    } catch {
      /* storage blocked: the choice applies for this page view only */
    }
    set({ choice, open: false });
    return choice;
  },
  reopen: () => set({ open: true }),
}));

/** Analytics code must call this before sending anything (PostHog is wired in Phase 14). */
export const analyticsAllowed = () => useConsent.getState().choice?.analytics === true;
