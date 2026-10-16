import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safePath';

describe('safeInternalPath', () => {
  it('keeps normal in-app paths, including queries', () => {
    expect(safeInternalPath('/introductions/abc?feedback=1')).toBe('/introductions/abc?feedback=1');
    expect(safeInternalPath('/billing?plan=essential&interval=annual')).toBe('/billing?plan=essential&interval=annual');
  });
  it.each(['//evil.example', '/\\evil.example', '\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\tcontrol', '', undefined, 42, '/'.padEnd(400, 'a')])(
    'refuses %j',
    (bad) => {
      expect(safeInternalPath(bad, '/dashboard')).toBe('/dashboard');
    },
  );
});
