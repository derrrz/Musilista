import type { CifraBlock } from '@/lib/cifra';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export type Availability = 'available' | 'busy' | 'not_looking';

export interface Profile {
  bio: string | null;
  location: string | null;
  availability: Availability;
  functions: string[];
  instruments: string[];
  competencies: string[];
  rider: string | null;
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
  blocks?: CifraBlock[];
  capo?: number;
  tuning?: string;
  favorite?: boolean;
}

export interface SongResult {
  id: string;
  title: string;
  artist: string;
}

export interface ArtistResult {
  name: string;
  count: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  inviteCode?: string;
  myRole: 'DONO' | 'ADMIN' | 'MEMBRO';
  memberCount?: number;
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
  time?: string;
  location?: string;
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

// Bloco de setlist (roteiro de show) — espelho do shape da API web
export interface SetlistBlock {
  id: string;
  title: string | null;
  notes: string | null;
  songKey: string | null;
  bpm: number | null;
  position: number;
  itemType: string | null;
  body: string | null;
  durationSec: number | null;
  segue: boolean | null;
}

export interface Repertoire {
  id: string;
  name: string;
  songs: SetlistBlock[];
}

export interface Reference {
  id: string;
  url: string;
  title: string | null;
  kind: string;
  note: string | null;
  addedBy: string;
  addedByName: string | null;
  createdAt: string;
}
