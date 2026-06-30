import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Group, GroupEvent, Member, Song } from '@/types';

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<Group[]>('/api/groups'),
  });
}

export function useGroup(id: string) {
  return useQuery<Group>({
    queryKey: ['groups', id],
    queryFn: () => api.get<Group>(`/api/groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useGroupSongs(groupId: string) {
  return useQuery<Song[]>({
    queryKey: ['groups', groupId, 'songs'],
    queryFn: () => api.get<Song[]>(`/api/groups/${groupId}/songs`),
    enabled: Boolean(groupId),
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery<Member[]>({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => api.get<Member[]>(`/api/groups/${groupId}/members`),
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
    mutationFn: (code: string) => api.post<Group>('/api/groups/join', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useAddSongToGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (songId: string) =>
      api.post(`/api/groups/${groupId}/songs`, { songId }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'songs'] }),
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
    }) => api.post<GroupEvent>(`/api/mobile/groups/${groupId}/events`, data),
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
