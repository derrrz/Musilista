import { notFound } from 'next/navigation';
import { db } from '@/db';
import { events, groups, eventRoles, groupMembers, users, repertoires, repertoireSongs, songs, groupSongs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/components/ui/cn';

const TYPE_LABEL: Record<string, string> = {
  show: 'Show',
  ensaio: 'Ensaio',
  other: 'Evento',
};

const TYPE_BADGE: Record<string, string> = {
  show: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  ensaio: 'border-blue-400/40 bg-blue-400/10 text-blue-400',
  other:
    'border-[color-mix(in_oklch,var(--ml-accent)_40%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)] text-accent',
};

async function getAgenda(token: string) {
  const [row] = await db
    .select({
      eventId: events.id,
      title: events.title,
      eventDate: events.eventDate,
      eventTime: events.eventTime,
      location: events.location,
      eventType: events.eventType,
      notice: events.notice,
      technicalRider: events.technicalRider,
      repertoireId: events.repertoireId,
      groupId: groups.id,
      groupName: groups.name,
      groupImage: groups.image,
    })
    .from(events)
    .innerJoin(groups, eq(groups.id, events.groupId))
    .where(eq(events.publicToken, token))
    .limit(1);

  if (!row) return null;

  const roles = await db
    .select({ label: eventRoles.roleName, assigneeName: users.name })
    .from(eventRoles)
    .leftJoin(users, eq(users.id, eventRoles.userId))
    .where(eq(eventRoles.eventId, row.eventId));

  const members = await db
    .select({ name: users.name })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, row.groupId));

  let setlist: { name: string; songs: { title: string; artist: string; key: string | null }[] } | null = null;
  if (row.repertoireId) {
    const [rep] = await db
      .select({ name: repertoires.name })
      .from(repertoires)
      .where(eq(repertoires.id, row.repertoireId))
      .limit(1);

    if (rep) {
      const items = await db
        .select({
          title: sql<string>`coalesce(${repertoireSongs.title}, ${songs.title}, ${groupSongs.title})`,
          artist: sql<string>`coalesce(${songs.artist}, ${groupSongs.artist}, '')`,
          key: repertoireSongs.songKey,
        })
        .from(repertoireSongs)
        .leftJoin(songs, eq(songs.id, repertoireSongs.songId))
        .leftJoin(groupSongs, eq(groupSongs.id, repertoireSongs.groupSongId))
        .where(eq(repertoireSongs.repertoireId, row.repertoireId))
        .orderBy(asc(repertoireSongs.position));

      setlist = { name: rep.name, songs: items };
    }
  }

  return { row, roles, members, setlist };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getAgenda(token);
  if (!data) return { title: 'Agenda · Musilista' };

  const { row } = data;
  const dateStr = new Date(row.eventDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const label = TYPE_LABEL[row.eventType] ?? 'Evento';

  return {
    title: `${row.title} · ${row.groupName}`,
    description: `${label} · ${dateStr}`,
    openGraph: {
      title: `${row.title} · ${row.groupName}`,
      description: `${label} · ${dateStr}`,
      siteName: 'Musilista',
    },
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default async function AgendaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getAgenda(token);
  if (!data) notFound();

  const { row, roles, members, setlist } = data;

  const typeKey = row.eventType?.toLowerCase() ?? 'other';
  const typeBadge = TYPE_BADGE[typeKey] ?? TYPE_BADGE.other;
  const typeLabel = TYPE_LABEL[typeKey] ?? row.eventType;

  const dateStr = new Date(row.eventDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const timeStr = row.eventTime ? row.eventTime.slice(0, 5) : null;

  return (
    <main className="min-h-screen bg-bg pb-20 text-ink">
      {/* Header */}
      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <LogoMark size={22} />
          <Wordmark className="text-xs" />
          <span className="text-line">·</span>
          <span className="text-[13px] text-muted">{row.groupName}</span>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 pt-8">
        {/* Badge + data */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              'rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.06em]',
              typeBadge,
            )}
          >
            {typeLabel}
          </span>
          <span className="text-[13px] text-muted">
            {dateStr}
            {timeStr ? ` · ${timeStr}` : ''}
          </span>
        </div>

        {/* Título */}
        <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-ink">{row.title}</h1>

        {/* Local */}
        {row.location ? (
          <p className="mb-6 text-sm text-muted">📍 {row.location}</p>
        ) : (
          <div className="h-6" />
        )}

        {/* Descrição / Notice */}
        {row.notice && (
          <Section title="Descrição">
            <p className="text-[15px] leading-relaxed text-muted">{row.notice}</p>
          </Section>
        )}

        {/* Rider técnico */}
        {row.technicalRider && (
          <Section title="Rider Técnico">
            <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface px-3.5 py-3 font-mono text-[13px] leading-relaxed text-muted">
              {row.technicalRider}
            </pre>
          </Section>
        )}

        {/* Funções / Instrumentos */}
        {roles.length > 0 && (
          <Section title="Funções & Instrumentos">
            <div className="flex flex-col gap-1.5">
              {roles.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <span className="text-sm font-medium text-ink">{r.label}</span>
                  {r.assigneeName && <span className="text-[13px] text-muted">{r.assigneeName}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Membros */}
        {members.length > 0 && (
          <Section title={`Membros (${members.length})`}>
            <div className="flex flex-wrap gap-2">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-1.5 pr-3"
                >
                  <Avatar name={m.name ?? '?'} size="sm" />
                  <span className="text-[13px] text-ink">{m.name ?? '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Setlist */}
        {setlist && (
          <Section title={`Setlist · ${setlist.name}`}>
            <div className="flex flex-col gap-1">
              {setlist.songs.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <span className="flex h-7 min-w-8 items-center justify-center rounded-md bg-raised font-mono text-[11px] font-bold text-accent">
                    {s.key ?? '—'}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-ink">{s.title}</div>
                    {s.artist && <div className="text-xs text-muted">{s.artist}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="mx-auto mt-12 max-w-xl border-t border-line px-5 pt-5 text-center font-mono text-[11px] text-faint">
        Criado com{' '}
        <a href="/" className="text-accent">
          Musilista
        </a>
      </div>
    </main>
  );
}
