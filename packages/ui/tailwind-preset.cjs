/** Shared Tailwind preset: maps design tokens (CSS variables) to utilities. */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        bg: 'var(--mm-bg)',
        surface: 'var(--mm-surface)',
        'surface-2': 'var(--mm-surface-2)',
        ink: 'var(--mm-ink)',
        muted: 'var(--mm-muted)',
        border: 'var(--mm-border)',
        primary: { DEFAULT: 'var(--mm-primary)', fg: 'var(--mm-primary-fg)' },
        accent: { DEFAULT: 'var(--mm-accent)', 2: 'var(--mm-accent-2)', fg: 'var(--mm-accent-fg)' },
        secondary: { DEFAULT: 'var(--mm-secondary)', fg: 'var(--mm-secondary-fg)' },
        success: 'var(--mm-success)',
        warning: 'var(--mm-warning)',
        danger: { DEFAULT: 'var(--mm-danger)', fg: 'var(--mm-danger-fg)' },
        info: 'var(--mm-info)',
      },
      fontFamily: {
        display: ['var(--mm-font-display)'],
        body: ['var(--mm-font-body)'],
      },
      borderRadius: { card: 'var(--mm-radius-card)', hero: 'var(--mm-radius-hero)', pill: 'var(--mm-radius-pill)' },
      boxShadow: { sm: 'var(--mm-shadow-sm)', md: 'var(--mm-shadow-md)', lg: 'var(--mm-shadow-lg)' },
      backgroundImage: { 'cta-gradient': 'var(--mm-gradient-cta)' },
      fontSize: {
        xs: 'var(--mm-text-xs)',
        sm: 'var(--mm-text-sm)',
        base: 'var(--mm-text-base)',
        lg: 'var(--mm-text-lg)',
        xl: 'var(--mm-text-xl)',
        '2xl': 'var(--mm-text-2xl)',
        '3xl': 'var(--mm-text-3xl)',
      },
    },
  },
};
