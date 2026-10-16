import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface Testimonial {
  id: string;
  quote: string;
  coupleNames: string;
  city?: string | null;
}

/**
 * A swipeable, keyboard-operable carousel of consented stories. Nothing moves by itself, so there is nothing to pause;
 * the previous/next buttons scroll one card, and the whole strip scrolls with touch or arrow keys.
 */
export function Testimonials({ items, label }: { items: Testimonial[]; label: string }) {
  const { t } = useTranslation();
  const track = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('li')?.getBoundingClientRect().width ?? el.clientWidth;
    el.scrollBy({ left: dir * (card + 16), behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="mb-3 flex justify-end gap-2">
        <button type="button" onClick={() => move(-1)} aria-label={t('m.carousel.prev')} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-pill border border-border bg-surface hover:bg-surface-2">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => move(1)} aria-label={t('m.carousel.next')} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-pill border border-border bg-surface hover:bg-surface-2">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <ul
        ref={track}
        tabIndex={0}
        aria-live="off"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1);
          if (e.key === 'ArrowLeft') move(-1);
        }}
      >
        {items.map((s, i) => (
          <li key={s.id} role="group" aria-roledescription="slide" aria-label={t('m.carousel.slide', { n: i + 1, total: items.length })} className="w-[min(85vw,24rem)] shrink-0 snap-start">
            <figure className="relative h-full rounded-hero border border-border bg-surface p-6">
              <span aria-hidden="true" className="absolute right-5 top-2 font-display text-6xl leading-none text-accent/40">
                “
              </span>
              <blockquote className="font-display text-lg text-ink">{s.quote}</blockquote>
              <figcaption className="mt-4 text-sm text-muted">
                {s.coupleNames}
                {s.city ? `, ${s.city}` : ''}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
