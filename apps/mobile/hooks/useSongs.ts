import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { parseCifraContent } from '@/lib/cifra';
import type { Song } from '@/types';

// Busca no acervo — pública, igual à Home da web
export function useSearchSongs(query: string) {
  return useQuery<Song[]>({
    queryKey: ['acervo', 'search', query],
    queryFn: async () =>
      (
        await api.get<{ songs: Song[] }>(
          `/api/directory?q=${encodeURIComponent(query)}&limit=30`,
        )
      ).songs,
    enabled: query.trim().length > 1,
    staleTime: 30_000,
  });
}

// Índice alfabético do acervo (por artista) — público
export function useLetterSongs(letter: string | null) {
  return useQuery<Song[]>({
    queryKey: ['acervo', 'letter', letter],
    queryFn: async () =>
      (
        await api.get<{ songs: Song[] }>(
          `/api/directory?letter=${encodeURIComponent(letter ?? '')}&limit=30`,
        )
      ).songs,
    enabled: Boolean(letter),
    staleTime: 30_000,
  });
}

interface AcervoSongResponse {
  id: string;
  title: string;
  artist: string;
  songKey: string | null;
  content: string;
  favorite: boolean;
}

// Cifra do acervo — pública; com sessão o backend registra o acesso (recentes)
export function useSong(id: string) {
  const qc = useQueryClient();
  return useQuery<Song>({
    queryKey: ['acervo', id],
    queryFn: async () => {
      const song = await api.get<AcervoSongResponse>(`/api/mobile/acervo/${id}`);
      // o GET acima registrou o acesso no servidor
      qc.invalidateQueries({ queryKey: ['recents'] });
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        key: song.songKey ?? undefined,
        sections: parseCifraContent(song.content),
        favorite: song.favorite,
      };
    },
    enabled: Boolean(id),
  });
}

export function useFavorites(enabled: boolean) {
  return useQuery<Song[]>({
    queryKey: ['favorites'],
    queryFn: async () =>
      (await api.get<{ songs: Song[] }>('/api/me/favorites')).songs,
    enabled,
  });
}

export function useRecents(enabled: boolean) {
  return useQuery<Song[]>({
    queryKey: ['recents'],
    queryFn: async () =>
      (await api.get<{ songs: Song[] }>('/api/me/recents')).songs,
    enabled,
  });
}

export function useToggleFavorite(songId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (favorite: boolean) =>
      api.post('/api/me/favorites', { importedSongId: songId, favorite }),
    onSuccess: (_, favorite) => {
      qc.setQueryData<Song>(['acervo', songId], (prev) =>
        prev ? { ...prev, favorite } : prev,
      );
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
