'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/components/ui/cn';

type Message = {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string | null;
  userName: string | null;
  userImage: string | null;
};
type Ticket = { id: string; title: string; status: string };

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  closed: 'Fechado',
};

export function TicketThread({ ticket, messages, isStaff }: { ticket: Ticket; messages: Message[]; isStaff: boolean }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Erro ao enviar mensagem');
        return;
      }
      setBody('');
      router.refresh();
    });
  }

  function handleStatus(status: string) {
    startTransition(async () => {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <Link href="/support" className="mb-4 block text-[13px] text-muted transition-colors hover:text-ink">
        ← Suporte
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">{ticket.title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {STATUS_LABEL[ticket.status] ?? ticket.status}
          </span>
          {isStaff && ticket.status !== 'closed' && (
            <Button variant="outline" size="sm" onClick={() => handleStatus('closed')} disabled={pending}>
              Fechar
            </Button>
          )}
          {isStaff && ticket.status === 'closed' && (
            <Button variant="outline" size="sm" onClick={() => handleStatus('open')} disabled={pending}>
              Reabrir
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'rounded-xl border p-4',
              m.isAdmin
                ? 'border-[color-mix(in_oklch,var(--ml-accent)_25%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_6%,transparent)]'
                : 'border-line bg-surface',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar name={m.userName ?? '?'} src={m.userImage} size="sm" />
              <span className="text-[13px] font-semibold text-ink">{m.userName ?? '—'}</span>
              {m.isAdmin && (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
                  Equipe
                </span>
              )}
              <span className="ml-auto font-mono text-[11px] text-faint">
                {m.createdAt &&
                  new Date(m.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleReply} className="flex flex-col gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={ticket.status === 'closed' ? 'Responder reabre o ticket…' : 'Escreva sua resposta…'}
          rows={4}
          required
          aria-label="Resposta"
        />
        {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
