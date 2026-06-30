import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';

export function useProfile() {
  return useQuery<User>({
    queryKey: ['profile'],
    queryFn: () => api.get<User>('/api/me/profile'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { description?: string; available?: boolean }) =>
      api.patch<User>('/api/me/profile', data),
    onSuccess: (updated) => {
      qc.setQueryData(['profile'], updated);
    },
  });
}
