export const FUNCTION_OPTIONS: Record<string, string[]> = {
  'Músico / Artista': [
    'Artista / Headliner',
    'Vocalista Principal',
    'Backing Vocal',
    'Instrumentista',
    'DJ / Controller',
    'VJ',
    'Maestro / Regente',
    'Dançarino / Performer',
    'Band Leader',
  ],
  'Produtor': [
    'Produtor Musical',
    'Produtor Executivo',
    'Compositor / Arranjador',
    'Letrista',
  ],
  'Técnico': [
    'FOH Engineer',
    'Monitor Engineer / A2',
    'System Tech',
    'Backline Tech',
    'Operador de PA',
    'RF / IEM Tech',
    'Lighting Designer',
    'Operador de Luz',
    'Video Operator / VT',
    'LED Tech',
    'Rigger',
  ],
  'Manager / Gestão': [
    'Tour Manager',
    'Manager Artístico',
    'Promoter',
    'Rider Advance',
    'Hospitality',
    'Assessor de Imprensa',
  ],
  'Produção de Show': [
    'Stage Manager',
    'Diretor de Palco',
    'Roadie',
    'Auxiliar de Palco',
    'Set Designer',
  ],
  'Suporte & Logística': [
    'Segurança / Crowd Control',
    'Motorista / Runner',
    'Fotógrafo',
    'Videomaker / DOP',
    'Auxiliar Geral',
  ],
}

export const ALL_FUNCTIONS = Object.values(FUNCTION_OPTIONS).flat()

export const ARTISTIC_FUNCTIONS = [
  'Artista / Headliner',
  'Vocalista Principal',
  'Backing Vocal',
  'Instrumentista',
  'DJ / Controller',
  'VJ',
  'Maestro / Regente',
  'Dançarino / Performer',
]

export const INSTRUMENT_OPTIONS = [
  'Guitarra Elétrica',
  'Violão / Guitarra Acústica',
  'Baixo',
  'Bateria',
  'Percussão',
  'Piano / Teclado',
  'Sintetizador',
  'Voz',
  'Violino',
  'Viola',
  'Violoncelo',
  'Trompete',
  'Trombone',
  'Saxofone',
  'Flauta',
  'Acordeão',
  'Cavaquinho',
  'Ukulele',
]

export const COMPETENCY_SUGGESTIONS = [
  // Áudio
  'Pro Tools', 'Avid S6L', 'Yamaha CL/QL', 'DiGiCo SD',
  'Allen & Heath dLive', 'L-Acoustics', 'd&b audiotechnik',
  'Stage Plot', 'Input List', 'RF Management', 'Line Array',
  // Luz / Vídeo
  'grandMA3', 'grandMA2', 'Avolites', 'Resolume Arena', 'QLab', 'Vectorworks',
  // Produção
  'Rider Management', 'Budget', 'Event Planning', 'Contract',
  // Música
  'Leitura de Partitura', 'Leitura de Cifra', 'Transposição',
  'MIDI', 'Ableton Live', 'Loop Station',
  // Mídia
  'Premiere Pro', 'DaVinci Resolve', 'Lightroom',
  // Geral
  'Primeiros Socorros', 'CNH-B', 'Inglês Técnico', 'Bilingue (EN/PT)',
]

export const AVAILABILITY_OPTIONS = [
  { value: 'available',   label: 'Disponível',   description: 'Disponível para trabalhos' },
  { value: 'busy',        label: 'Ocupado',       description: 'Ocupado no momento'        },
  { value: 'not_looking', label: 'Inativo',       description: 'Não estou procurando'      },
] as const

export type Availability = 'available' | 'busy' | 'not_looking'

export type UserProfile = {
  bio:           string | null
  location:      string | null
  availability:  Availability
  functions:     string[]
  instruments:   string[]
  competencies:  string[]
  rider:         string | null
}
