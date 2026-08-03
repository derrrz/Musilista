'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';
import { IconPlay, IconPause } from '@/components/ui/icons';

// Só um trecho toca por vez na página inteira — começar outro pausa o
// anterior (útil na lista de repertório, onde várias músicas aparecem
// juntas; na sessão de votação já é natural, só um card por vez, mas quem
// troca de música leva o componente inteiro pra desmontar — ver `key` nos
// usos de SessionCard — o que já pausa o áudio antigo sozinho).
let currentlyPlaying: HTMLAudioElement | null = null;

type Status = 'loading' | 'found' | 'not-found';

function useSongPreview(title: string, artist: string) {
  const [status, setStatus] = useState<Status>('loading');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/song-preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      .then((r) => (r.ok ? r.json() : { previewUrl: null }))
      .then((data) => {
        if (cancelled) return;
        setUrl(data.previewUrl ?? null);
        setStatus(data.previewUrl ? 'found' : 'not-found');
      })
      .catch(() => { if (!cancelled) { setUrl(null); setStatus('not-found'); } });
    return () => { cancelled = true; };
  }, [title, artist]);

  return { status, url };
}

// Botão de "ouvir trecho" (30s, via Deezer, sem conta nem chave de API —
// ver app/api/song-preview/route.ts). `compact` controla o estado "sem
// prévia": na sessão de votação (mais espaço, uma música por vez) mostra um
// aviso por extenso; em listas apertadas (setlist) só um ícone com tooltip.
// `autoPlay` toca sozinho assim que achar o trecho — usado na sessão de
// votação pra manter o "modo rádio" (quem estava ouvindo e votou já ouve a
// próxima, sem precisar clicar de novo); `onPlayingChange` avisa o card pai
// quando o usuário liga/desliga manualmente, pra saber se deve manter esse
// modo ligado na música seguinte.
export function SongPreviewButton({
  title, artist, compact = false, autoPlay = false, onPlayingChange,
}: {
  title: string; artist: string; compact?: boolean; autoPlay?: boolean; onPlayingChange?: (playing: boolean) => void;
}) {
  const { status, url } = useSongPreview(title, artist);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Some da tela (troca de música, fechou o card) sempre para o áudio —
  // sem isso, quem votava enquanto o trecho tocava ouvia o som travar e o
  // botão ficava preso em "pausado" sem tocar a próxima música.
  useEffect(() => () => {
    audioRef.current?.pause();
    if (currentlyPlaying === audioRef.current) currentlyPlaying = null;
  }, []);

  // Autoplay só quando o trecho é encontrado — se essa música não tiver
  // prévia, fica sem tocar (nada pra tocar mesmo), mas o "modo rádio" segue
  // ligado pra próxima que achar (quem controla isso é o pai, via a mesma
  // prop `autoPlay` recalculada a cada música).
  useEffect(() => {
    if (status !== 'found' || !autoPlay || !audioRef.current) return;
    const audio = audioRef.current;
    if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
    currentlyPlaying = audio;
    audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      onPlayingChange?.(false);
      return;
    }
    if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
    currentlyPlaying = audio;
    audio.play().catch(() => {});
    onPlayingChange?.(true);
  }

  if (status === 'loading') {
    return <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-raised" aria-hidden="true" />;
  }

  if (status === 'not-found') {
    return compact ? (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-faint"
        title="Não achamos essa música na Deezer pra tocar um trecho"
      >
        <IconPlay className="h-3.5 w-3.5 opacity-40" />
      </span>
    ) : (
      <span
        className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-line px-2.5 py-1.5 font-mono text-[10px] text-faint"
        title="Não achamos essa música no catálogo da Deezer"
      >
        🎧 sem prévia
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm transition-all active:scale-90 hover:opacity-90',
          playing && 'ring-4 ring-accent/25',
        )}
        title={playing ? 'Pausar trecho' : 'Ouvir trecho (30s)'}
        aria-label={playing ? 'Pausar trecho' : 'Ouvir trecho'}
      >
        {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
      </button>
      <audio
        ref={audioRef}
        src={url!}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </>
  );
}
