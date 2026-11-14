export type Status = 'worsening' | 'improving' | 'wetter' | 'drier' | 'no_clear_trend' | 'insufficient_data';
export type WorseDirection = 'up' | 'down' | 'both';

export interface Health { status: string; n_results: number; n_cities: number; n_errors: number; generated_at?: string | null; unknown_cities: string[] }
export interface CitySummary { name: string; country?: string | null; lat?: number | null; lon?: number | null; bbox?: number[] | null; population?: number | null; population_year?: number | null; population_source?: string | null; n_indicators: number; status_counts: Record<string, number> }
export interface Trend {
  city: string; indicator: string; label: string; unit: string; worse_direction: WorseDirection; source: string;
  status: Status; direction: 'increasing' | 'decreasing' | 'none';
  trend_per_decade?: number | null; p_value?: number | null; kendall_tau?: number | null; mean_value?: number | null;
  n_years?: number; start_year?: number | null; end_year?: number | null; completeness?: number | null; note?: string | null;
  data_start?: string | null; data_end?: string | null; generated_at?: string | null;
}
export interface CityDetail { city: CitySummary; results: Trend[] }
export interface IndicatorInfo { indicator: string; label: string; unit: string; worse_direction: WorseDirection; source: string; n_cities: number }
export interface IndicatorSummary { indicator: string; label: string; n_cities: number; status_counts: Record<string, number> }
export interface SeriesOut { city: string; indicator: string; label: string; unit: string; source: string; points: { date: string; value?: number | null }[] }

export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError(`Cannot reach the API at ${API_BASE}. Start it with "py server/api.py" and try again.`);
  }
  if (!res.ok) throw new ApiError(`The API returned ${res.status} for ${url.pathname}.`);
  return (await res.json()) as T;
}

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = load().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, p);
  return p;
}

export const clearCache = (): void => cache.clear();

export const api = {
  health: () => get<Health>('/api/health'),
  cities: () => cached('cities', () => get<CitySummary[]>('/api/cities')),
  city: (name: string) => cached(`city:${name}`, () => get<CityDetail>(`/api/cities/${encodeURIComponent(name)}`)),
  indicators: () => cached('indicators', () => get<IndicatorInfo[]>('/api/indicators')),
  summary: () => cached('summary', () => get<IndicatorSummary[]>('/api/summary')),
  results: () => cached('results', () => get<Trend[]>('/api/results')),
  series: (city: string, indicator: string) => cached(`series:${city}:${indicator}`, () => get<SeriesOut>('/api/series', { city, indicator })),
};
