import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './Button';

const overlay = 'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in';

/**
 * A modal dialog (Radix): focus is trapped and returned, Escape closes it, and the title labels it.
 * On phones it docks to the bottom as a sheet, on larger screens it is centred.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  sheet = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
  /** On small screens, dock to the bottom like a sheet. */
  sheet?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 max-h-[92dvh] w-full space-y-4 overflow-y-auto bg-surface p-6 shadow-lg outline-none',
            sheet ? 'bottom-0 left-1/2 -translate-x-1/2 rounded-t-hero sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-hero' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-hero',
            size === 'lg' ? 'max-w-3xl' : 'max-w-lg',
          )}
        >
          <DialogPrimitive.Title className="font-display text-xl text-primary">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A dialog for the same job on phones: always docked to the bottom. */
export function Sheet(props: Omit<Parameters<typeof Dialog>[0], 'sheet'>) {
  return <Dialog {...props} sheet />;
}

/** Asks before something that cannot easily be undone. The safe choice is focused first. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlay} />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-hero bg-surface p-6 shadow-lg outline-none">
          <AlertDialog.Title className="font-display text-xl text-primary">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted">{body}</AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button variant={destructive ? 'destructive' : 'primary'} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

/** A short hint on hover or keyboard focus. Never the only place important information appears. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-card bg-ink px-3 py-1.5 text-xs text-surface shadow">
          {label}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
