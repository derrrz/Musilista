'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

type SongResult = { id: string; title: string; artist: string };

const LETTERS = ['0-9', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

export function Inicio({ userName, userImage, isAdmin }: { userName: string; userImage?: string | null; isAdmin?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showIndex = focused && query.trim() === '';

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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ml-bg)' }}>
      <Sidebar active="/" isAdmin={isAdmin} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar userName={userName} userImage={userImage} />

        <main className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Buscar música</h1>

          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Buscar por título ou artista…"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink text-sm outline-none focus:border-accent transition-colors"
          />

          {showIndex && (
            <div className="flex flex-wrap gap-1.5">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLetterClick(letter)}
                  className="min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  style={
                    activeLetter === letter
                      ? { background: 'color-mix(in oklch, var(--ml-accent) 15%, transparent)', borderColor: 'var(--ml-accent)', color: 'var(--ml-accent)' }
                      : { background: 'var(--ml-surface)', borderColor: 'var(--ml-line)', color: 'var(--ml-muted)' }
                  }
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {searching && <p className="text-sm text-muted">Buscando…</p>}

          {!searching && (query.length > 1 || activeLetter) && results.length === 0 && (
            <p className="text-sm text-muted">Nenhuma música encontrada.</p>
          )}

          <div className="flex flex-col gap-2">
            {results.map((s) => (
              <Link
                key={s.id}
                href={`/songs/${s.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-surface border border-line hover:border-accent transition-colors"
              >
                <span className="text-sm font-semibold text-ink">{s.title}</span>
                <span className="text-xs text-muted">{s.artist}</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
