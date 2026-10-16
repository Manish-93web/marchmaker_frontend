import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Accordion, Avatar, Button, ConfirmDialog, Dialog, NotificationBell, PricingCard, StatTile, Tabs, Timeline, Tooltip, TooltipProvider } from '../index';

const meta: Meta = { title: 'Composite' };
export default meta;

export const Stats: StoryObj = {
  render: () => (
    <div className="grid max-w-md grid-cols-2 gap-3">
      <StatTile label="Open reports" value={3} tone="danger" />
      <StatTile label="Verified today" value={18} note="up from 11" />
    </div>
  ),
};

export const JourneyTimeline: StoryObj = {
  render: () => (
    <Timeline
      label="Journey"
      steps={[
        { id: 'a', title: 'Account', state: 'done' },
        { id: 'b', title: 'Verification', detail: 'We are reviewing your ID', state: 'current' },
        { id: 'c', title: 'Matching', state: 'upcoming' },
      ]}
    />
  ),
};

export const Pricing: StoryObj = {
  render: () => (
    <div className="max-w-sm">
      <PricingCard
        name="Premium"
        tagline="For serious searches"
        price="₹1,999"
        period="/ month"
        features={['4 credits a month', 'Astrology readings', 'WhatsApp alerts']}
        highlight
        badge="Most chosen"
        cta={<button className="rounded-pill bg-primary px-4 py-2 text-primary-fg">Choose Premium</button>}
      />
    </div>
  ),
};

export const TabsDemo: StoryObj = {
  render: () => (
    <Tabs
      label="Demo"
      items={[
        { value: 'a', label: 'Overview', content: <p>Overview</p> },
        { value: 'b', label: 'Finance', content: <p>Finance</p> },
      ]}
    />
  ),
};

export const AccordionDemo: StoryObj = {
  render: () => (
    <div className="max-w-md">
      <Accordion
        items={[
          { value: '1', title: 'Is browsing free?', content: 'Yes.' },
          { value: '2', title: 'When is a credit used?', content: 'Only when you both accept.' },
        ]}
      />
    </div>
  ),
};

export const Avatars: StoryObj = {
  render: () => (
    <div className="flex gap-3">
      <Avatar name="Asha Rao" />
      <Avatar name="Rohan" size={56} />
    </div>
  ),
};

export const Bell: StoryObj = { render: () => <NotificationBell count={4} label={(n) => `Notifications, ${n} unread`} /> };

export const DialogDemo: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Report a concern" description="Our safety team reviews every report.">
          <Button onClick={() => setOpen(false)}>Close</Button>
        </Dialog>
      </>
    );
  },
};

export const Confirm: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete account
        </Button>
        <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete your account?" body="You have 14 days to change your mind." confirmLabel="Delete" cancelLabel="Keep my account" destructive onConfirm={() => setOpen(false)} />
      </>
    );
  },
};

export const TooltipDemo: StoryObj = {
  render: () => (
    <TooltipProvider>
      <Tooltip label="Opens in a new tab">
        <Button variant="outline">Hover or focus me</Button>
      </Tooltip>
    </TooltipProvider>
  ),
};
