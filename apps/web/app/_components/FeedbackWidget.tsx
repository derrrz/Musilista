'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { IconSupport, IconClose } from '@/components/ui/icons';
import { compressImage } from '@/app/_lib/compressImage';

const MAX_MESSAGE = 2000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Botão flutuante de feedback da fase beta, visível em todas as páginas.
// Qualquer um manda texto; anexar print exige login (o servidor re-checa).
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // No editor de cifras a tela já é densa; o botão continua acessível via /roadmap.
  if (pathname?.startsWith('/editor')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="print-hide fixed right-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink shadow-lg transition-opacity hover:opacity-90 active:opacity-80"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        aria-label="Enviar feedback"
      >
        <IconSupport className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const pathname = usePathname();

  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [sent, onClose]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setImage(null);
      setPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem (JPEG, PNG ou WebP)');
      setImage(null);
      setPreview(null);
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const honeypot = new FormData(e.currentTarget).get('website');
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set('message', message.trim());
        form.set('pageUrl', pathname ?? '');
        if (typeof honeypot === 'string') form.set('website', honeypot);
        if (!isLoggedIn && email.trim()) form.set('email', email.trim());
        if (isLoggedIn && image) {
          const compressed = await compressImage(image);
          if (compressed.size > MAX_IMAGE_BYTES) {
            setError('Imagem muito grande (máx. 3 MB)');
            return;
          }
          form.set('image', compressed, 'feedback.jpg');
        }
        const res = await fetch('/api/feedback', { method: 'POST', body: form });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? 'Erro ao enviar feedback');
          return;
        }
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao enviar feedback');
      }
    });
  }

  return (
    <Modal onClose={onClose} title="Feedback do beta">
      {sent ? (
        <p className="py-4 text-center text-sm text-ink">Obrigado pelo feedback! 💚</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="-mt-3 text-[13px] text-muted">
            Achou um problema ou tem uma ideia? Conta pra gente — isso ajuda muito
            a melhorar o Musilista.
          </p>
          <Textarea
            label="Mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Descreva o que aconteceu ou sua sugestão"
            rows={5}
            required
          />
          <p className="-mt-3 text-right text-[11px] text-faint">
            {message.length}/{MAX_MESSAGE}
          </p>
          {!isLoggedIn && (
            <Input
              label="E-mail (opcional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Se quiser que a gente te responda"
              maxLength={200}
            />
          )}
          {/* Honeypot: humano não vê; bot que preencher é descartado no servidor */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          {isLoggedIn ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePickImage}
                className="hidden"
              />
              {preview ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Prévia do anexo" className="h-16 w-16 rounded-lg border border-line object-cover" />
                  <Button variant="ghost" size="sm" onClick={removeImage}>
                    <IconClose className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="self-start">
                  Anexar print
                </Button>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-faint">Entre na sua conta para anexar um print.</p>
          )}
          {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
          <div className="mt-1 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending || !message.trim()}>
              {pending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
