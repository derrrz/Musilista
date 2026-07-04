import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile } from '@/types';

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
    mutationFn: (data: { description?: string; available?: boolean }) =>
      api.patch('/api/me/profile', {
        ...(data.description !== undefined && { bio: data.description }),
        ...(data.available !== undefined && {
          availability: data.available ? 'available' : 'busy',
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
