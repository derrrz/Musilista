import type { Metadata } from 'next';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Roadmap · Musilista' };

type Initiative = { title: string; note: string };

// Portado do roadmap legado (kanban de localStorage); versão estática —
// as fases e itens agora são editados aqui no código.
const BOARD: { label: string; items: Initiative[] }[] = [
  {
    label: 'Agora',
    items: [
      { title: 'Cifra animada em tempo real', note: 'Destacar o acorde ativo na cifra (letra + acordes) em sincronia com o BPM.' },
    ],
  },
  {
    label: 'Em breve',
    items: [
      { title: 'Exportação de PDF', note: 'Gerar PDF da cifra em formato A4 com layout, fontes e margens configuráveis.' },
      { title: 'Modo ao vivo', note: 'Apresentar cifras em tela cheia para ensaios e shows, com controle remoto pelo celular.' },
    ],
  },
  {
    label: 'Depois',
    items: [
      { title: 'Módulo embutível', note: 'Widget de cifra para incorporar em sites e blogs externos via iframe ou script.' },
      { title: 'App mobile', note: 'Versão nativa para iOS e Android com suporte offline e visualização em ensaios.' },
    ],
  },
  {
    label: 'Concluído',
    items: [
      { title: 'Reconstrução do web app', note: 'Design system Console em todas as telas, Next 16, Tailwind v4 e remoção do app legado.' },
      { title: 'Editor de cifras', note: 'Editor técnico com parser de texto, transposição e diagramas de acorde.' },
      { title: 'Grupos, agenda e repertórios', note: 'Bandas e corais com eventos, funções, confirmação de presença e link público de agenda.' },
      { title: 'Busca no acervo', note: 'Busca por título/artista e índice alfabético sobre o acervo importado.' },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="p-8">
      <div className="mb-7 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          Beta · planejamento
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Roadmap</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BOARD.map((phase) => (
          <div key={phase.label} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {phase.label}
              </span>
              <span className="font-mono text-[11px] text-faint">{phase.items.length}</span>
            </div>
            {phase.items.map((item) => (
              <Card key={item.title} className="flex flex-col gap-1.5 p-4">
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="leading-relaxed">{item.note}</CardDescription>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
