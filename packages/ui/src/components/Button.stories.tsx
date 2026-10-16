import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = { title: 'Primitives/Button', component: Button, args: { children: 'Continue' } } satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;

export const Primary: S = {};
export const Secondary: S = { args: { variant: 'secondary' } };
export const Outline: S = { args: { variant: 'outline' } };
export const Destructive: S = { args: { variant: 'destructive', children: 'Delete account' } };
export const Loading: S = { args: { loading: true, children: 'Saving' } };
