'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/components/ui/cn';

type Tab = 'users' | 'proposals' | 'tickets' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Usuários' },
  { id: 'proposals', label: 'Propostas' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'analytics', label: 'Analytics' },
];

const ROLE_LABEL: Record<string, string> = {
  user: 'Usuário', moderator: 'Moderador', admin: 'Admin', ceo: 'CEO', cto: 'CTO',
};

export function AdminView({ myRole }: { myRole: string }) {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-raised p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab myRole={myRole} />}
      {tab === 'proposals' && <ProposalsTab />}
      {tab === 'tickets' && <TicketsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

// ── Usuários ──────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string; name: string | null; email: string;
  image: string | null; role: string; createdAt: string;
};

function UsersTab({ myRole }: { myRole: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const url = q ? `/api/admin/users?q=${encodeURIComponent(q)}` : '/api/admin/users';
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(query), 300);
    return () => clearTimeout(id);
  }, [query, load]);

  async function changeRole(userId: string, role: string) {
    setSaving(userId);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Erro ao alterar o role.');
    }
    setSaving(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou e-mail…"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="font-mono text-xs text-muted">Buscando…</p>}

      {!loading && users.map((u) => {
        const locked = u.role === 'ceo' || (u.role === 'cto' && myRole !== 'ceo') || (u.role === 'admin' && myRole !== 'ceo');
        return (
          <Card key={u.id} className="flex items-center gap-3 p-3.5">
            <Avatar name={u.name ?? u.email} src={u.image} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{u.name ?? '—'}</p>
              <p className="truncate text-xs text-muted">{u.email}</p>
            </div>
            <Badge variant={u.role === 'user' ? 'neutral' : 'outline'}>
              {ROLE_LABEL[u.role] ?? u.role}
            </Badge>
            {!locked && (
              <Select
                value={u.role}
                disabled={saving === u.id}
                onChange={(e) => changeRole(u.id, e.target.value)}
                className="h-8 w-32 text-xs"
              >
                <option value="user">Usuário</option>
                <option value="moderator">Moderador</option>
                <option value="admin">Admin</option>
                {myRole === 'ceo' && <option value="cto">CTO</option>}
              </Select>
            )}
          </Card>
        );
      })}

      {!loading && users.length === 0 && (
        <p className="text-sm text-muted">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}

// ── Propostas ─────────────────────────────────────────────────────────────────

type Proposal = {
  id: string; status: string; proposedAt: string; notes: string | null;
  songId: string; title: string; artist: string;
  proposerName: string | null; proposerEmail: string;
};

function ProposalsTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/proposals')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProposals(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="font-mono text-xs text-muted">Carregando…</p>;
  if (proposals.length === 0) return <p className="text-sm text-muted">Nenhuma proposta pendente.</p>;

  return (
    <div className="flex flex-col gap-3">
      {proposals.map((p) => (
        <Card key={p.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{p.title}</p>
              <p className="truncate text-xs text-muted">{p.artist}</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-faint">
              {new Date(p.proposedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <p className="text-xs text-muted">
            Proposta de {p.proposerName ?? p.proposerEmail}
          </p>
          <Link href={`/admin/proposals/${p.id}`}>
            <Button size="sm">Revisar</Button>
          </Link>
        </Card>
      ))}
    </div>
  );
}

// ── Tickets ───────────────────────────────────────────────────────────────────

type AdminTicket = {
  id: string; title: string; status: string;
  updatedAt: string | null; userName: string | null; userEmail?: string;
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  open: 'Aberto', in_progress: 'Em andamento', closed: 'Fechado',
};

function TicketsTab() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('open');

  useEffect(() => {
    fetch('/api/tickets')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.all)) setTickets(d.all); })
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(['open', 'in_progress', 'closed', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg border px-3 py-1 text-xs font-medium transition-colors',
              filter === f
                ? 'border-accent bg-[color-mix(in_oklch,var(--ml-accent)_15%,transparent)] text-accent'
                : 'border-line bg-raised text-muted hover:text-ink',
            )}
          >
            {f === 'all' ? 'Todos' : TICKET_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading && <p className="font-mono text-xs text-muted">Carregando…</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-muted">Nenhum ticket aqui.</p>}

      {visible.map((t) => (
        <Link key={t.id} href={`/support/${t.id}`}>
          <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-accent">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{t.title}</p>
              <p className="truncate text-xs text-muted">{t.userName ?? '—'}</p>
            </div>
            <Badge variant={t.status === 'open' ? 'outline' : 'neutral'}>
              {TICKET_STATUS_LABEL[t.status] ?? t.status}
            </Badge>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// Dashboard do Web Analytics na Vercel (dados independentes dos nossos)
const VERCEL_ANALYTICS_URL =
  process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_URL ??
  'https://vercel.com/lopesedersouza-7157s-projects/musilista/analytics';

type Overview = { configured: boolean; pv7d?: number; pvToday?: number; uniques24h?: number; online?: number; lightShare?: number };
type DailyRow = { day: string; pv: number };
type PageRow = { path: string; count: number };
type ReferrerRow = { referrer: string; count: number };
type CampaignRow = { source: string; medium: string | null; campaign: string | null; count: number };
type GoogleData = {
  configured: boolean;
  overview?: { users: number; sessions: number; pageViews: number; avgSessionSec: number } | null;
  channels?: { channel: string; sessions: number }[] | null;
  queries?: { query: string; clicks: number; impressions: number }[] | null;
};

const CLARITY_DASH_URL = 'https://clarity.microsoft.com/projects/view/xitday2x52/impressions';

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function AnalyticsTab() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [google, setGoogle] = useState<GoogleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics?metric=overview').then((r) => r.json()),
      fetch('/api/admin/analytics?metric=daily').then((r) => r.json()),
      fetch('/api/admin/analytics?metric=top_pages').then((r) => r.json()),
      fetch('/api/admin/analytics?metric=referrers').then((r) => r.json()),
      fetch('/api/admin/analytics?metric=campaigns').then((r) => r.json()),
      fetch('/api/admin/analytics?metric=google').then((r) => r.json()),
    ])
      .then(([ov, dl, tp, rf, cp, gg]) => {
        setOverview(ov);
        if (Array.isArray(dl)) setDaily(dl);
        if (Array.isArray(tp)) setPages(tp);
        if (Array.isArray(rf)) setReferrers(rf);
        if (Array.isArray(cp)) setCampaigns(cp);
        if (gg && typeof gg === 'object') setGoogle(gg);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    // "online agora" fica vivo enquanto a aba está aberta
    const id = setInterval(() => {
      fetch('/api/admin/analytics?metric=overview')
        .then((r) => r.json())
        .then((ov) => setOverview(ov))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p className="font-mono text-xs text-muted">Carregando…</p>;
  if (error || !overview || overview.configured === false) {
    return <p className="text-sm text-muted">Analytics não configurado ou indisponível.</p>;
  }

  const maxPv = Math.max(1, ...daily.map((d) => Number(d.pv)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <a
          href={CLARITY_DASH_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          ▶ Gravações de sessão (Clarity)
        </a>
        <a
          href={VERCEL_ANALYTICS_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <svg width="11" height="11" viewBox="0 0 76 65" fill="currentColor" aria-hidden="true">
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
          </svg>
          Relatório completo na Vercel
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="flex flex-col gap-1 p-4">
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Online agora
          </span>
          <span className="font-mono text-2xl font-bold text-ink">{String(overview.online ?? 0)}</span>
        </Card>
        {[
          { label: 'Views · hoje', value: overview.pvToday },
          { label: 'Views · 7d', value: overview.pv7d },
          { label: 'Visitantes · 24h', value: overview.uniques24h },
          { label: 'Tema claro · 48h', value: `${overview.lightShare ?? 0}%` },
        ].map((m) => (
          <Card key={m.label} className="flex flex-col gap-1 p-4">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              {m.label}
            </span>
            <span className="font-mono text-2xl font-bold text-ink">{String(m.value ?? 0)}</span>
          </Card>
        ))}
      </div>

      {daily.length > 0 && (
        <Card className="flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Views · últimos 14 dias
          </span>
          <div className="flex h-24 items-end gap-1">
            {daily.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.pv} views`}
                className="min-w-0 flex-1 rounded-t bg-accent/70"
                style={{ height: `${Math.max(4, (Number(d.pv) / maxPv) * 100)}%` }}
              />
            ))}
          </div>
        </Card>
      )}

      {pages.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Páginas mais vistas · 7d
          </span>
          {pages.map((p) => (
            <div key={p.path} className="flex items-center justify-between gap-3">
              <a href={p.path} target="_blank" rel="noreferrer" className="truncate font-mono text-xs text-ink hover:text-accent">
                {p.path}
              </a>
              <span className="shrink-0 font-mono text-xs text-muted">{String(p.count)}</span>
            </div>
          ))}
        </Card>
      )}

      {referrers.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Origem do tráfego · 48h
          </span>
          {referrers.map((r) => (
            <div key={r.referrer} className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-xs text-ink">{r.referrer}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{String(r.count)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Dados do Google centralizados (GA4 + Search Console) */}
      {google?.configured && google.overview && (
        <Card className="flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Google Analytics · 7 dias
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Usuários', value: String(google.overview.users) },
              { label: 'Sessões', value: String(google.overview.sessions) },
              { label: 'Views', value: String(google.overview.pageViews) },
              { label: 'Sessão média', value: fmtDuration(google.overview.avgSessionSec) },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-surface p-3">
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{m.label}</span>
                <span className="font-mono text-xl font-bold text-ink">{m.value}</span>
              </div>
            ))}
          </div>
          {google.channels && google.channels.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Canais</span>
              {google.channels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-ink">{c.channel}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{c.sessions}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {google?.configured && google.queries && google.queries.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Buscas no Google · 28 dias
          </span>
          {google.queries.map((q) => (
            <div key={q.query} className="flex items-center justify-between gap-3">
              <span className="truncate text-xs text-ink">{q.query}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {q.clicks} cliques · {q.impressions} impressões
              </span>
            </div>
          ))}
        </Card>
      )}

      {google && !google.configured && (
        <Card className="flex flex-col gap-1 border-dashed">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Google Analytics + Search Console
          </span>
          <p className="text-xs text-muted">
            Dados do GA4 e das buscas do Google aparecem aqui quando a conexão for configurada
            (service account — envs GOOGLE_SA_JSON, GA4_PROPERTY_ID e GSC_SITE).
          </p>
        </Card>
      )}

      {campaigns.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Campanhas (UTM) · 48h
          </span>
          {campaigns.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-xs text-ink">
                {c.source}
                {c.medium ? ` / ${c.medium}` : ''}
                {c.campaign ? ` · ${c.campaign}` : ''}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">{String(c.count)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
