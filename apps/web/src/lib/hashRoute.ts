/**
 * @file Deep links in the URL hash: #catalog, #rules, #duels and #versus/<id>/<id>.
 */

/** Deep links: #catalog, #rules, #duels and #versus/<id A>/<id B>. */
export type TabId = 'catalog' | 'rules' | 'duels' | 'versus';

const TAB_IDS: readonly TabId[] = ['catalog', 'rules', 'duels', 'versus'];

/** Location inside the workspace: the open tab and, for Versus, the ids of both entities. */
export interface Route {
  tab: TabId;
  versus?: [string, string];
}

/** Reads the route from the address bar. Unknown or malformed hashes fall back to the catalog tab. */
export function readRoute(hash = window.location.hash): Route {
  const [tab, a, b] = hash.replace(/^#/, '').split('/').map((part) => decodeURIComponent(part));
  if (!tab || !(TAB_IDS as readonly string[]).includes(tab)) return { tab: 'catalog' };
  return tab === 'versus' && a && b ? { tab, versus: [a, b] } : { tab: tab as TabId };
}

/**
 * Writes the route to the address bar with `replaceState`, so moving between tabs does not
 * fill the browser history and the back button still leaves the app.
 */
export function writeRoute(route: Route): void {
  const parts: string[] = [route.tab, ...(route.versus ?? [])];
  const hash = `#${parts.map((part) => encodeURIComponent(part)).join('/')}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
}
