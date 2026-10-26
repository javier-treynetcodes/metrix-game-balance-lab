/** Per-browser flags (dismissed tips, etc.). Storage may be blocked: then nothing is remembered. */
export function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Not remembered: the tip may show again next time.
  }
}
