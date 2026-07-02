'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

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
        body: JSON.stringify({ title, eventDate, eventTime, location, eventType, notice, technicalRider }),
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
      <Link href={`/groups/${groupId}`} className="mb-4 block text-[13px] text-muted transition-colors hover:text-ink">
        ← Voltar
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
