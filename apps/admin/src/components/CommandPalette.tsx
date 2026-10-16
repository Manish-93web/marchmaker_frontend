import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** Cmd/Ctrl+K palette: jump anywhere, or search members for whatever you type. */
export function CommandPalette({ commands, open, onClose }: { commands: Command[]; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = commands.filter((c) => !needle || c.label.toLowerCase().includes(needle));
    if (!needle) return matches;
    return [
      ...matches,
      {
        id: 'search-members',
        label: `Search members for “${q.trim()}”`,
        hint: 'Members',
        run: () => nav(`/members?q=${encodeURIComponent(q.trim())}`),
      },
    ];
  }, [commands, q, nav]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const choose = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/40 p-4 pt-[15vh]" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-hero border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, list.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === 'Enter') choose(list[active]);
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to… or search members"
            aria-label="Command"
            className="min-h-[52px] flex-1 bg-transparent outline-none"
          />
          <kbd className="rounded border border-border px-1.5 text-xs text-muted">esc</kbd>
        </div>
        <ul role="listbox" className="max-h-72 overflow-auto p-2">
          {list.length === 0 && <li className="p-3 text-sm text-muted">No matches</li>}
          {list.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(c)}
              className={`flex cursor-pointer items-center justify-between rounded-card px-3 py-2 text-sm ${
                i === active ? 'bg-surface-2' : ''
              }`}
            >
              <span>{c.label}</span>
              {c.hint && <span className="text-xs text-muted">{c.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
