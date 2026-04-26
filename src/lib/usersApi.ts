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

export interface PodiumWins {
  byDifficulty: { Beginner: number; Intermediate: number; Advanced: number };
  byPlacement: { first: number; second: number; third: number };
  wins: unknown[];
}

export interface PublicEloChange {
  id: string;
  userId: string;
  challengeId: string;
  delta: number;
  newRating: number;
  reason: string;
  createdAt: string;
}

export interface LeaderboardUser {
  username: string;
  fullName: string;
  avatarUrl: string;
  elo: number;
  globalRank: number;
  updatedAt: string;
}

export const usersApi = {
  leaderboard: () => getJson<LeaderboardUser[]>('/api/leaderboard'),
  search: (q: string) => getJson<PublicUser[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
  get: (username: string) => getJson<PublicUserProfile>(`/api/users/${encodeURIComponent(username)}`),
  projects: (username: string) =>
    getJson<PublicProjectSummary[]>(`/api/users/${encodeURIComponent(username)}/projects`),
  challenges: (username: string) =>
    getJson<PublicChallengeSummary[]>(`/api/users/${encodeURIComponent(username)}/challenges`),
  podiumWins: (username: string) =>
    getJson<PodiumWins>(`/api/users/${encodeURIComponent(username)}/podium-wins`),
  eloHistory: (username: string) =>
    getJson<PublicEloChange[]>(`/api/users/${encodeURIComponent(username)}/elo-history`),
};
