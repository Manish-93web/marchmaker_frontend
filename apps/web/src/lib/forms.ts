import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import { ApiRequestError } from './api';

/** Maps API validation details onto form fields; returns a message for anything else. */
export function applyApiError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): string | null {
  if (!(err instanceof ApiRequestError)) return null;
  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
    let mapped = false;
    for (const d of err.details as { path: string; message: string }[]) {
      if (d.path) {
        setError(d.path as Path<T>, { message: d.message });
        mapped = true;
      }
    }
    if (mapped) return null;
  }
  return err.message;
}
