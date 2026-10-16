import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Banner, Card, Chip, EmptyState, ProgressRing, Skeleton } from './Display';

const meta = { title: 'Primitives/Display', component: Card } satisfies Meta<typeof Card>;
export default meta;

export const Everything: StoryObj = {
  render: () => (
    <div className="space-y-6" style={{ display: 'grid', gap: 24, maxWidth: 520 }}>
      <Card>A calm card</Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <Badge tone="verified">ID verified</Badge>
        <Badge tone="accent">Premium</Badge>
        <Chip selected>Vegetarian</Chip>
        <Chip>Flexible</Chip>
      </div>
      <ProgressRing value={64} label="Profile" />
      <Banner tone="warning">Your payment needs attention.</Banner>
      <Skeleton style={{ height: 48 }} />
      <EmptyState title="No introductions yet" description="We review every introduction by hand." />
    </div>
  ),
};
