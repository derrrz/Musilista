'use client';

import { Avatar, type AvatarSize } from '@/components/ui/Avatar';
import { useState } from 'react';

// Capa do álbum (Deezer, mesma busca pública do SongPreviewButton) — sem
// capa, cai pra foto do artista; sem nenhuma das duas, o Avatar mostra a
// inicial. Mesmo padrão do SongCard em app/_components/Home.tsx.
export function SongCoverThumb({ title, artist, size = 'sm' }: { title: string; artist: string; size?: AvatarSize }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = `/api/song-cover?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
  const artistPhotoUrl = `/api/artist-photo?name=${encodeURIComponent(artist)}`;
  return (
    <Avatar
      name={artist || title}
      src={coverFailed ? artistPhotoUrl : coverUrl}
      onError={() => setCoverFailed(true)}
      size={size}
      shape="square"
    />
  );
}
