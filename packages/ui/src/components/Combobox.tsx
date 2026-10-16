import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export interface ComboOption {
  value: string;
  label: string;
}

/**
 * Type to filter a long list (cities, professions) and pick one. Follows the ARIA 1.2 combobox pattern: the input keeps
 * focus, arrows move through the options, Enter picks, Escape closes, and the chosen text stays in the field.
 */
export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  emptyText = 'No matches',
  allowCustom = false,
}: {
  label: string;
  options: ComboOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  /** Let people keep text that is not in the list (for example a small town). */
  allowCustom?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [text, setText] = useState(options.find((o) => o.value === value)?.label ?? value);
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return options.filter((o) => !needle || o.label.toLowerCase().includes(needle)).slice(0, 50);
  }, [options, text]);

  const choose = (o?: ComboOption) => {
    if (!o) return;
    setText(o.label);
    onValueChange(o.value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        ref={input}
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? `${id}-opt-${list[active]!.value}` : undefined}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        className="min-h-[44px] w-full rounded-input border border-border bg-surface px-3"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          if (allowCustom) onValueChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, list.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            choose(list[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={label} className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border bg-surface p-1 shadow-lg">
          {list.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${o.value}`}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              className={cn('flex min-h-[40px] cursor-pointer items-center rounded px-3 text-sm', i === active && 'bg-surface-2')}
            >
              {o.label}
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-3 text-sm text-muted">{emptyText}</li>}
        </ul>
      )}
    </div>
  );
}
