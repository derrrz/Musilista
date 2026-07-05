import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { parseCifraContent, parseCifraHeaderMeta } from '@/lib/cifra';
import type { ArtistResult, Song, SongResult } from '@/types';

export interface DirectorySearch {
  songs: SongResult[];
  artists: ArtistResult[];
}

// Busca no acervo — pública, igual à Home da web (retorna músicas E artistas)
export function useSearchSongs(query: string) {
  return useQuery<DirectorySearch>({
    queryKey: ['acervo', 'search', query],
    queryFn: () =>
      api.get<DirectorySearch>(`/api/directory?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
    staleTime: 30_000,
  });
}

// Índice alfabético do acervo — por ARTISTA, como na web
export function useLetterArtists(letter: string | null) {
  return useQuery<ArtistResult[]>({
    queryKey: ['acervo', 'letter', letter],
    queryFn: async () =>
      (
        await api.get<{ artists: ArtistResult[] }>(
          `/api/directory?letter=${encodeURIComponent(letter ?? '')}`,
        )
      ).artists,
    enabled: Boolean(letter),
    staleTime: 30_000,
  });
}

// Músicas de um artista do índice
export function useArtistSongs(artist: string | null) {
  return useQuery<SongResult[]>({
    queryKey: ['acervo', 'artist', artist],
    queryFn: async () =>
      (
        await api.get<{ songs: SongResult[] }>(
          `/api/directory?artist=${encodeURIComponent(artist ?? '')}`,
        )
      ).songs,
    enabled: Boolean(artist),
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
      const meta = parseCifraHeaderMeta(song.content);
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        key: song.songKey ?? undefined,
        blocks: parseCifraContent(song.content),
        capo: meta.capo,
        tuning: meta.tuning,
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
