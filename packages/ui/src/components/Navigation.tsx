import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

// ------------------------------------------------------------------ Tabs

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

/** Arrow keys move between tabs and the active panel is announced; unmounted panels are not rendered. */
export function Tabs({ items, defaultValue, value, onValueChange, label }: { items: TabItem[]; defaultValue?: string; value?: string; onValueChange?: (v: string) => void; label: string }) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List aria-label={label} className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {items.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="min-h-[44px] px-4 text-sm font-medium text-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="outline-none">
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

// ------------------------------------------------------------------ Accordion

export interface AccordionItem {
  value: string;
  title: string;
  content: ReactNode;
}

/** Disclosure sections for FAQs and help. Buttons, not links, with the expanded state exposed to assistive tech. */
export function Accordion({ items, type = 'single' }: { items: AccordionItem[]; type?: 'single' | 'multiple' }) {
  const Root = AccordionPrimitive.Root as React.ElementType;
  return (
    <Root type={type} {...(type === 'single' ? { collapsible: true } : {})} className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((i) => (
        <AccordionPrimitive.Item key={i.value} value={i.value}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium">
              {i.title}
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="px-4 pb-4 text-sm text-muted">{i.content}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </Root>
  );
}

// ------------------------------------------------------------------ Select

export interface SelectOption {
  value: string;
  label: string;
}

/** A styled, keyboard-friendly select with type-ahead. Use the native select for very long lists on phones. */
export function Select({ value, onValueChange, options, label, placeholder }: { value: string; onValueChange: (v: string) => void; options: SelectOption[]; label: string; placeholder?: string }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger aria-label={label} className="inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-input border border-border bg-surface px-3 text-left">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={4} className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-border bg-surface shadow-lg">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className="relative flex min-h-[40px] cursor-pointer select-none items-center rounded px-8 text-sm outline-none data-[highlighted]:bg-surface-2">
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// ------------------------------------------------------------------ Avatar

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

/** A photo if there is one, otherwise the person's initials. Never an empty circle. */
export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <AvatarPrimitive.Root className={cn('inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-fg', className)} style={{ width: size, height: size }}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : undefined} aria-label={name} className="font-medium" style={{ fontSize: size / 2.6 }}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
