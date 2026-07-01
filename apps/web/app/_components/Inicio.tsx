'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';

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
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="/" isAdmin={isAdmin} />

      <div className="flex flex-1 flex-col">
        <TopBar userName={userName} userImage={userImage} />

        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
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
              <Link
                key={s.id}
                href={`/songs/${s.id}`}
                className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
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
