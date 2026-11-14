import { icon } from '../shared/icon';

const navigation = [
  { label: 'Overview', icon: 'grid', active: true },
  { label: 'City view', icon: 'map-pin', active: false },
  { label: 'The initiative', icon: 'info', active: false },
];

export function renderDashboard(): string {
  return `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <a class="brand" href="#overview" aria-label="Earth Sustainability Initiative">
          <span class="brand-mark">${icon('globe')}</span>
          <span class="brand-name">Earth Sustainability Initiative</span>
        </a>
        <button class="sidebar-toggle" id="sidebar-toggle" type="button" aria-label="Expand sidebar" aria-expanded="false">
          ${icon('panel')}
        </button>
        <nav class="primary-nav">
          ${navigation.map((item) => `<a class="nav-item${item.active ? ' active' : ''}" href="#${item.label.toLowerCase().replaceAll(' ', '-')}" aria-label="${item.label}" title="${item.label}"${item.active ? ' aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
        </nav>
        <div class="sidebar-bottom">
          <span class="sidebar-monogram" aria-hidden="true">ESI</span>
        </div>
      </aside>

      <main class="main-content" id="overview" aria-label="Overview"></main>
    </div>`;
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
