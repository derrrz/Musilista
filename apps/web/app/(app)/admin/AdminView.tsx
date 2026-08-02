'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/components/ui/cn';

type Tab = 'users' | 'proposals' | 'tickets' | 'feedback' | 'analytics' | 'infra';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Usuários' },
  { id: 'proposals', label: 'Propostas' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'infra', label: 'Infra' },
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
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'infra' && <InfraTab />}
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

// ── Feedback (beta) ───────────────────────────────────────────────────────────

type AdminFeedback = {
  id: string; message: string; email: string | null;
  imageUrl: string | null; pageUrl: string | null; status: string;
  createdAt: string; userName: string | null; userEmail: string | null;
  userImage: string | null;
};

const FEEDBACK_STATUS_LABEL: Record<string, string> = {
  new: 'Novo', seen: 'Visto', resolved: 'Resolvido',
};

function FeedbackToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d?.feedbackEnabled)))
      .catch(() => setEnabled(true));
  }, []);

  async function toggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setEnabled(next); // otimista — reverte se a chamada falhar
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackEnabled: next }),
    });
    if (!res.ok) setEnabled(!next);
    setSaving(false);
  }

  return (
    <Card className="flex items-center justify-between gap-3 p-3.5">
      <div>
        <CardTitle>Widget de feedback</CardTitle>
        <CardDescription>
          {enabled === null ? 'Carregando…' : enabled ? 'Visível pra todo mundo no site.' : 'Escondido — ninguém vê o botão de feedback.'}
        </CardDescription>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled ?? false}
        disabled={enabled === null || saving}
        onClick={toggle}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50',
          enabled ? 'border-accent bg-accent' : 'border-line bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </Card>
  );
}

