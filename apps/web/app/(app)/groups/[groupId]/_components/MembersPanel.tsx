import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/components/ui/cn';
import type { Member } from './types';

const ROLE_LABEL: Record<string, string> = { owner: 'Dono', admin: 'Admin', member: 'Membro' };
const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-[color-mix(in_oklch,var(--ml-accent)_15%,transparent)] text-accent',
  admin: 'bg-blue-400/15 text-blue-400',
  member: 'bg-[color-mix(in_oklch,var(--ml-muted)_15%,transparent)] text-muted',
};

// Só leitura — igual o app mobile, que também não tem convidar/remover/
// promover membro por aqui ainda.
export function MembersPanel({ members }: { members: Member[] }) {
  return (
    <div>
      <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Membros</h2>
      <div className="flex flex-col gap-1.5">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3.5 py-2.5"
          >
            <Avatar name={m.name || m.email} src={m.image} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{m.name || m.email}</div>
              {m.name && <div className="truncate text-xs text-muted">{m.email}</div>}
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                ROLE_BADGE[m.role] ?? ROLE_BADGE.member,
              )}
            >
              {ROLE_LABEL[m.role] ?? m.role}
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <p className="py-8 text-center text-[13px] text-faint">Nenhum membro encontrado.</p>
        )}
      </div>
    </div>
  );
}
