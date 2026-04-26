import type {
  PublicUser,
  PublicProjectSummary,
  PublicChallengeSummary,
  UserProfile,
} from '../types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (res.status === 404) throw new Error('not found');
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GET ${path} → ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

type PublicUserProfile = Omit<UserProfile, never>;

export const usersApi = {
  search: (q: string) => getJson<PublicUser[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
  get: (username: string) => getJson<PublicUserProfile>(`/api/users/${encodeURIComponent(username)}`),
  projects: (username: string) =>
    getJson<PublicProjectSummary[]>(`/api/users/${encodeURIComponent(username)}/projects`),
  challenges: (username: string) =>
    getJson<PublicChallengeSummary[]>(`/api/users/${encodeURIComponent(username)}/challenges`),
};
