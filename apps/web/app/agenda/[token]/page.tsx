import { notFound } from 'next/navigation';
import { db } from '@/db';
import { events, groups, eventRoles, groupMembers, users, repertoires, repertoireSongs, songs, groupSongs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Metadata } from 'next';

const TYPE_LABEL: Record<string, string> = {
  show: 'Show',
  ensaio: 'Ensaio',
  other: 'Evento',
};

const TYPE_COLOR: Record<string, string> = {
  show: '#f59e0b',
  ensaio: '#3b82f6',
  other: '#8b5cf6',
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

function InitialAvatar({ name }: { name: string | null }) {
  const initial = (name ?? '?').trim()[0]?.toUpperCase() ?? '?';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#1e2330',
        color: '#6c8ebf',
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: '#4b5563',
        }}
      >
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
  const typeColor = TYPE_COLOR[typeKey] ?? TYPE_COLOR.other;
  const typeLabel = TYPE_LABEL[typeKey] ?? row.eventType;

  const dateStr = new Date(row.eventDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const timeStr = row.eventTime
    ? row.eventTime.slice(0, 5)
    : null;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        color: '#e2e8f0',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '0 0 80px',
      }}
    >
      {/* Header */}
      <div style={{ background: '#111827', borderBottom: '1px solid #1f2937', padding: '16px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: '#fff' }}>
            musilista
          </span>
          <span style={{ color: '#374151', fontSize: 18 }}>·</span>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{row.groupName}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 0' }}>

        {/* Badge + data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              background: `${typeColor}22`,
              color: typeColor,
              border: `1px solid ${typeColor}55`,
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {typeLabel}
          </span>
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            {dateStr}{timeStr ? ` · ${timeStr}` : ''}
          </span>
        </div>

        {/* Título */}
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>
          {row.title}
        </h1>

        {/* Local */}
        {row.location && (
          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>
            📍 {row.location}
          </p>
        )}

        {!row.location && <div style={{ height: 24 }} />}

        {/* Descrição / Notice */}
        {row.notice && (
          <Section title="Descrição">
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
              {row.notice}
            </p>
          </Section>
        )}

        {/* Rider técnico */}
        {row.technicalRider && (
          <Section title="Rider Técnico">
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                color: '#9ca3af',
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: 'inherit',
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              {row.technicalRider}
            </pre>
          </Section>
        )}

        {/* Funções / Instrumentos */}
        {roles.length > 0 && (
          <Section title="Funções & Instrumentos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {roles.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#111827',
                    borderRadius: 8,
                    border: '1px solid #1f2937',
                  }}
                >
                  <span style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500 }}>{r.label}</span>
                  {r.assigneeName && (
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{r.assigneeName}</span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Membros */}
        {members.length > 0 && (
          <Section title={`Membros (${members.length})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: '#111827',
                    borderRadius: 8,
                    border: '1px solid #1f2937',
                  }}
                >
                  <InitialAvatar name={m.name} />
                  <span style={{ color: '#d1d5db', fontSize: 13 }}>{m.name ?? '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Setlist */}
        {setlist && (
          <Section title={`Setlist · ${setlist.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {setlist.songs.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    background: '#111827',
                    borderRadius: 8,
                    border: '1px solid #1f2937',
                  }}
                >
                  <span
                    style={{
                      minWidth: 32,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#1e2330',
                      borderRadius: 6,
                      color: '#6c8ebf',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    {s.key ?? '—'}
                  </span>
                  <div>
                    <div style={{ color: '#f3f4f6', fontSize: 14, fontWeight: 500 }}>{s.title}</div>
                    {s.artist && (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{s.artist}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          maxWidth: 560,
          margin: '48px auto 0',
          padding: '20px 20px 0',
          borderTop: '1px solid #1f2937',
          textAlign: 'center',
          color: '#374151',
          fontSize: 12,
        }}
      >
        Criado com{' '}
        <a href="https://musilista.vercel.app" style={{ color: '#6c8ebf', textDecoration: 'none' }}>
          Musilista
        </a>
      </div>
    </main>
  );
}
