'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';

type SongResult = { id: string; title: string; artist: string };

const LETTERS = ['0-9', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

function SongLink({ song }: { song: SongResult }) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
    >
      <span className="text-sm font-semibold text-ink">{song.title}</span>
      <span className="text-xs text-muted">{song.artist}</span>
    </Link>
  );
}

function SongSection({ label, songs }: { label: string; songs: SongResult[] }) {
  if (songs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {songs.map((s) => (
        <SongLink key={s.id} song={s} />
      ))}
    </div>
  );
}

export function Inicio() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<SongResult[]>([]);
  const [recents, setRecents] = useState<SongResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showIndex = focused && query.trim() === '';
  const idle = query.trim() === '' && !activeLetter;

  useEffect(() => {
    fetch('/api/me/favorites')
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((d) => setFavorites((d.songs ?? []).slice(0, 5)))
      .catch(() => {});
    fetch('/api/me/recents')
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((d) => setRecents(d.songs ?? []))
      .catch(() => {});
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    setActiveLetter(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/directory?q=${encodeURIComponent(q)}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.songs ?? []);
      }
      setSearching(false);
    }, 350);
  }

  async function handleLetterClick(letter: string) {
    setActiveLetter(letter);
    setSearching(true);
    const res = await fetch(`/api/directory?letter=${encodeURIComponent(letter)}&limit=30`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.songs ?? []);
    }
    setSearching(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Acervo · busca
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Buscar música</h1>
          </div>

          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Buscar por título ou artista…"
            autoFocus
          />

          {showIndex && (
            <div className="flex flex-wrap gap-1.5">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLetterClick(letter)}
                  className={cn(
                    'min-w-[32px] rounded-lg border px-2 py-1.5 font-mono text-xs font-semibold transition-colors',
                    activeLetter === letter
                      ? 'border-accent bg-[color-mix(in_oklch,var(--ml-accent)_15%,transparent)] text-accent'
                      : 'border-line bg-surface text-muted hover:border-faint hover:text-ink',
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {searching && <p className="font-mono text-xs text-muted">Buscando…</p>}

          {!searching && (query.length > 1 || activeLetter) && results.length === 0 && (
            <p className="text-sm text-muted">Nenhuma música encontrada.</p>
          )}

          <div className="flex flex-col gap-2">
            {results.map((s) => (
              <SongLink key={s.id} song={s} />
            ))}
          </div>

          {idle && !searching && (
            <>
              <SongSection label="Favoritas" songs={favorites} />
              <SongSection label="Vistas recentemente" songs={recents} />
            </>
          )}
    </div>
  );
}
