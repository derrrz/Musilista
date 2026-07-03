'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/components/ui/cn';
import {
  FUNCTION_OPTIONS,
  INSTRUMENT_OPTIONS,
  AVAILABILITY_OPTIONS,
  COMPETENCY_SUGGESTIONS,
  ARTISTIC_FUNCTIONS,
  type UserProfile,
  type Availability,
} from '@/app/_lib/profileOptions';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AVAIL_DOT: Record<Availability, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  not_looking: 'bg-faint',
};
const AVAIL_TEXT: Record<Availability, string> = {
  available: 'text-emerald-500',
  busy: 'text-amber-500',
  not_looking: 'text-muted',
};
const AVAIL_CHIP_ACTIVE: Record<Availability, string> = {
  available: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500',
  busy: 'border-amber-500/50 bg-amber-500/10 text-amber-500',
  not_looking: 'border-line bg-raised text-ink',
};

const chipIdle = 'border-line bg-raised text-muted hover:text-ink';
const chipActive =
  'border-[color-mix(in_oklch,var(--ml-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_15%,var(--ml-surface))] text-accent';

// ── View mode ─────────────────────────────────────────────────────────────────

function ViewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">{label}</h2>
      {children}
    </Card>
  );
}

function ChipList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-medium',
            accent ? chipActive : 'border-line bg-raised text-muted',
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ProfileView({ profile, userName, userEmail, userImage, onEdit }: {
  profile: UserProfile;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  onEdit: () => void;
}) {
  const availability = profile.availability ?? 'available';
  const availLabel = AVAILABILITY_OPTIONS.find((o) => o.value === availability)?.label ?? '';
  const hasContent = profile.functions.length > 0 || profile.bio || profile.location;
  const hasArtistic = profile.functions.some((f) => ARTISTIC_FUNCTIONS.includes(f));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Avatar name={userName ?? '?'} src={userImage} size="lg" shape="square" className="h-20 w-20 text-3xl" />
            <div className="min-w-0 flex-1 pt-1">
              <p className="truncate text-2xl font-bold text-ink">{userName ?? '—'}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{userEmail ?? '—'}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', AVAIL_DOT[availability])} />
                <span className={cn('text-sm font-semibold', AVAIL_TEXT[availability])}>{availLabel}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            Editar perfil
          </Button>
        </div>

        {profile.bio && <p className="text-sm leading-relaxed text-muted">{profile.bio}</p>}
        {profile.location && <p className="text-sm text-faint">📍 {profile.location}</p>}
      </Card>

      {!hasContent && (
        <Card className="flex flex-col items-center gap-3 border-dashed p-6 text-center">
          <CardTitle>Perfil em branco</CardTitle>
          <CardDescription className="text-sm">
            Adicione suas funções, instrumentos e bio para aparecer para outros profissionais.
          </CardDescription>
          <Button onClick={onEdit} className="mt-1">Completar perfil</Button>
        </Card>
      )}

      {profile.functions.length > 0 && (
        <ViewSection label="Funções">
          <ChipList items={profile.functions} accent />
        </ViewSection>
      )}

      {profile.instruments.length > 0 && (
        <ViewSection label="Instrumentos">
          <ChipList items={profile.instruments} />
        </ViewSection>
      )}

      {profile.competencies.length > 0 && (
        <ViewSection label="Competências">
          <ChipList items={profile.competencies} />
        </ViewSection>
      )}

      {hasArtistic && profile.rider && (
        <ViewSection label="Rider de Camarim">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{profile.rider}</p>
        </ViewSection>
      )}
    </div>
  );
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function EditSection({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle>{label}</CardTitle>
        <CardDescription className="mt-0.5">{description}</CardDescription>
      </div>
      {children}
    </Card>
  );
}

function FunctionChip({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors', active ? chipActive : chipIdle)}
    >
      {children}
    </button>
  );
}

