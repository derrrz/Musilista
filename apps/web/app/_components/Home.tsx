'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Caption } from '@/components/ui/Typography';

type SongResult = { id: string; title: string; artist: string; artistSlug?: string | null; titleSlug?: string | null };
type ArtistResult = { name: string; slug?: string | null; count: number };

// URL canônica nova quando os slugs existem; uuid legado como fallback
// (a rota /songs/[id] redireciona).
function songHref(song: SongResult): string {
  return song.artistSlug && song.titleSlug ? `/${song.artistSlug}/${song.titleSlug}` : `/songs/${song.id}`;
}

const LETTERS = ['0-9', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const FEATURES = [
  { index: '01', title: 'Acervo com 55 mil cifras' },
  { index: '02', title: 'Repertórios para grupos' },
  { index: '03', title: 'Editor A4 para imprimir' },
];

// Card de música é mais baixo que o de artista (foto pequena + texto ao
// lado, não em cima) — mesmo grid de 3 colunas, só a altura interna difere.
function SongCard({ song }: { song: SongResult }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = `/api/song-cover?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`;
  const artistPhotoUrl = `/api/artist-photo?name=${encodeURIComponent(song.artist)}`;
  // Capa do álbum primeiro (diferencia músicas do mesmo artista); sem capa,
  // cai pra foto do artista; sem nenhuma das duas, o Avatar mostra a inicial.
  return (
    <Link
      href={songHref(song)}
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 transition-colors hover:border-accent"
    >
      <Avatar
        name={song.artist}
        src={coverFailed ? artistPhotoUrl : coverUrl}
        onError={() => setCoverFailed(true)}
        size="sm"
        shape="square"
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="line-clamp-1 text-sm font-semibold text-ink">{song.title}</p>
        <p className="line-clamp-1 text-xs text-muted">{song.artist}</p>
      </div>
    </Link>
  );
}

function ArtistCard({ artist, onClick }: { artist: ArtistResult; onClick: () => void }) {
  const photoUrl = `/api/artist-photo?name=${encodeURIComponent(artist.name)}`;
  return (
    <div className="relative flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-3 py-4 text-center transition-colors hover:border-accent">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="flex flex-col items-center gap-2"
      >
        <Avatar name={artist.name} src={photoUrl} size="lg" />
        <span className="line-clamp-1 w-full text-sm font-semibold text-ink">{artist.name}</span>
        <span className="font-mono text-[11px] text-faint">{artist.count} {artist.count === 1 ? 'música' : 'músicas'}</span>
      </button>
      {artist.slug && (
        <Link
          href={`/${artist.slug}`}
          onMouseDown={(e) => e.preventDefault()}
          className="text-[11px] text-muted underline underline-offset-2 transition-colors hover:text-accent"
        >
          página do artista
        </Link>
      )}
    </div>
  );
}

function SongSection({ label, songs }: { label: string; songs: SongResult[] }) {
  if (songs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <Caption>{label}</Caption>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {songs.map((s) => (
          <SongCard key={s.id} song={s} />
        ))}
      </div>
    </div>
  );
}

function LoginTeaser() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-line bg-surface/50 px-4 py-3">
      <p className="text-sm text-muted">Entre para salvar favoritos e repertórios.</p>
      <Link
        href="/login?callbackUrl=%2F"
        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-raised"
      >
        Entrar
      </Link>
    </div>
  );
}

