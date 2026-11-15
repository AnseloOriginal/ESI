import './styles/main.css';
import { renderDashboard, setupSidebar, setActiveNav } from './pages/dashboard';
import { startRouter } from './router';
import { overviewPage } from './pages/overview';
import { cityPage } from './pages/city';
import { initiativePage } from './pages/about';
import { trendingPage } from './pages/trending';
import { explorePage } from './pages/explore';

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
    { section: 'trending', title: 'City Pressure', pattern: /^\/trending$/, load: () => trendingPage() },
    { section: 'explore', title: 'Explore Trends', pattern: /^\/explore$/, load: () => explorePage() },
    { section: 'city', title: 'City view', pattern: /^\/city(?:\/([^/]+))?$/, load: (p) => cityPage(p) },
    { section: 'about', title: 'about', pattern: /^\/about$/, load: () => initiativePage() },
  ],
  setActiveNav,
);
