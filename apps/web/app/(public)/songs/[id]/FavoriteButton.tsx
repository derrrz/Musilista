'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/components/ui/cn';
import { IconHeart } from '@/components/ui/icons';

export function FavoriteButton({
  songId,
  initialFavorite,
  hasSession,
}: {
  songId: string;
  initialFavorite: boolean;
  hasSession: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!hasSession) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/songs/${songId}`)}`);
      return;
    }
    if (pending) return;
    const next = !favorite;
    setFavorite(next);
    setPending(true);
    try {
      const res = await fetch('/api/me/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importedSongId: songId, favorite: next }),
      });
      if (!res.ok) setFavorite(!next);
    } catch {
      setFavorite(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      title={hasSession ? (favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos') : 'Entre para favoritar'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        favorite
          ? 'border-[color-mix(in_oklch,var(--ml-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_15%,var(--ml-surface))] text-accent'
          : 'border-line bg-raised text-muted hover:text-ink',
      )}
    >
      <IconHeart size={14} fill={favorite ? 'currentColor' : 'none'} />
      {favorite ? 'Favorita' : 'Favoritar'}
    </button>
  );
}
