'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { IconWarning } from '@/components/ui/icons';

export function DesktopOnlyNotice({ featureName }: { featureName: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <IconWarning size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">Disponível só no computador</h2>
        <p className="max-w-sm text-sm text-muted">
          {featureName} ainda não está disponível no celular — use o app ou acesse pelo computador.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        Voltar
      </Button>
    </div>
  );
}
