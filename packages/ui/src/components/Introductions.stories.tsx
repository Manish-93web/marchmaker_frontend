import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BlurredPhoto, IntroductionCard, RangeSlider, Stepper } from '../index';

const meta: Meta = { title: 'Introductions' };
export default meta;

export const AgeRange: StoryObj = {
  render: () => {
    const [v, setV] = useState<[number, number]>([26, 34]);
    return <div className="max-w-sm"><RangeSlider label="Age" min={21} max={45} value={v} onChange={setV} /></div>;
  },
};
export const ProfileSteps: StoryObj = { render: () => <Stepper label="Profile steps" current="family" steps={[{ id: 'basics', label: 'Basics' }, { id: 'family', label: 'Family' }, { id: 'photos', label: 'Photos' }]} /> };
export const Photo: StoryObj = { render: () => <div className="h-48 w-40"><BlurredPhoto src="https://placehold.co/320x400" revealed={false} /></div> };
export const Card: StoryObj = {
  render: () => <div className="max-w-md"><IntroductionCard name="Ravi" age={32} city="Pune" profession="Architect" why="You both want to settle in Pune within two years and place family close by." highlights={['Marry within 2 years', 'Similar family values']} badges={['ID verified']} waitingOn="Waiting on you" /></div>,
};
