'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Eyebrow } from '@/components/ui/Typography';
import { IconBack, IconCheck, IconEdit } from '@/components/ui/icons';
import type { Group } from './types';

// Hero da home do grupo: identidade em destaque — nome grande, descrição,
// membros e código de convite; admin edita nome/descrição no lugar.
export function GroupHero({ group, canManage }: { group: Group; canManage: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function copyInvite() {
    navigator.clipboard?.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    if (!name.trim()) { setError('O grupo precisa de um nome.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { setError('Não foi possível salvar. Tente de novo.'); return; }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/groups" className="flex w-fit items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink">
        <IconBack size={12} /> Grupos
      </Link>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={group.name} src={group.image ?? undefined} size="lg" shape="square" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                {group.name}
              </h1>
              {canManage && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
                  title="Editar grupo"
                >
                  <IconEdit size={16} />
                </button>
              )}
            </div>
            {group.description && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{group.description}</p>
            )}
            <p className="mt-2 font-mono text-xs text-faint">
              {group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <Eyebrow className="mb-1 block">Código de convite</Eyebrow>
          <button
            onClick={copyInvite}
            className="flex items-center gap-1 font-mono text-[15px] font-bold text-accent transition-opacity hover:opacity-80"
            title="Copiar código"
          >
            {copied ? <>copiado <IconCheck size={13} /></> : group.inviteCode}
          </button>
        </div>
      </div>

      {editing && (
        <Modal title="Editar grupo" onClose={() => setEditing(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <Textarea
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="O que é esse grupo? Estilo, propósito, vibe…"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
