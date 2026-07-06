'use client';

import Link from 'next/link';
import { RepertoirePanel } from './_components/RepertoirePanel';
import { EventCard } from './_components/EventCard';
import { MembersPanel } from './_components/MembersPanel';
import { GroupHero } from './_components/GroupHero';
import { CapabilityMap } from './_components/CapabilityMap';
import { ReferencesPanel } from './_components/ReferencesPanel';
import type { Capability, Group, GroupEvent, Member } from './_components/types';

// A página do grupo é a "segunda home" da banda: identidade no topo,
// mapa de capacidades, agenda, setlists e membros em seções verticais.
const SECTIONS = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'setlists', label: 'Setlists' },
  { id: 'referencias', label: 'Referências' },
  { id: 'membros', label: 'Membros' },
];

function SectionHeading({ id, title, action }: { id: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 id={id} className="scroll-mt-24 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function GroupDetail({
  group,
  events,
  members,
  capabilities,
  myUserId,
}: {
  group: Group;
  events: GroupEvent[];
  members: Member[];
  capabilities: Capability[];
  myUserId: string;
}) {
  const canManage = group.myRole !== 'MEMBRO';

  return (
    <div className="flex flex-col gap-10 p-8">
      <GroupHero group={group} canManage={canManage} />

      <CapabilityMap capabilities={capabilities} />

      {/* Sub-navegação por âncoras (substitui as abas antigas) */}
      <nav className="sticky top-0 z-10 -my-4 flex gap-1 border-b border-line bg-bg/95 py-0 backdrop-blur">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="-mb-px border-b-2 border-transparent px-5 py-2.5 text-sm text-muted transition-colors hover:border-line hover:text-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section>
        <SectionHeading
          id="agenda"
          title="Agenda"
          action={
            canManage ? (
              <Link
                href={`/groups/${group.id}/events/new`}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-accent px-3 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90"
              >
                + Evento
              </Link>
            ) : undefined
          }
        />
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
            Nenhum evento agendado
          </div>
        ) : (
          events.map((ev) => <EventCard key={ev.id} event={ev} groupId={group.id} canManage={canManage} />)
        )}
      </section>

      <section>
        <SectionHeading id="setlists" title="Setlists" />
        <RepertoirePanel groupId={group.id} canManage={canManage} />
      </section>

      <section>
        <SectionHeading id="referencias" title="Referências da banda" />
        <ReferencesPanel groupId={group.id} myUserId={myUserId} canManage={canManage} />
      </section>

      <section>
        <SectionHeading id="membros" title="Membros" />
        <MembersPanel members={members} />
      </section>
    </div>
  );
}
