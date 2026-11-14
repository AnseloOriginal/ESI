import './styles/main.css';
import { renderDashboard, setupSidebar, setActiveNav } from './pages/dashboard';
import { startRouter } from './router';
import { overviewPage } from './pages/overview';
import { cityPage } from './pages/city';
import { initiativePage } from './pages/initiative';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root element #app was not found.');

app.innerHTML = renderDashboard();
setupSidebar();

const main = document.querySelector<HTMLElement>('#main');
if (!main) throw new Error('Main content element #main was not found.');

startRouter(
  main,
  [
    { section: 'overview', title: 'Overview', pattern: /^\/overview$/, load: () => overviewPage() },
    { section: 'city', title: 'City view', pattern: /^\/city(?:\/([^/]+))?$/, load: (p) => cityPage(p) },
    { section: 'initiative', title: 'The initiative', pattern: /^\/initiative$/, load: () => initiativePage() },
  ],
  setActiveNav,
);
