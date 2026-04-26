import type { SchoolProjectSummary, SchoolProject, UserProject } from '../types';
import { api } from './api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (res.status === 404) throw new Error('not found');
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GET ${path} → ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const schoolApi = {
  list: () => getJson<SchoolProjectSummary[]>('/api/school/projects'),
  get: (id: string) => getJson<SchoolProject>(`/api/school/projects/${encodeURIComponent(id)}`),
  fork: (id: string) =>
    api.post<UserProject>(`/api/school/projects/${encodeURIComponent(id)}/fork`, {}),
};
