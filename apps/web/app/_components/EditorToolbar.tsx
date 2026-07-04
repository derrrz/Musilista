'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEditor } from '../_context/EditorContext';
import { Button } from '@/components/ui/Button';
import { IconUndo, IconRedo, IconOpenFile, IconSave, IconShare } from '@/components/ui/icons';
import { Eyebrow } from '@/components/ui/Typography';

// Barra de ações do editor (o shell do app já dá logo/nav/usuário).
// Criar e editar cifra funciona sem login; só salvar/publicar exige sessão.
export default function EditorToolbar() {
  const { activeTabId, publishDraft, saveDraft, isTabDirty, loadTabFromFile, undo, redo, canUndo, canRedo } = useEditor();
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function requireLogin() {
    router.push('/login?callbackUrl=%2Feditor');
  }

  const dirty = !!activeTabId && isTabDirty(activeTabId);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try { await loadTabFromFile(file); } catch { /* ignora */ }
  }

  async function handleSaveDraft() {
    if (!session) return requireLogin();
    setSaving(true);
    const ok = await saveDraft();
    setSaving(false);
    flash(ok ? 'Rascunho salvo!' : 'Erro ao salvar.');
  }

  async function handlePublish() {
    if (!session) return requireLogin();
    const result = await publishDraft();
    if (result === 'published') flash('Cifra publicada na base!');
    else if (result === 'pending_review') flash('Enviado para revisão.');
    else flash('Erro ao publicar.');
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface px-4">
      <Eyebrow>Editor</Eyebrow>

      <div className="mx-2 h-4 w-px bg-line" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Desfazer (Ctrl+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        <IconUndo size={15} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Refazer (Ctrl+Shift+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        <IconRedo size={15} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        {msg && <span className="font-mono text-[11px] text-accent">{msg}</span>}
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleLoad} />
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
          <IconOpenFile size={14} />
          Abrir arquivo
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving || !activeTabId} className="gap-1.5">
          <IconSave size={14} />
          {saving ? 'Salvando…' : dirty ? 'Salvar rascunho •' : 'Salvar rascunho'}
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={!activeTabId} className="gap-1.5">
          <IconShare size={14} />
          Publicar
        </Button>
      </div>
    </div>
  );
}
