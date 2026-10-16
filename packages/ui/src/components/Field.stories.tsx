import type { Meta, StoryObj } from '@storybook/react';
import { Input, Textarea } from './Field';

const meta = { title: 'Primitives/Field', component: Input } satisfies Meta<typeof Input>;
export default meta;

export const Default: StoryObj<typeof Input> = { args: { label: 'Email', placeholder: 'you@example.com' } };
export const WithError: StoryObj<typeof Input> = { args: { label: 'Email', error: 'Enter a valid email' } };
export const LongText: StoryObj<typeof Textarea> = {
  render: () => <Textarea label="About me" maxLength={500} value="Hello" onChange={() => undefined} />,
};
