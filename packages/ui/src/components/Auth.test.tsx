// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OtpInput } from './OtpInput';
import { PasswordStrength, passwordStrength } from './PasswordStrength';

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [v, setV] = useState('');
  return <OtpInput value={v} onChange={setV} onComplete={onComplete} />;
}

describe('OtpInput', () => {
  it('accepts a pasted code and reports completion', () => {
    const done = vi.fn();
    render(<Harness onComplete={done} />);
    fireEvent.paste(screen.getByLabelText('Digit 1 of 6'), {
      clipboardData: { getData: () => '123 456' },
    });
    expect(done).toHaveBeenCalledWith('123456');
    expect((screen.getByLabelText('Digit 6 of 6') as HTMLInputElement).value).toBe('6');
  });

  it('types digit by digit and ignores non-digits', () => {
    const done = vi.fn();
    render(<Harness onComplete={done} />);
    const first = screen.getByLabelText('Digit 1 of 6');
    fireEvent.change(first, { target: { value: 'a' } });
    expect((first as HTMLInputElement).value).toBe('');
    fireEvent.change(first, { target: { value: '7' } });
    expect((first as HTMLInputElement).value).toBe('7');
    expect(done).not.toHaveBeenCalled();
  });

  it('exposes the autofill hint on the first box only', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByLabelText('Digit 2 of 6')).toHaveAttribute('autocomplete', 'off');
  });
});

describe('PasswordStrength', () => {
  it('scores weak and strong passwords', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(0);
    expect(passwordStrength('Sup3rSecretPass')).toBeGreaterThanOrEqual(3);
    expect(passwordStrength('Sup3rSecret-Passphrase!')).toBe(4);
  });
  it('announces the label', () => {
    render(<PasswordStrength password="Sup3rSecret-Passphrase!" />);
    expect(screen.getByText(/Strong/)).toBeInTheDocument();
  });
});
