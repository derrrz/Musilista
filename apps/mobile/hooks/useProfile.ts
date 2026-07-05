import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Availability, Profile } from '@/types';

export function useProfile(enabled = true) {
  return useQuery<Profile>({
    queryKey: ['profile'],
    enabled,
    queryFn: () => api.get<Profile>('/api/me/profile'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bio?: string; availability?: Availability }) =>
      api.patch('/api/me/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