function ProfileEdit({ initialData, userName, userEmail, userImage, onSaved }: {
  initialData: UserProfile;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  onSaved: (updated: UserProfile) => void;
}) {
  const [bio, setBio] = useState(initialData.bio ?? '');
  const [location, setLocation] = useState(initialData.location ?? '');
  const [availability, setAvailability] = useState<Availability>(initialData.availability ?? 'available');
  const [functions, setFunctions] = useState<string[]>(initialData.functions ?? []);
  const [instruments, setInstruments] = useState<string[]>(initialData.instruments ?? []);
  const [competencies, setCompetencies] = useState<string[]>(initialData.competencies ?? []);
  const [rider, setRider] = useState(initialData.rider ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [compInput, setCompInput] = useState('');
  const [compOpen, setCompOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(() =>
    Object.keys(FUNCTION_OPTIONS).filter((cat) =>
      FUNCTION_OPTIONS[cat].some((f) => (initialData.functions ?? []).includes(f)),
    ),
  );
  const compRef = useRef<HTMLDivElement>(null);

  const hasArtistic = functions.some((f) => ARTISTIC_FUNCTIONS.includes(f));

  const filteredSuggestions = COMPETENCY_SUGGESTIONS.filter(
    (s) => !competencies.includes(s) && s.toLowerCase().includes(compInput.toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (compRef.current && !compRef.current.contains(e.target as Node)) setCompOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  function addCompetency(value: string) {
    const trimmed = value.trim().slice(0, 50);
    if (!trimmed || competencies.includes(trimmed) || competencies.length >= 30) return;
    setCompetencies((prev) => [...prev, trimmed]);
    setCompInput('');
    setCompOpen(false);
  }

  async function save() {
    setSaveState('saving');
    try {
      const payload: UserProfile = {
        bio: bio || null, location: location || null, availability,
        functions, instruments, competencies, rider: rider || null,
      };
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setSaveState('saved');
      setTimeout(() => onSaved(payload), 800);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-24">
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={userName ?? '?'} src={userImage} size="lg" shape="square" className="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-ink">{userName ?? '—'}</p>
            <p className="truncate text-sm text-muted">{userEmail ?? '—'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              title={description}
              onClick={() => setAvailability(value)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                availability === value ? AVAIL_CHIP_ACTIVE[value] : chipIdle,
              )}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', availability === value ? AVAIL_DOT[value] : 'bg-faint')} />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <EditSection label="O que você é" description="Selecione suas identidades profissionais">
        <div className="flex flex-wrap gap-2">
          {Object.keys(FUNCTION_OPTIONS).map((cat) => {
            const count = FUNCTION_OPTIONS[cat].filter((f) => functions.includes(f)).length;
            const isOpen = expandedCats.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setExpandedCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
                }
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors',
                  isOpen || count > 0 ? chipActive : chipIdle,
                )}
              >
                {cat}
                {count > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                    {count}
                  </span>
                )}
                <span className="text-xs opacity-50">{isOpen ? '▲' : '▼'}</span>
              </button>
            );
          })}
        </div>
        {Object.entries(FUNCTION_OPTIONS)
          .filter(([cat]) => expandedCats.includes(cat))
          .map(([cat, options]) => (
            <div key={cat} className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                {cat} — especialização
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <FunctionChip key={opt} active={functions.includes(opt)} onClick={() => toggleItem(functions, setFunctions, opt)}>
                    {opt}
                  </FunctionChip>
                ))}
              </div>
            </div>
          ))}
      </EditSection>

      <EditSection label="Instrumentos" description="Instrumentos que você toca ou opera">
        <div className="flex flex-wrap gap-2">
          {INSTRUMENT_OPTIONS.map((inst) => (
            <FunctionChip key={inst} active={instruments.includes(inst)} onClick={() => toggleItem(instruments, setInstruments, inst)}>
              {inst}
            </FunctionChip>
          ))}
        </div>
      </EditSection>

      <EditSection label="Competências" description="Ferramentas e técnicas que você domina">
        {competencies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {competencies.map((comp) => (
              <span key={comp} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-medium', chipActive)}>
                {comp}
                <button
                  type="button"
                  onClick={() => setCompetencies((prev) => prev.filter((c) => c !== comp))}
                  className="text-xs leading-none opacity-60 hover:opacity-100"
                  aria-label={`Remover ${comp}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div ref={compRef} className="relative">
          <Input
            type="text"
            value={compInput}
            onChange={(e) => { setCompInput(e.target.value); setCompOpen(true); }}
            onFocus={() => setCompOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addCompetency(compInput); }
              if (e.key === 'Escape') setCompOpen(false);
            }}
            placeholder="Adicionar competência…"
            className="sm:w-72"
          />
          {compOpen && (filteredSuggestions.length > 0 || compInput.trim()) && (
            <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-raised shadow-xl sm:w-72">
              {filteredSuggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addCompetency(s); }}
                  className="w-full border-b border-line px-4 py-2.5 text-left text-sm text-ink last:border-b-0 hover:bg-surface"
                >
                  {s}
                </button>
              ))}
              {compInput.trim() && !COMPETENCY_SUGGESTIONS.includes(compInput.trim()) && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addCompetency(compInput); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-surface"
                >
                  Adicionar “{compInput.trim()}”
                </button>
              )}
            </div>
          )}
        </div>
      </EditSection>

      {hasArtistic && (
        <EditSection label="Rider de Camarim" description="O que você precisa no backstage para sua performance">
          <div className="relative">
            <Textarea
              value={rider}
              onChange={(e) => setRider(e.target.value.slice(0, 1000))}
              rows={5}
              placeholder="Ex: 2 garrafas de água sem gás, frutas frescas, toalhas limpas, espelho…"
              className="resize-none"
            />
            <span className={cn('absolute bottom-3 right-3 text-xs', rider.length > 900 ? 'text-red-400' : 'text-faint')}>
              {rider.length}/1000
            </span>
          </div>
        </EditSection>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EditSection label="Bio" description="Sua apresentação em até 280 caracteres">
          <div className="relative">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              rows={4}
              placeholder="Conte sobre sua experiência, estilo e o que faz de melhor…"
              className="resize-none"
            />
            <span className={cn('absolute bottom-3 right-3 text-xs', bio.length > 250 ? 'text-red-400' : 'text-faint')}>
              {bio.length}/280
            </span>
          </div>
        </EditSection>
        <EditSection label="Localização" description="Cidade e estado onde você está baseado">
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 100))}
            placeholder="Ex: São Paulo, SP"
          />
        </EditSection>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-4 border-t border-line bg-[color-mix(in_oklch,var(--ml-bg)_90%,transparent)] px-6 py-4 backdrop-blur-md">
        <Button onClick={save} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Salvo ✓' : 'Salvar'}
        </Button>
        {saveState === 'error' && <p className="text-sm text-red-400">Erro ao salvar. Tente novamente.</p>}
        {functions.length > 0 && saveState === 'idle' && (
          <p className="ml-auto text-xs text-faint">
            {functions.length} {functions.length === 1 ? 'função' : 'funções'}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Componente exportado — controla view/edit ─────────────────────────────────

export function ProfileForm({ initialData, userName, userEmail, userImage }: {
  initialData: UserProfile;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}) {
  const isEmpty = initialData.functions.length === 0 && !initialData.bio && !initialData.location;
  const [editing, setEditing] = useState(isEmpty);
  const [profile, setProfile] = useState<UserProfile>(initialData);

  if (editing) {
    return (
      <ProfileEdit
        initialData={profile}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        onSaved={(updated) => { setProfile(updated); setEditing(false); }}
      />
    );
  }

  return (
    <ProfileView
      profile={profile}
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      onEdit={() => setEditing(true)}
    />
  );
}
