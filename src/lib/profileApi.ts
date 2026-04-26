import type { UserProfile } from '../types';
import { api } from './api';

export const profileApi = {
  get: () => api.get<UserProfile>('/api/profile'),
  save: (profile: UserProfile) => api.put<void>('/api/profile', profile),
  checkUsername: (username: string) =>
    api.get<{ available: boolean; reason?: string; isMine?: boolean }>(
      `/api/profile/check-username?username=${encodeURIComponent(username)}`
    ),
};
