// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Input } from './Field';
import { ProgressRing } from './Display';

describe('ui primitives', () => {
  it('Button is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>);
    const b = screen.getByRole('button', { name: /save/i });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
  });

  it('Input links its label and announces errors', () => {
    render(<Input label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it('ProgressRing exposes progressbar semantics', () => {
    render(<ProgressRing value={42} label="Profile" />);
    expect(screen.getByRole('progressbar', { name: 'Profile' })).toHaveAttribute('aria-valuenow', '42');
  });
});