export function Home() {
  const { status } = useSession();
  const authed = status === 'authenticated';
  const sessionLoading = status === 'loading';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<SongResult[]>([]);
  const [recents, setRecents] = useState<SongResult[]>([]);
  // Favoritada tem prioridade: já aparece em "Favoritas", não precisa repetir em "Vistas recentemente".
  const recentsExceptFavorites = recents.filter((r) => !favorites.some((f) => f.id === r.id));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // O <input autoFocus> é focado pelo navegador assim que o HTML chega (antes
  // do React hidratar e ligar o onFocus) — o cursor já aparece na caixa, mas
  // o estado "focused" nunca vira true e o dropdown não abre. Confere depois
  // de montar se o campo já está com foco e sincroniza o estado nesse caso.
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      setFocused(true);
    }
  }, []);

  const showIndex = focused && query.trim() === '';
  const browsingArtists = !!activeLetter && !selectedArtist;

  useEffect(() => {
    if (!authed) return;
    fetch('/api/me/favorites')
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((d) => setFavorites((d.songs ?? []).slice(0, 5)))
      .catch(() => {});
    fetch('/api/me/recents')
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((d) => setRecents(d.songs ?? []))
      .catch(() => {});
  }, [authed]);

  function handleSearch(q: string) {
    setQuery(q);
    setActiveLetter(null);
    setSelectedArtist(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setArtists([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/directory?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.songs ?? []);
        setArtists(data.artists ?? []);
      }
      setSearching(false);
    }, 350);
  }

  // Índice alfabético é por artista: uma letra lista os artistas, não as músicas direto.
  async function handleLetterClick(letter: string) {
    setActiveLetter(letter);
    setSelectedArtist(null);
    setSearching(true);
    const res = await fetch(`/api/directory?letter=${encodeURIComponent(letter)}`);
    if (res.ok) {
      const data = await res.json();
      setArtists(data.artists ?? []);
    }
    setSearching(false);
  }

  async function handleArtistClick(name: string) {
    setSelectedArtist(name);
    setSearching(true);
    const res = await fetch(`/api/directory?artist=${encodeURIComponent(name)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.songs ?? []);
    }
    setSearching(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      {/* Busca em primeiro lugar — a home é a ação de procurar uma cifra */}
      <div className="flex flex-col gap-4">
        {!authed ? (
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Qual cifra você quer tocar hoje?
          </h1>
        ) : (
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Qual cifra você quer tocar hoje?
          </h2>
        )}

        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Título ou artista — ou clique para ver o índice A–Z…"
            className="h-12 px-4 text-base"
            autoFocus
          />

          {/* Painel flutuante: fica por cima do resto da página, nunca empurra o layout */}
          {focused && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 flex max-h-[420px] flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-raised p-3 shadow-2xl">
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

              {!searching && browsingArtists && artists.length === 0 && (
                <p className="text-sm text-muted">Nenhum artista encontrado.</p>
              )}

              {!searching && !browsingArtists && !!selectedArtist && results.length === 0 && (
                <p className="text-sm text-muted">Nenhuma música encontrada.</p>
              )}

              {!searching && !browsingArtists && !selectedArtist && query.trim() !== '' && results.length === 0 && artists.length === 0 && (
                <p className="text-sm text-muted">Nada encontrado para &quot;{query}&quot;.</p>
              )}

              {!searching && browsingArtists && artists.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Caption>Artistas</Caption>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {artists.map((a) => (
                      <ArtistCard key={a.name} artist={a} onClick={() => handleArtistClick(a.name)} />
                    ))}
                  </div>
                </div>
              )}

              {!searching && !browsingArtists && !!selectedArtist && results.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Caption>{`Músicas · ${selectedArtist}`}</Caption>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSelectedArtist(null)}
                      className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink"
                    >
                      ← Artistas
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {results.map((s) => (
                      <SongCard key={s.id} song={s} />
                    ))}
                  </div>
                </div>
              )}

              {/* Busca por texto: não dá pra saber se é título ou artista, então
                  traz as duas coisas — poucas músicas primeiro, artistas embaixo. */}
              {!searching && !browsingArtists && !selectedArtist && query.trim() !== '' && (
                <>
                  {results.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Caption>Músicas</Caption>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {results.map((s) => (
                          <SongCard key={s.id} song={s} />
                        ))}
                      </div>
                    </div>
                  )}
                  {artists.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Caption>Artistas</Caption>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {artists.map((a) => (
                          <ArtistCard key={a.name} artist={a} onClick={() => handleArtistClick(a.name)} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Favoritas/recentes sempre visíveis pra quem está logado — o painel
            de busca é um overlay absoluto, então não precisa escondê-las
            enquanto o campo está focado (o autoFocus deixava a home vazia). */}
        {authed ? (
          <>
            <SongSection label="Favoritas" songs={favorites} />
            <SongSection label="Vistas recentemente" songs={recentsExceptFavorites} />
          </>
        ) : (
          !sessionLoading && <LoginTeaser />
        )}
      </div>

      {!authed && (
        <footer className="flex flex-col gap-4 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
            {FEATURES.map((f) => (
              <span key={f.title} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="font-mono text-[10px] font-semibold text-accent">{f.index} /</span>
                {f.title}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[11px] text-faint">
            <span>Musilista · Cifras e repertórios</span>
            <span>·</span>
            <a href="/artistas" className="underline underline-offset-2 transition-colors hover:text-muted">
              Artistas A–Z
            </a>
            <span>·</span>
            <a href="/terms" className="underline underline-offset-2 transition-colors hover:text-muted">
              Termos e Privacidade
            </a>
            <span>·</span>
            <a href="/planos" className="underline underline-offset-2 transition-colors hover:text-muted">
              Planos
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
