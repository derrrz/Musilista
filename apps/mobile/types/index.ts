export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  available: boolean;
  description?: string;
  hasProfile: boolean;
}

export interface Session {
  token: string;
  user: User;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key?: string;
  coverUrl?: string;
  sections?: Section[];
  isFavorite?: boolean;
}

export interface Section {
  label: string;
  active: boolean;
  lines: Line[];
}

export interface Line {
  chord?: string;
  lyric?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  inviteCode?: string;
  myRole: 'DONO' | 'ADMIN' | 'MEMBRO';
  songCount?: number;
  memberCount?: number;
  setlistCount?: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'DONO' | 'ADMIN' | 'MEMBRO';
  avatarUrl?: string;
  available?: boolean;
}

export type EventType = 'SHOW' | 'ENSAIO' | 'OUTRO';

export interface EventRole {
  id: string;
  label: string;
  assigneeName?: string;
}

export interface GroupEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  description?: string;
  technicalRider?: string;
  setlistId?: string;
  setlistName?: string;
  roles: EventRole[];
  attendanceConfirmed: boolean;
  totalMembers: number;
  publicToken?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  iconColor?: string;
}
