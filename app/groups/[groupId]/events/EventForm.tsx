'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/app/_components/Sidebar';

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

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #374151',
  background: '#1a1a1a',
  color: '#e5e7eb',
  fontSize: 14,
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const FIELD_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar active="/groups" />

      {/* Main */}
      <div style={{ flex: 1 }}>
        <header style={{
          display: 'flex', alignItems: 'center', padding: '12px 24px',
          borderBottom: '1px solid #1f2937', height: 52,
        }}>
          <a href={`/groups/${groupId}`} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            ← Voltar
          </a>
        </header>

        <main style={{ padding: 32, maxWidth: 640 }}>
          <h1 style={{ margin: '0 0 32px', fontSize: 22, fontWeight: 800, color: '#fff' }}>
            {isEdit ? 'Editar Evento' : 'Novo Evento'}
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={FIELD_STYLE}>
              <label style={LABEL_STYLE}>Título *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do evento"
                required
                style={INPUT_STYLE}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>Data *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                />
              </div>
              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>Horário</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div style={FIELD_STYLE}>
              <label style={LABEL_STYLE}>Tipo</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              >
                <option value="show">Show</option>
                <option value="ensaio">Ensaio</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div style={FIELD_STYLE}>
              <label style={LABEL_STYLE}>Local</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Teatro Municipal, São Paulo"
                style={INPUT_STYLE}
              />
            </div>

            <div style={FIELD_STYLE}>
              <label style={LABEL_STYLE}>Aviso / Observação</label>
              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder="Algum aviso importante para os membros?"
                rows={3}
                style={{ ...INPUT_STYLE, resize: 'vertical' }}
              />
            </div>

            <div style={FIELD_STYLE}>
              <label style={LABEL_STYLE}>Rider Técnico</label>
              <textarea
                value={technicalRider}
                onChange={(e) => setTechnicalRider(e.target.value)}
                placeholder="Necessidades técnicas: PA, monitor, retorno, DI boxes..."
                rows={5}
                style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#f87171', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <a href={`/groups/${groupId}`} style={{
                padding: '10px 24px', borderRadius: 8, border: '1px solid #374151',
                background: 'transparent', color: '#9ca3af', fontSize: 14, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}>
                Cancelar
              </a>
              <button type="submit" disabled={pending} style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: pending ? '#4a7c0a' : '#84cc16',
                color: '#000', fontSize: 14, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
              }}>
                {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar Evento'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
