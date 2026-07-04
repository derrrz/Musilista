'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { GroupEvent } from './types';
import { IconCheck, IconPin, IconWarning } from '@/components/ui/icons';

const TYPE_LABEL: Record<string, string> = { show: 'Show', ensaio: 'Ensaio', other: 'Outro' };
const TYPE_BADGE: Record<string, string> = {
  show: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  ensaio: 'border-blue-400/40 bg-blue-400/10 text-blue-400',
  other: 'border-line bg-surface text-muted',
};

function formatDate(dateStr: string, timeStr: string | null) {
  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return timeStr ? `${dateLabel} às ${timeStr.slice(0, 5)}` : dateLabel;
}

function ShareButton({ event, groupId }: { event: GroupEvent; groupId: string }) {
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(event.publicToken);
  const router = useRouter();

  function handleShare() {
    if (token) {
      const url = `${window.location.origin}/agenda/${token}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      window.open(url, '_blank');
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/share`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newToken = data.url.split('/agenda/')[1];
        setToken(newToken);
        const url = `${window.location.origin}/agenda/${newToken}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        window.open(url, '_blank');
        router.refresh();
      }
    });
  }

  function handleRevoke() {
    if (!confirm('Revogar o link? Ele deixará de funcionar.')) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/share`, { method: 'DELETE' });
      if (res.ok) {
        setToken(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        variant={token ? 'outline' : 'ghost'}
        size="sm"
        onClick={handleShare}
        disabled={pending}
        className={cn(token && 'border-accent text-accent')}
      >
        {pending ? '...' : token ? 'Copiar link público' : 'Compartilhar agenda'}
      </Button>
      {token && (
        <Button variant="ghost" size="sm" onClick={handleRevoke} disabled={pending}>
          Revogar
        </Button>
      )}
    </div>
  );
}

function AttendanceButton({ event, groupId }: { event: GroupEvent; groupId: string }) {
  const [confirmed, setConfirmed] = useState(event.userAcknowledged);
  const [count, setCount] = useState(event.acknowledgedCount);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (confirmed) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setConfirmed(true);
        setCount((c) => c + 1);
      }
    });
  }

  return (
    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
      <span className="text-[13px] text-muted">
        {count} {count === 1 ? 'confirmou' : 'confirmaram'} presença
      </span>
      <Button
        size="sm"
        variant={confirmed ? 'outline' : 'primary'}
        onClick={handleConfirm}
        disabled={confirmed || pending}
        className={cn('gap-1.5', confirmed && 'border-green-600 text-green-500 disabled:opacity-100')}
      >
        {confirmed ? <><IconCheck size={13} /> Confirmado</> : 'Confirmar'}
      </Button>
    </div>
  );
}

export function EventCard({ event, groupId, canManage }: { event: GroupEvent; groupId: string; canManage: boolean }) {
  return (
    <div className="mb-3 rounded-xl border border-line bg-raised p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.06em]',
              TYPE_BADGE[event.eventType] ?? TYPE_BADGE.other,
            )}
          >
            {TYPE_LABEL[event.eventType] ?? event.eventType}
          </span>
          <span className="text-[13px] text-muted">{formatDate(event.eventDate, event.eventTime)}</span>
        </div>
        {canManage && (
          <div className="flex gap-4">
            <Link
              href={`/groups/${groupId}/events/${event.id}/edit`}
              className="text-[13px] text-muted transition-colors hover:text-ink"
            >
              Editar
            </Link>
            <button
              onClick={async () => {
                if (!confirm('Excluir este evento?')) return;
                await fetch(`/api/groups/${groupId}/events/${event.id}`, { method: 'DELETE' });
                window.location.reload();
              }}
              className="text-[13px] text-muted transition-colors hover:text-red-400"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <h3 className="mb-1.5 text-xl font-bold text-ink">{event.title}</h3>

      {event.location && (
        <p className="mb-2.5 flex items-center gap-1 text-sm text-muted">
          <IconPin size={13} /> {event.location}
        </p>
      )}

      {event.notice && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-[13px] text-amber-400">
          <IconWarning size={13} /> {event.notice}
        </div>
      )}

      {event.repertoireLinks.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Repertórios</p>
          <div className="flex flex-wrap gap-2">
            {event.repertoireLinks.map((r) => (
              <span
                key={r.repertoireId}
                className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[13px] text-ink"
              >
                {r.name ?? 'Repertório'}
              </span>
            ))}
          </div>
        </div>
      )}

      {event.roles.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Funções</p>
          {event.roles.map((r) => (
            <div key={r.id} className="mb-1.5 flex items-center gap-2">
              <span className="min-w-[100px] text-[13px] text-ink">{r.roleName}</span>
              <span
                className={cn(
                  'flex-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[13px]',
                  r.userName ? 'text-ink' : 'text-muted',
                )}
              >
                {r.userName ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {canManage && <ShareButton event={event} groupId={groupId} />}

      <AttendanceButton event={event} groupId={groupId} />
    </div>
  );
}
