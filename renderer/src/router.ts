import { clearCache } from './api/client';
import { esc } from './shared/format';

export type Cleanup = () => void;
/** A page loads its data first (async), then returns a synchronous mount function. */
export type Mount = (root: HTMLElement) => Cleanup | void;
export interface Route { section: string; title: string; pattern: RegExp; load: (params: string[]) => Promise<Mount> }

export function startRouter(root: HTMLElement, routes: Route[], onNavigate: (section: string) => void): void {
  let cleanup: Cleanup | undefined;
  let token = 0;

  const resolve = () => {
    let path = location.hash.replace(/^#/, '');
    if (!path.startsWith('/')) path = `/${path}`;
    if (path === '/') path = '/overview';
    for (const route of routes) {
      const m = route.pattern.exec(path);
      if (m) return { route, params: m.slice(1) };
    }
    return { route: routes[0], params: [] as string[] };
  };

  const render = async () => {
    const mine = ++token;
    cleanup?.();
    cleanup = undefined;
    const { route, params } = resolve();
    onNavigate(route.section);
    document.title = `${route.title} - Earth Sustainability Initiative`;
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<div class="page-content"><p class="loading"><span class="spinner"></span>Loading data</p></div>';
    try {
      const mount = await route.load(params);
      if (mine !== token) return;
      cleanup = mount(root) ?? undefined;
      root.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } catch (err) {
      if (mine !== token) return;
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      root.innerHTML = `<div class="page-content"><div class="card notice"><h1>Could not load the data</h1><p>${esc(msg)}</p><button class="link-button" id="retry" type="button">Try again</button></div></div>`;
      root.querySelector('#retry')?.addEventListener('click', () => { clearCache(); void render(); });
    } finally {
      if (mine === token) root.removeAttribute('aria-busy');
    }
  };

  window.addEventListener('hashchange', () => void render());
  void render();
}
