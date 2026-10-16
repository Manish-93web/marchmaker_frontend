import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlurredPhoto, IntroductionCard, RangeSlider, Stepper } from '../index';

describe('RangeSlider', () => {
  it('moves each end without letting them cross', () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Age" min={21} max={45} value={[26, 34]} onChange={onChange} />);
    expect(screen.getByText(/Age: 26 to 34/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Age, lowest'), { target: { value: '40' } });
    expect(onChange).toHaveBeenLastCalledWith([34, 34]);
    fireEvent.change(screen.getByLabelText('Age, highest'), { target: { value: '30' } });
    expect(onChange).toHaveBeenLastCalledWith([26, 30]);
  });
});

describe('Stepper', () => {
  it('marks the current step and says which are done', () => {
    render(<Stepper label="Profile steps" current="b" steps={[{ id: 'a', label: 'Basics' }, { id: 'b', label: 'Family' }, { id: 'c', label: 'Photos' }]} />);
    expect(screen.getByText('Family').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('(done)')).toBeInTheDocument();
  });
});

describe('BlurredPhoto', () => {
  it('stays blurred and unmarked until revealed, then shows the viewer watermark', () => {
    const { rerender, container } = render(<BlurredPhoto src="/p.webp" revealed={false} watermark="Member 4821" />);
    expect(container.querySelector('img')?.className).toContain('blur-xl');
    expect(screen.queryByText('Member 4821')).toBeNull();
    rerender(<BlurredPhoto src="/p.webp" revealed watermark="Member 4821" />);
    expect(screen.getByText('Member 4821')).toBeInTheDocument();
    const prevented = !fireEvent.contextMenu(container.querySelector('img')!);
    expect(prevented).toBe(true);
  });
});

describe('IntroductionCard', () => {
  it('shows who, why and what they may share', () => {
    render(<IntroductionCard name="Ravi" age={32} city="Pune" profession="Architect" why="You both want a calm family life." highlights={['Marry within 2 years']} badges={['ID verified']} />);
    expect(screen.getByText('Ravi, 32')).toBeInTheDocument();
    expect(screen.getByText('You both want a calm family life.')).toBeInTheDocument();
    expect(screen.getByText('ID verified')).toBeInTheDocument();
  });
});
