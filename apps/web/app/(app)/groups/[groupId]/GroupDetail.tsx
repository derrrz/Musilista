'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { RepertoirePanel } from './_components/RepertoirePanel';
import { EventCard } from './_components/EventCard';
import type { Group, GroupEvent } from './_components/types';

export function GroupDetail({ group, events }: { group: Group; events: GroupEvent[] }) {
  const [tab, setTab] = useState<'repertorio' | 'agenda'>('agenda');
  const [copied, setCopied] = useState(false);
  const canManage = group.myRole !== 'MEMBRO';

  function copyInvite() {
    navigator.clipboard?.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="p-8">
      {/* Group header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/groups" className="mb-3 block text-[13px] text-muted transition-colors hover:text-ink">
            ← Grupos
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-ink">{group.name}</h1>
          {group.description && <p className="mt-1 text-sm text-muted">{group.description}</p>}
        </div>
        <div className="text-right">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Código de convite
          </p>
          <button
            onClick={copyInvite}
            className="font-mono text-[15px] font-bold text-accent transition-opacity hover:opacity-80"
            title="Copiar código"
          >
            {copied ? 'copiado ✓' : group.inviteCode}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-7 flex gap-1 border-b border-line">
        {[
          { key: 'repertorio', label: 'Repertório' },
          { key: 'agenda', label: 'Agenda' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'repertorio' | 'agenda')}
            className={cn(
              '-mb-px border-b-2 px-5 py-2.5 text-sm transition-colors',
              tab === t.key
                ? 'border-accent font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'repertorio' && <RepertoirePanel groupId={group.id} canManage={canManage} />}

      {tab === 'agenda' && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Agenda</h2>
            {canManage && (
              <Link
                href={`/groups/${group.id}/events/new`}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-accent px-3 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90"
              >
                + Evento
              </Link>
            )}
          </div>

          {events.length === 0 ? (
            <div className="py-14 text-center text-muted">
              <p>Nenhum evento agendado</p>
            </div>
          ) : (
            events.map((ev) => <EventCard key={ev.id} event={ev} groupId={group.id} canManage={canManage} />)
          )}
        </div>
      )}
    </div>
  );
}
