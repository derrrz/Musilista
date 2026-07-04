'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import { Eyebrow, PageTitle } from '@/components/ui/Typography';

type Group = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  image: string | null;
  role: string;
  memberCount: number;
};

const ROLE_LABEL: Record<string, string> = { owner: 'Dono', admin: 'Admin', member: 'Membro' };
const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-[color-mix(in_oklch,var(--ml-accent)_15%,transparent)] text-accent',
  admin: 'bg-blue-400/15 text-blue-400',
  member: 'bg-[color-mix(in_oklch,var(--ml-muted)_15%,transparent)] text-muted',
};

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erro ao criar grupo');
        return;
      }
      const group = await res.json();
      onCreated(group.id);
    });
  }

  return (
    <Modal onClose={onClose} title="Novo Grupo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Banda do Samba"
          required
        />
        <Textarea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descrição do grupo"
          rows={3}
        />
        {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Criando...' : 'Criar Grupo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: (id: string) => void }) {
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Erro ao entrar no grupo'); return; }
      onJoined(d.id);
    });
  }

  return (
    <Modal onClose={onClose} title="Entrar com código" className="max-w-sm">
      <p className="-mt-4 mb-6 text-sm text-muted">Peça o código ao dono do grupo</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="GRP-XXXXXX"
          required
          className="h-11 text-center font-mono text-lg tracking-[0.1em]"
          aria-label="Código de convite"
        />
        {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function GroupsView({ groups }: { groups: Group[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const router = useRouter();

  function handleCreated(id: string) {
    setShowCreate(false);
    router.push(`/groups/${id}`);
  }

  function handleJoined(id: string) {
    setShowJoin(false);
    router.push(`/groups/${id}`);
  }

  return (
    <>
      <div className="p-8">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Grupos · bandas e corais</Eyebrow>
            <PageTitle>Meus Grupos</PageTitle>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
              Entrar com código
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              + Novo Grupo
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="py-20 text-center text-muted">
            <svg
              width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="mx-auto mb-3 text-faint" aria-hidden="true"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <p className="mb-2 text-base font-semibold text-ink">Nenhum grupo ainda</p>
            <p className="mb-6 text-sm">Crie um grupo ou entre com um código de convite</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowJoin(true)}>
                Entrar com código
              </Button>
              <Button onClick={() => setShowCreate(true)}>Criar Grupo</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="rounded-xl border border-line bg-raised p-5 transition-colors hover:border-accent"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-faint">
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagem externa, dimensões fixas
                      <img src={g.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]',
                      ROLE_BADGE[g.role] ?? ROLE_BADGE.member,
                    )}
                  >
                    {ROLE_LABEL[g.role] ?? g.role}
                  </span>
                </div>
                <h3 className="mb-1 text-base font-bold text-ink">{g.name}</h3>
                {g.description && (
                  <p className="mb-3 text-[13px] leading-snug text-muted">
                    {g.description.length > 80 ? g.description.slice(0, 80) + '...' : g.description}
                  </p>
                )}
                <div className={cn('flex items-center gap-2', !g.description && 'mt-3')}>
                  <span className="text-xs text-faint">
                    {g.memberCount} {g.memberCount === 1 ? 'membro' : 'membros'}
                  </span>
                  <span className="text-xs text-faint">·</span>
                  <span className="font-mono text-xs text-faint">{g.inviteCode}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
    </>
  );
}
