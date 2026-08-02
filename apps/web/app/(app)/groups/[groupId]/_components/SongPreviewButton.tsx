'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';
import { IconPlay, IconPause } from '@/components/ui/icons';

// Só um trecho toca por vez na página inteira — começar outro pausa o
// anterior (útil na lista de repertório, onde várias músicas aparecem
// juntas; na sessão de votação já é natural, só um card por vez).
let currentlyPlaying: HTMLAudioElement | null = null;

// Botão de "ouvir trecho" (30s, via Deezer, sem conta nem chave de API —
// ver app/api/song-preview/route.ts). Fica invisível se a música não tiver
// preview no catálogo deles (comum em faixa nacional/indie/autoral).
export function SongPreviewButton({ title, artist, className }: { title: string; artist: string; className?: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/song-preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      .then((r) => (r.ok ? r.json() : { previewUrl: null }))
      .then((data) => { if (!cancelled) setPreviewUrl(data.previewUrl ?? null); })
      .catch(() => { if (!cancelled) setPreviewUrl(null); });
    return () => { cancelled = true; };
  }, [title, artist]);

  useEffect(() => () => {
    if (currentlyPlaying === audioRef.current) currentlyPlaying = null;
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
    currentlyPlaying = audio;
    audio.play().catch(() => {});
  }

  if (!previewUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent',
          playing && 'border-accent text-accent',
          className,
        )}
        title={playing ? 'Pausar trecho' : 'Ouvir trecho (30s)'}
        aria-label={playing ? 'Pausar trecho' : 'Ouvir trecho'}
      >
        {playing ? <IconPause className="h-3 w-3" /> : <IconPlay className="h-3 w-3" />}
      </button>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </>
  );
}
