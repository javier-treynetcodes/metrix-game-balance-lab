/**
 * @file Small per-browser flags (dismissed tips) with safe fallbacks.
 */

/** Per-browser flags (dismissed tips, etc.). Storage may be blocked: then nothing is remembered. */
export function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Remembers a flag in this browser. Failures are ignored on purpose: a tip may simply show again. */
export function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Not remembered: the tip may show again next time.
  }
}
