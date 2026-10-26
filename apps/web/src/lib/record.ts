/**
 * @file Immutable helpers for plain record objects.
 */

/** Copy of a record with one key set, or removed when the value is undefined. */
export function withKey<T>(record: Record<string, T>, key: string, value: T | undefined): Record<string, T> {
  const rest = Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
  return value === undefined ? rest : { ...rest, [key]: value };
}
