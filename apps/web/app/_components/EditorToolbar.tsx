'use client';

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useEditor } from '../_context/EditorContext';
import { Button } from '@/components/ui/Button';

// Barra de ações do editor (o shell do app já dá logo/nav/usuário).
export default function EditorToolbar() {
  const { activeTabId, publishDraft, saveDraft, isTabDirty, loadTabFromFile, undo, redo, canUndo, canRedo } = useEditor();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const ok = await saveDraft();
    setSaving(false);
    flash(ok ? 'Rascunho salvo!' : 'Erro ao salvar.');
  }

  async function handlePublish() {
    const result = await publishDraft();
    if (result === 'published') flash('Cifra publicada na base!');
    else if (result === 'pending_review') flash('Enviado para revisão.');
    else flash('Erro ao publicar.');
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface px-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Editor</span>

      <div className="mx-2 h-4 w-px bg-line" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Desfazer (Ctrl+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        ↺
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Refazer (Ctrl+Shift+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
      >
        ↻
      </button>

      <div className="ml-auto flex items-center gap-2">
        {msg && <span className="font-mono text-[11px] text-accent">{msg}</span>}
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleLoad} />
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
          Abrir arquivo
        </Button>
        {session && (
          <>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving || !activeTabId}>
              {saving ? 'Salvando…' : dirty ? 'Salvar rascunho •' : 'Salvar rascunho'}
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={!activeTabId}>
              Publicar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
