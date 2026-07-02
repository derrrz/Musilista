'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';

type Ticket = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  userName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  closed: 'Fechado',
};
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-400/15 text-amber-400',
  in_progress: 'bg-blue-400/15 text-blue-400',
  closed: 'bg-[color-mix(in_oklch,var(--ml-muted)_15%,transparent)] text-muted',
};

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Erro ao abrir ticket');
        return;
      }
      const ticket = await res.json();
      router.push(`/support/${ticket.id}`);
      router.refresh();
    });
  }

  return (
    <Modal onClose={onClose} title="Novo ticket">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Assunto"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumo do problema ou dúvida"
          required
        />
        <Textarea
          label="Mensagem"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Descreva com detalhes — quanto mais contexto, mais rápido conseguimos ajudar."
          rows={5}
          required
        />
        {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
        <div className="mt-1 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Enviando...' : 'Abrir ticket'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function SupportView({ tickets, isStaff }: { tickets: Ticket[]; isStaff: boolean }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <>
      <div className="mx-auto w-full max-w-3xl p-8">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Suporte {isStaff && '· atendimento'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {isStaff ? 'Todos os tickets' : 'Meus tickets'}
            </h1>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}>+ Novo ticket</Button>
        </div>

        {tickets.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <p className="mb-2 font-semibold text-ink">Nenhum ticket ainda</p>
            <p className="mb-6 text-sm">Dúvidas, problemas ou sugestões? Abre um ticket que a gente responde.</p>
            <Button onClick={() => setShowNew(true)}>Abrir ticket</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/${t.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{t.title}</div>
                  <div className="text-xs text-muted">
                    {t.userName && <span>{t.userName} · </span>}
                    {t.updatedAt &&
                      new Date(t.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]',
                    STATUS_BADGE[t.status] ?? STATUS_BADGE.open,
                  )}
                >
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
    </>
  );
}
