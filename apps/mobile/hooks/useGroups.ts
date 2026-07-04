import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Group, GroupEvent, Member, Repertoire } from '@/types';

const ROLE_MAP: Record<string, Group['myRole']> = {
  owner: 'DONO',
  admin: 'ADMIN',
  member: 'MEMBRO',
};

interface ApiGroupRow {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  image: string | null;
  role: string;
  memberCount: number;
}

export function useGroups(enabled = true) {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    enabled,
    queryFn: async () => {
      const rows = await api.get<ApiGroupRow[]>('/api/groups');
      return rows.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? undefined,
        imageUrl: g.image ?? undefined,
        inviteCode: g.inviteCode,
        myRole: ROLE_MAP[g.role] ?? 'MEMBRO',
        memberCount: g.memberCount,
      }));
    },
  });
}

export function useGroup(id: string) {
  return useQuery<Group>({
    queryKey: ['groups', id],
    queryFn: () => api.get<Group>(`/api/mobile/groups/${id}`),
    enabled: Boolean(id),
  });
}

interface ApiRepertoireSong {
  id: string;
  title: string | null;
  notes: string | null;
  songKey: string | null;
  itemType: string;
}

interface ApiRepertoire {
  id: string;
  name: string;
  songs: ApiRepertoireSong[];
}

// A web codifica o artista dentro de notes como "artist:Fulano | resto"
function parseArtist(notes: string | null): string | undefined {
  const m = notes?.match(/^artist:([^|]+)/);
  return m ? m[1].trim() : undefined;
}

export function useGroupRepertoires(groupId: string) {
  return useQuery<Repertoire[]>({
    queryKey: ['groups', groupId, 'repertoires'],
    queryFn: async () => {
      const rows = await api.get<ApiRepertoire[]>(`/api/groups/${groupId}/repertoires`);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        songs: (r.songs ?? [])
          .filter((s) => s.itemType === 'song')
          .map((s) => ({
            id: s.id,
            title: s.title ?? '(sem título)',
            artist: parseArtist(s.notes),
            key: s.songKey ?? undefined,
          })),
      }));
    },
    enabled: Boolean(groupId),
  });
}

export function useCreateRepertoire(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ id: string; name: string }>(`/api/groups/${groupId}/repertoires`, { name }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'repertoires'] }),
  });
}

export function useAddSongToRepertoire(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { repertoireId: string; title: string; artist?: string; songKey?: string }) =>
      api.post(`/api/groups/${groupId}/repertoires/${data.repertoireId}/songs`, {
        title: data.title,
        artist: data.artist,
        songKey: data.songKey,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'repertoires'] }),
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery<Member[]>({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => api.get<Member[]>(`/api/mobile/groups/${groupId}/members`),
    enabled: Boolean(groupId),
  });
}

export function useGroupEvents(groupId: string) {
  return useQuery<GroupEvent[]>({
    queryKey: ['groups', groupId, 'events'],
    queryFn: () => api.get<GroupEvent[]>(`/api/mobile/groups/${groupId}/events`),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<Group>('/api/groups', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ id: string; name: string }>('/api/groups/join', { inviteCode: code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useCreateEvent(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      date: string;
      type: 'SHOW' | 'ENSAIO' | 'OUTRO';
      description?: string;
    }) =>
      api.post<{ id: string }>(`/api/mobile/groups/${groupId}/events`, {
        title: data.title,
        eventDate: data.date,
        eventType: data.type,
        notice: data.description,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'events'] }),
  });
}

export function useConfirmAttendance(groupId: string, eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/api/mobile/groups/${groupId}/events/${eventId}/attendance`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'events'] }),
  });
}

export function useShareEvent(groupId: string, eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ url: string }>(`/api/groups/${groupId}/events/${eventId}/share`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'events'] }),
  });
}

export function useRevokeShare(groupId: string, eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete(`/api/groups/${groupId}/events/${eventId}/share`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'events'] }),
  });
}
