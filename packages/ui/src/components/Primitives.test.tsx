import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, Avatar, CommandPalette, ConfirmDialog, Dialog, NotificationBell, PricingCard, StatTile, Tabs, Timeline } from '../index';

describe('Dialog', () => {
  it('is labelled by its title and closes on Escape', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Report a concern">
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Report a concern' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ConfirmDialog', () => {
  it('asks before acting, and cancel does nothing', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open onOpenChange={() => undefined} title="Delete?" body="This cannot be undone." confirmLabel="Delete" cancelLabel="Keep" destructive onConfirm={onConfirm} />);
    expect(screen.getByRole('alertdialog', { name: 'Delete?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Tabs', () => {
  it('moves between tabs with the arrow keys and shows only the active panel', async () => {
    render(
      <Tabs
        label="Sections"
        items={[
          { value: 'a', label: 'One', content: <p>First panel</p> },
          { value: 'b', label: 'Two', content: <p>Second panel</p> },
        ]}
      />,
    );
    expect(screen.getByText('First panel')).toBeInTheDocument();
    screen.getByRole('tab', { name: 'One' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByText('Second panel')).toBeInTheDocument();
  });
});

describe('Accordion', () => {
  it('exposes expanded state and reveals content on activation', async () => {
    render(<Accordion items={[{ value: 'q1', title: 'Is it free?', content: 'Browsing is.' }]} />);
    const trigger = screen.getByRole('button', { name: 'Is it free?' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Browsing is.')).toBeVisible();
  });
});

describe('Avatar', () => {
  it('falls back to initials', () => {
    render(<Avatar name="Asha Rao" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });
});

describe('Timeline', () => {
  it('says each stage in words and marks the current one', () => {
    render(
      <Timeline
        label="Journey"
        steps={[
          { id: 'a', title: 'Account', state: 'done' },
          { id: 'b', title: 'Verification', state: 'current' },
          { id: 'c', title: 'Matching', state: 'upcoming' },
        ]}
      />,
    );
    expect(screen.getByText('(In progress)')).toBeInTheDocument();
    expect(screen.getByText('Verification').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('PricingCard and StatTile', () => {
  it('shows price, features and the action', () => {
    render(
      <>
        <PricingCard name="Premium" price="₹1,999" period="/ month" features={['Four credits a month']} highlight badge="Most chosen" cta={<button>Choose</button>} />
        <StatTile label="Open reports" value={3} tone="danger" />
      </>,
    );
    expect(screen.getByText('Most chosen')).toBeInTheDocument();
    expect(screen.getByText('Four credits a month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose' })).toBeInTheDocument();
    expect(screen.getByText('Open reports')).toBeInTheDocument();
  });
});

describe('NotificationBell', () => {
  it('speaks the unread count', () => {
    render(<NotificationBell count={12} label={(n) => `Notifications, ${n} unread`} />);
    expect(screen.getByRole('button', { name: 'Notifications, 12 unread' })).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});

describe('CommandPalette', () => {
  it('filters and runs the chosen command', () => {
    const a = vi.fn();
    const b = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open
        onClose={onClose}
        commands={[
          { id: 'a', label: 'Go to members', run: a },
          { id: 'b', label: 'Go to payments', run: b },
        ]}
      />,
    );
    const box = screen.getByRole('combobox');
    fireEvent.change(box, { target: { value: 'pay' } });
    expect(screen.queryByText('Go to members')).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(b).toHaveBeenCalled();
    expect(a).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

import { Combobox, EmptyState } from '../index';
import { useState } from 'react';

function Cities() {
  const [v, setV] = useState('');
  return <Combobox label="City" value={v} onValueChange={setV} options={[{ value: 'pune', label: 'Pune' }, { value: 'patna', label: 'Patna' }, { value: 'mumbai', label: 'Mumbai' }]} />;
}

describe('Combobox', () => {
  it('filters as you type, moves with arrows and picks with Enter', async () => {
    render(<Cities />);
    const box = screen.getByRole('combobox', { name: 'City' });
    await userEvent.click(box);
    await userEvent.type(box, 'p');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Pune', 'Patna']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(box).toHaveValue('Patna');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('says so when nothing matches', async () => {
    render(<Cities />);
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('draws a decorative picture by default', () => {
    const { container } = render(<EmptyState title="Nothing yet" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });
});
