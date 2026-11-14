import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import { esc } from '../shared/format';

const world = worldData as unknown as Topology<{ countries: GeometryCollection }>;
const land = feature(world, world.objects.countries);
const borders = mesh(world, world.objects.countries, (a, b) => a !== b);
const graticule = geoGraticule10();

export interface GlobeMarker { id: string; name: string; lat: number; lon: number; color: string; detail: string }
export interface GlobeHandle { select(id: string | null): void; destroy(): void }

export function createGlobe(host: HTMLElement, markers: GlobeMarker[], onSelect: (id: string) => void): GlobeHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'globe-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive globe showing monitored cities. Select a city marker to open its population and trend details.');
  const tip = document.createElement('div');
  tip.className = 'globe-tip';
  tip.hidden = true;
  host.append(canvas, tip);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  const projection = geoOrthographic().clipAngle(90).precision(0.5);
  const path = geoPath(projection, ctx);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0;
  let lon = 40, lat = 18;
  let target: { lon: number; lat: number } | null = null;
  let selected: string | null = null;
  let hovered: string | null = null;
  let dragging = false, moved = 0, lastX = 0, lastY = 0, lastTouch = 0;
  let visible: { m: GlobeMarker; x: number; y: number }[] = [];

  const resize = () => {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    projection.translate([w / 2, h / 2]).scale(Math.max(20, Math.min(w, h) / 2 - 18));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  function draw() {
    projection.rotate([-lon, -lat]);
    ctx!.clearRect(0, 0, w, h);
    const r = projection.scale();
    const cx = w / 2, cy = h / 2;

    ctx!.beginPath(); path({ type: 'Sphere' });
    const ocean = ctx!.createRadialGradient(cx - r * 0.28, cy - r * 0.34, r * 0.04, cx, cy, r * 1.05);
    ocean.addColorStop(0, '#397184');
    ocean.addColorStop(0.62, '#245467');
    ocean.addColorStop(1, '#142f40');
    ctx!.fillStyle = ocean; ctx!.fill();
    ctx!.beginPath(); path(graticule); ctx!.strokeStyle = 'rgba(221,232,228,.13)'; ctx!.lineWidth = 0.6; ctx!.stroke();
    ctx!.beginPath(); path(land); ctx!.fillStyle = '#8b956f'; ctx!.fill();
    ctx!.beginPath(); path(borders); ctx!.strokeStyle = 'rgba(42,76,72,.72)'; ctx!.lineWidth = 0.55; ctx!.stroke();
    ctx!.beginPath(); path({ type: 'Sphere' }); ctx!.strokeStyle = 'rgba(225,238,233,.3)'; ctx!.lineWidth = 1; ctx!.stroke();

    visible = [];
    markers.forEach((m) => {
      if (geoDistance([m.lon, m.lat], [lon, lat]) > Math.PI / 2 - 0.04) return;
      const p = projection([m.lon, m.lat]);
      if (!p) return;
      visible.push({ m, x: p[0], y: p[1] });
      const active = m.id === selected || m.id === hovered;
      ctx!.beginPath(); ctx!.arc(p[0], p[1], active ? 8 : 5.5, 0, Math.PI * 2);
      ctx!.fillStyle = m.color; ctx!.fill();
      ctx!.lineWidth = active ? 2.5 : 1.5; ctx!.strokeStyle = '#fff'; ctx!.stroke();
    });
  }

  let raf = 0, prev = 0;
  const frame = (t: number) => {
    const dt = Math.min(50, t - prev); prev = t;
    if (target) {
      const dLon = ((target.lon - lon + 540) % 360) - 180;
      const dLat = target.lat - lat;
      const k = 1 - Math.pow(0.0015, dt / 1000);
      lon += dLon * k; lat += dLat * k;
      if (Math.abs(dLon) < 0.05 && Math.abs(dLat) < 0.05) target = null;
    } else if (!dragging && !hovered && !selected && !reduced && t - lastTouch > 1500) {
      lon += dt * 0.006;
    }
    lon = ((lon + 540) % 360) - 180;
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const hit = (x: number, y: number) => {
    let best: { m: GlobeMarker; x: number; y: number } | null = null, bestD = 16;
    for (const v of visible) { const d = Math.hypot(v.x - x, v.y - y); if (d < bestD) { best = v; bestD = d; } }
    return best;
  };
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; target = null;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      const k = 90 / projection.scale();
      lon -= dx * k; lat = Math.max(-80, Math.min(80, lat + dy * k));
      lastX = e.clientX; lastY = e.clientY; lastTouch = performance.now();
      tip.hidden = true;
      return;
    }
    const v = hit(x, y);
    hovered = v?.m.id ?? null;
    canvas.style.cursor = v ? 'pointer' : 'grab';
    if (v) {
      tip.innerHTML = `<strong>${esc(v.m.name)}</strong><span>${esc(v.m.detail)}</span>`;
      tip.style.left = `${v.x}px`; tip.style.top = `${v.y}px`; tip.hidden = false;
    } else tip.hidden = true;
  });
  const end = (e: PointerEvent, click: boolean) => {
    dragging = false; canvas.classList.remove('dragging');
    if (click && moved < 6) { const [x, y] = local(e); const v = hit(x, y); if (v) onSelect(v.m.id); }
  };
  canvas.addEventListener('pointerup', (e) => end(e, true));
  canvas.addEventListener('pointercancel', (e) => end(e, false));
  canvas.addEventListener('pointerleave', () => { hovered = null; tip.hidden = true; });

  return {
    select(id) {
      selected = id;
      const m = markers.find((x) => x.id === id);
      target = m ? { lon: m.lon, lat: m.lat * 0.7 } : null;
    },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); tip.remove(); },
  };
}