function FeedbackTab() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'seen' | 'resolved'>('new');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.items)) setItems(d.items); })
      .finally(() => setLoading(false));
  }, []);

  async function changeStatus(id: string, status: string) {
    setError(null);
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } else {
      setError('Erro ao alterar o status.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este feedback? A imagem anexada também será apagada.')) return;
    setError(null);
    const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((f) => f.id !== id));
    } else {
      setError('Erro ao excluir.');
    }
  }

  const visible = filter === 'all' ? items : items.filter((f) => f.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <FeedbackToggle />

      <div className="flex flex-wrap gap-1.5">
        {(['new', 'seen', 'resolved', 'all'] as const).map((f) => (
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
            {f === 'all' ? 'Todos' : FEEDBACK_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="font-mono text-xs text-muted">Carregando…</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-muted">Nenhum feedback aqui.</p>}

      {visible.map((f) => (
        <Card key={f.id} className="flex flex-col gap-3 p-3.5">
          <div className="flex items-start gap-3">
            {f.imageUrl && (
              <a href={f.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.imageUrl}
                  alt="Anexo do feedback"
                  className="h-16 w-16 rounded-lg border border-line object-cover transition-opacity hover:opacity-80"
                />
              </a>
            )}
            <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap text-ink">{f.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="truncate">
              {f.userName ?? f.userEmail ?? (f.email ? `Anônimo · ${f.email}` : 'Anônimo')}
            </span>
            {f.pageUrl && <span className="truncate font-mono">{f.pageUrl}</span>}
            <span>{new Date(f.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={f.status}
              onChange={(e) => changeStatus(f.id, e.target.value)}
              className="h-8 w-36 text-xs"
            >
              {(['new', 'seen', 'resolved'] as const).map((s) => (
                <option key={s} value={s}>{FEEDBACK_STATUS_LABEL[s]}</option>
              ))}
            </Select>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => remove(f.id)} className="text-red-400 hover:text-red-300">
              Excluir
            </Button>
          </div>
        </Card>
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
      {/* Dados do Google primeiro (GA4 + Search Console) — filtram por consentimento
          e execução de JS real, então são o retrato mais "limpo" de quem é gente. */}
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
            (service account — envs GOOGLE_SA_JSON_B64, GA4_PROPERTY_ID e GSC_SITE).
          </p>
        </Card>
      )}

      {/* Analytics próprio (sem cookie, sem consentimento) + atalho pro Vercel —
          útil como contraprova quando o GA4 ainda tem poucos dados. */}
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

// ── Infra (cotas Neon + Blob) ─────────────────────────────────────────────────

type NeonInfra =
  | { configured: false }
  | {
      configured: true;
      name: string;
      transferBytes: number;
      transferLimitBytes: number;
      storageBytes: number;
      storageLimitBytes: number;
      computeHours: number;
      computeHoursLimit: number;
      activeHours: number;
      branchesLimit: number;
      plan: string;
      periodStart: string;
      periodEnd: string;
    };

type BlobInfra =
  | { configured: false }
  | { configured: true; suspended: boolean; checkedAt: string; error?: string };

type CoverageStat = { covered: number; total: number };
type MediaCoverage = { artists: CoverageStat; songs: CoverageStat } | null;

type InfraData = { neonDev: NeonInfra; neonProd: NeonInfra; blob: BlobInfra; coverage: MediaCoverage };

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(999, Math.round((used / limit) * 100));
}

function barColor(p: number): string {
  if (p >= 100) return 'bg-red-500';
  if (p >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function QuotaRow({ label, used, limit, usedLabel, invert }: {
  label: string; used: number; limit: number; usedLabel: string;
  // Cotas: alto = ruim (vermelho). Cobertura: alto = bom (verde) — inverte o
  // sentido da cor sem inventar outra escala.
  invert?: boolean;
}) {
  const p = pct(used, limit);
  const colorPct = invert ? 100 - p : p;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-ink">{usedLabel} <span className="text-faint">· {p}%</span></span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
        <div className={cn('h-full rounded-full transition-all', barColor(colorPct))} style={{ width: `${Math.min(100, p)}%` }} />
      </div>
    </div>
  );
}

function NeonCard({ title, data }: { title: string; data: NeonInfra }) {
  if (!data.configured) {
    return (
      <Card className="flex flex-col gap-1 border-dashed p-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Não monitorado ainda — falta configurar NEON_API_KEY / NEON_PROJECT_ID pra esse projeto.
        </CardDescription>
      </Card>
    );
  }

  const alerts = [
    pct(data.transferBytes, data.transferLimitBytes) >= 80,
    pct(data.storageBytes, data.storageLimitBytes) >= 80,
  ].filter(Boolean).length;

  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="font-mono text-[11px]">{data.name} · {data.plan}</CardDescription>
        </div>
        {alerts > 0 && (
          <span className="inline-flex items-center rounded-md border border-yellow-500 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-yellow-500">
            Atenção
          </span>
        )}
      </div>

      <QuotaRow
        label="Transferência de dados"
        used={data.transferBytes}
        limit={data.transferLimitBytes}
        usedLabel={`${fmtBytes(data.transferBytes)} / ${fmtBytes(data.transferLimitBytes)}`}
      />
      <QuotaRow
        label="Storage"
        used={data.storageBytes}
        limit={data.storageLimitBytes}
        usedLabel={`${fmtBytes(data.storageBytes)} / ${fmtBytes(data.storageLimitBytes)}`}
      />
      <QuotaRow
        label="Compute time"
        used={data.computeHours}
        limit={data.computeHoursLimit}
        usedLabel={`${data.computeHours.toFixed(1)}h / ${data.computeHoursLimit}h`}
      />

      <div className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
        <span>Branches: {data.branchesLimit} máx.</span>
        <span>Reset em {daysLeft(data.periodEnd)}d ({new Date(data.periodEnd).toLocaleDateString('pt-BR')})</span>
      </div>
    </Card>
  );
}

function BlobCard({ data }: { data: BlobInfra }) {
  if (!data.configured) {
    return (
      <Card className="flex flex-col gap-1 border-dashed p-4">
        <CardTitle>Vercel Blob</CardTitle>
        <CardDescription>Não monitorado — falta BLOB_READ_WRITE_TOKEN.</CardDescription>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Vercel Blob</CardTitle>
        <span className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
          data.suspended ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500',
        )}>
          {data.suspended ? 'Suspenso' : 'Ok'}
        </span>
      </div>
      <CardDescription>
        {data.suspended
          ? 'Escrita bloqueada — cota de operações avançadas estourada. Novos uploads falham até resetar o ciclo ou fazer upgrade do plano.'
          : 'Escrita funcionando normalmente.'}
      </CardDescription>
      <p className="text-[11px] text-faint">
        Checado às {new Date(data.checkedAt).toLocaleTimeString('pt-BR')} · número exato de operações e reset do ciclo só aparecem no{' '}
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-accent hover:underline">
          dashboard da Vercel
        </a>.
      </p>
    </Card>
  );
}

function CoverageCard({ data }: { data: MediaCoverage }) {
  if (!data) {
    return (
      <Card className="flex flex-col gap-1 border-dashed p-4">
        <CardTitle>Cobertura de imagens</CardTitle>
        <CardDescription>Não foi possível calcular agora.</CardDescription>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <CardTitle>Cobertura de imagens</CardTitle>
      <CardDescription>
        Quantas bandas/músicas do catálogo já têm foto ou capa cacheada (Deezer → Blob).
      </CardDescription>
      <QuotaRow
        invert
        label="Fotos de artista"
        used={data.artists.covered}
        limit={data.artists.total}
        usedLabel={`${data.artists.covered} / ${data.artists.total} artistas`}
      />
      <QuotaRow
        invert
        label="Capas de música"
        used={data.songs.covered}
        limit={data.songs.total}
        usedLabel={`${data.songs.covered} / ${data.songs.total} músicas`}
      />
    </Card>
  );
}

function InfraTab() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/infra')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="font-mono text-xs text-muted">Carregando…</p>;
  if (error || !data) return <p className="text-sm text-muted">Não foi possível carregar o status de infra.</p>;

  const bannerAlerts: string[] = [];
  for (const [label, n] of [['Neon dev', data.neonDev], ['Neon prod', data.neonProd]] as const) {
    if (!n.configured) continue;
    if (pct(n.transferBytes, n.transferLimitBytes) >= 100) bannerAlerts.push(`${label}: transferência de dados estourada`);
    else if (pct(n.transferBytes, n.transferLimitBytes) >= 80) bannerAlerts.push(`${label}: transferência de dados perto do limite`);
    if (pct(n.storageBytes, n.storageLimitBytes) >= 80) bannerAlerts.push(`${label}: storage perto do limite`);
  }
  if (data.blob.configured && data.blob.suspended) bannerAlerts.push('Vercel Blob: escrita suspensa');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Cotas de Neon (Postgres), Vercel Blob e cobertura de imagens — atualiza a cada carregamento.</p>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); load(); }}>Atualizar</Button>
      </div>

      {bannerAlerts.length > 0 && (
        <Card className="flex flex-col gap-1.5 border-red-500/40 bg-red-500/5 p-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-400">Alertas</span>
          {bannerAlerts.map((a) => (
            <p key={a} className="text-xs text-red-300">⚠ {a}</p>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NeonCard title="Neon · Dev" data={data.neonDev} />
        <NeonCard title="Neon · Produção" data={data.neonProd} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BlobCard data={data.blob} />
        <CoverageCard data={data.coverage} />
      </div>
    </div>
  );
}
