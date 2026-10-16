import type { Preview } from '@storybook/react';
import './preview.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: { icon: 'circlehollow', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  decorators: [
    (Story, ctx) => {
      document.documentElement.setAttribute('data-theme', ctx.globals.theme as string);
      return Story();
    },
  ],
};
export default preview;
