'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/components/ui/cn';
import { IconBack, IconCheck } from '@/components/ui/icons';

type EventFormProps = {
  groupId: string;
  eventId?: string;
  initial?: {
    title: string;
    eventDate: string;
    eventTime: string;
    location: string;
    eventType: string;
    notice: string;
    technicalRider: string;
    repertoireIds?: string[];
  };
};

export function EventForm({ groupId, eventId, initial }: EventFormProps) {
  const isEdit = !!eventId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '');
  const [eventTime, setEventTime] = useState(initial?.eventTime ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [eventType, setEventType] = useState(initial?.eventType ?? 'other');
  const [notice, setNotice] = useState(initial?.notice ?? '');
  const [technicalRider, setTechnicalRider] = useState(initial?.technicalRider ?? '');

  // setlists do grupo pra vincular ao evento (carregados no evento certo)
  const [setlists, setSetlists] = useState<{ id: string; name: string; count: number }[]>([]);
  const [repertoireIds, setRepertoireIds] = useState<string[]>(initial?.repertoireIds ?? []);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/repertoires`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string; songs?: { itemType?: string | null }[] }[]) => {
        if (Array.isArray(data)) {
          setSetlists(data.map((r) => ({
            id: r.id,
            name: r.name,
            count: (r.songs ?? []).filter((s) => (s.itemType ?? 'song') === 'song').length,
          })));
        }
      })
      .catch(() => {});
  }, [groupId]);

  function toggleSetlist(id: string) {
    setRepertoireIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const url = isEdit
        ? `/api/groups/${groupId}/events/${eventId}`
        : `/api/groups/${groupId}/events`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, eventDate, eventTime, location, eventType, notice, technicalRider, repertoireIds }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Erro ao salvar evento');
        return;
      }

      router.push(`/groups/${groupId}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl p-8">
      <Link href={`/groups/${groupId}`} className="mb-4 flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink">
        <IconBack size={12} /> Voltar
      </Link>
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-ink">
        {isEdit ? 'Editar Evento' : 'Novo Evento'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Título *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do evento"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data *"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="[color-scheme:dark]"
          />
          <Input
            label="Horário"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="[color-scheme:dark]"
          />
        </div>

        <Select label="Tipo" value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="show">Show</option>
          <option value="ensaio">Ensaio</option>
          <option value="other">Outro</option>
        </Select>

        <Input
          label="Local"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Teatro Municipal, São Paulo"
        />

        <Textarea
          label="Aviso / Observação"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="Algum aviso importante para os membros?"
          rows={3}
        />

        {setlists.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Setlists do show
            </span>
            <div className="flex flex-wrap gap-1.5">
              {setlists.map((s) => {
                const selected = repertoireIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSetlist(s.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-[color-mix(in_oklch,var(--ml-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_15%,var(--ml-surface))] text-accent'
                        : 'border-line bg-surface text-muted hover:text-ink',
                    )}
                  >
                    {selected && <IconCheck size={11} />}
                    {s.name}
                    <span className="font-mono text-[10px] text-faint">{s.count}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-faint">O roteiro completo aparece no link público da agenda.</p>
          </div>
        )}

        <Textarea
          label="Rider Técnico"
          value={technicalRider}
          onChange={(e) => setTechnicalRider(e.target.value)}
          placeholder="Necessidades técnicas: PA, monitor, retorno, DI boxes..."
          rows={5}
          className="font-mono text-[13px]"
        />

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => router.push(`/groups/${groupId}`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar Evento'}
          </Button>
        </div>
      </form>
    </div>
  );
}
