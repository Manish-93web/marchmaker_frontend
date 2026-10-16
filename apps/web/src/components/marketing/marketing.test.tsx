// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { HeroArt, StepArt } from './Art';
import { Testimonials } from './Testimonials';

describe('testimonials carousel', () => {
  const items = [
    { id: '1', quote: 'We met through a careful introduction.', coupleNames: 'Asha and Ravi', city: 'Pune' },
    { id: '2', quote: 'It felt unhurried.', coupleNames: 'Meera and Karan' },
  ];

  it('is a labelled carousel whose slides say where they are, and nothing moves by itself', () => {
    render(<Testimonials items={items} label="Stories from our members" />);
    expect(screen.getByRole('region', { name: 'Stories from our members' })).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getByRole('group', { name: 'Story 1 of 2' })).toBeInTheDocument();
    expect(screen.getByText('Asha and Ravi, Pune')).toBeInTheDocument();
  });

  it('scrolls one card with the buttons and with the arrow keys', async () => {
    render(<Testimonials items={items} label="Stories" />);
    const list = screen.getByRole('list');
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy as unknown as typeof list.scrollBy;
    await userEvent.click(screen.getByRole('button', { name: 'Next story' }));
    expect(scrollBy).toHaveBeenCalledTimes(1);
    list.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(scrollBy).toHaveBeenCalledTimes(2);
    expect((scrollBy.mock.calls[1]![0] as { left: number }).left).toBeLessThan(0);
  });
});

describe('decorative art', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(
      <>
        <HeroArt />
        <StepArt step={2} />
      </>,
    );
    for (const svg of Array.from(container.querySelectorAll('svg'))) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
