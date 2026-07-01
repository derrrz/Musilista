import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Song } from '@/types';

export function useSearchSongs(query: string) {
  return useQuery<Song[]>({
    queryKey: ['songs', 'search', query],
    queryFn: () => api.get<Song[]>(`/api/songs/lookup?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
    staleTime: 30_000,
  });
}

export function useSong(id: string) {
  return useQuery<Song>({
    queryKey: ['songs', id],
    queryFn: () => api.get<Song>(`/api/songs/${id}`),
    enabled: Boolean(id),
  });
}

export function useFavorites() {
  return useQuery<Song[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get<Song[]>('/api/me/favorites'),
  });
}

export function useRecents() {
  return useQuery<Song[]>({
    queryKey: ['recents'],
    queryFn: () => api.get<Song[]>('/api/me/recents'),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (songId: string) =>
      api.post('/api/me/favorites', { songId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}

export function useRegisterRecent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (songId: string) =>
      api.post('/api/me/recents', { songId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recents'] });
    },
  });
}
