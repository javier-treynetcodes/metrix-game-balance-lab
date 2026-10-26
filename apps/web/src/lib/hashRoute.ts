/** Deep links: #catalog, #rules, #duels and #versus/<id A>/<id B>. */
export type TabId = 'catalog' | 'rules' | 'duels' | 'versus';

const TAB_IDS: readonly TabId[] = ['catalog', 'rules', 'duels', 'versus'];

export interface Route {
  tab: TabId;
  versus?: [string, string];
}

export function readRoute(hash = window.location.hash): Route {
  const [tab, a, b] = hash.replace(/^#/, '').split('/').map((part) => decodeURIComponent(part));
  if (!tab || !(TAB_IDS as readonly string[]).includes(tab)) return { tab: 'catalog' };
  return tab === 'versus' && a && b ? { tab, versus: [a, b] } : { tab: tab as TabId };
}

export function writeRoute(route: Route): void {
  const parts: string[] = [route.tab, ...(route.versus ?? [])];
  const hash = `#${parts.map((part) => encodeURIComponent(part)).join('/')}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
}
