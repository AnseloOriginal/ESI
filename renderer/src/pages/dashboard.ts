import { icon } from '../shared/icon';

const navigation = [
  { label: 'Overview', icon: 'grid', href: '#/overview', section: 'overview' },
  { label: 'City Pressure', icon: 'gauge', href: '#/trending', section: 'trending' },
  { label: 'Explore Trends', icon: 'chart', href: '#/explore', section: 'explore' },
  { label: 'City view', icon: 'map-pin', href: '#/city', section: 'city' },
  { label: 'The initiative', icon: 'info', href: '#/initiative', section: 'initiative' },
];

export function renderDashboard(): string {
  return `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <a class="brand" href="#/overview" aria-label="Earth Sustainability Initiative">
          <span class="brand-mark">${icon('globe')}</span>
          <span class="brand-name">Earth Sustainability Initiative</span>
        </a>
        <button class="sidebar-toggle" id="sidebar-toggle" type="button" aria-label="Expand sidebar" aria-expanded="false">
          ${icon('panel')}
        </button>
        <nav class="primary-nav">
          ${navigation.map((item) => `<a class="nav-item" data-section="${item.section}" href="${item.href}" aria-label="${item.label}" title="${item.label}">${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
        </nav>
        <div class="sidebar-bottom">
          <span class="sidebar-monogram" aria-hidden="true">ESI</span>
        </div>
      </aside>

      <main class="main-content" id="main" tabindex="-1"></main>
    </div>`;
}

export function setActiveNav(section: string): void {
  document.querySelectorAll<HTMLAnchorElement>('.nav-item').forEach((a) => {
    const active = a.dataset.section === section;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function setupSidebar(): void {
  const sidebar = document.querySelector<HTMLElement>('#sidebar');
  const toggle = document.querySelector<HTMLButtonElement>('#sidebar-toggle');
  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    const expanded = sidebar.classList.toggle('expanded');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Collapse sidebar' : 'Expand sidebar');
  });
}
