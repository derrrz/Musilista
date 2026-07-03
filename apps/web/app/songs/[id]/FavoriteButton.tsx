'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/cn';

export function FavoriteButton({ songId, initialFavorite }: { songId: string; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);

  async function toggle() {
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
      title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        favorite
          ? 'border-[color-mix(in_oklch,var(--ml-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_15%,var(--ml-surface))] text-accent'
          : 'border-line bg-raised text-muted hover:text-ink',
      )}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill={favorite ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      {favorite ? 'Favorita' : 'Favoritar'}
    </button>
  );
}
