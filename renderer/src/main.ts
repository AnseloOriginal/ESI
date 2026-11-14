import './styles/main.css';
import { renderDashboard, setupSidebar } from './pages/dashboard';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element #app was not found.');
}

app.innerHTML = renderDashboard();
setupSidebar();
