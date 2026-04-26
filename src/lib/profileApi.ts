import type { UserProfile } from '../types';
import { api } from './api';

export const profileApi = {
  get: () => api.get<UserProfile>('/api/profile'),
  save: (profile: UserProfile) => api.put<void>('/api/profile', profile),
};
