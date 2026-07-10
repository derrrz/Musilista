# DE→PARA — Web mobile (referência) → App Android

Data: 09/07/2026 · Base: apps/web em produção (commits até `ef3e4cc`) vs apps/mobile (branch main).

Legenda: ✅ replicado · 🟡 replicado com adaptação de plataforma · ❌ pendente (motivo indicado).

## 1. Estrutura e navegação

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Menu hamburger com Início / Grupos / Perfil | Tab bar inferior Cifras / Grupos / Perfil (ícones IconGuitar/IconGroups/IconProfile do DS) | ✅ (equivalente nativo intencional) |
| — | Tab bar respeitando a barra de navegação do Android (safe area) | ✅ corrigido |
| Tema claro/escuro (padrão = tema do sistema, toggle no header) | App é dark-only | ❌ pendente — exige tokenização dinâmica de todas as telas; decidir se entra no escopo |
| Rotas canônicas `/{artista}/{musica}` | App abre por id interno (`/songs/{id}` + API `/api/mobile/acervo/{id}`) | ✅ (canonical é preocupação de SEO, não do app) |

## 2. Home / Busca (aba Cifras)

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Título "Qual cifra você quer tocar hoje?" | Igual | ✅ |
| Busca debounced 350ms → `GET /api/directory?q=` (músicas + artistas) | Igual | ✅ |
| Resultados em **lista de 1 coluna** (fix `ef3e4cc`) | Lista de 1 coluna (SongCard: capa/álbum → foto do artista → inicial; título + artista) | ✅ |
| Índice A–Z **por artista**: letra → artistas → músicas do artista | Igual (letra → grade… agora lista de ArtistCards → músicas, com "← Artistas") | ✅ |
| Painel flutuante ancorado no input | Conteúdo inline abaixo do campo | 🟡 adaptação: overlay flutuante não é padrão de app; mesmo fluxo, apresentação nativa |
| Logado: Favoritas (5) + Vistas recentemente (excluindo favoritas) | Igual | ✅ |
| Anônimo: teaser "Entre para salvar favoritos e repertórios" | LoginTeaser equivalente | ✅ |
| Link "página do artista" no ArtistCard (`/{slug}`) | Tap no artista abre as músicas dele (não há página de artista no app) | 🟡 |

## 3. Viewer de cifra

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Chips Tom / Capo Nª casa / Afinação | Igual (Tom transposto junto) | ✅ |
| Favoritar (sem sessão → login) | Igual (pill IconHeart) | ✅ |
| Transpose ± com enarmonia correta (Bb, não A#) | Igual (lib harmony portada) | ✅ |
| Fonte A−/A+ (12–22, padrão 15) | Igual | ✅ |
| Metrônomo visual + BPM ±5 (40–240, padrão 90) | Igual | ✅ |
| Autoscroll play/pause + slider 10–100 px/s | Igual | ✅ |
| Blocos coloridos por tipo (verso/refrão/ponte/solo) | Igual (mesmas cores oklch→hex) | ✅ |
| Imprimir (window.print) | — | ❌ fora de escopo (recurso desktop/web) |
| Pills de versões da música | — | ❌ pendente de backend: `/api/mobile/acervo/{id}` não retorna `versions[]` |
| Registro de recentes ao abrir (com sessão) | Igual (feito pelo GET do acervo) | ✅ |

## 4. Grupos — lista

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Cards 1 coluna: imagem, badge de papel, nome, descrição, "N membros · CÓDIGO" | Igual | ✅ |
| "Entrar com código" + "+ Novo Grupo" | Igual | ✅ |

## 5. Grupo — página (reconstruída: **sem abas**)

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Hero: "← Grupos", avatar, nome grande, descrição, N membros | Igual (nome 34px) | ✅ |
| Hero: lápis (dono/admin) → modal editar nome/descrição → `PATCH /api/groups/{id}` | Igual | ✅ |
| Hero: código de convite copiável ("copiado ✓" 1,5s) | Igual | ✅ |
| Mapa de capacidades (nuvem de funções/instrumentos/competências dos membros) | — | ❌ pendente de backend: dado é prop de servidor no web; não existe rota API para o app consumir |
| Navegação âncora sticky: Agenda · Setlists · Referências · Membros | Igual (sticky no ScrollView, rolagem até a seção) | ✅ |
| **Agenda**: "+ Evento" (gestor), cards com badge tipo, data longa pt-BR + hora, local (pin), aviso (caixa âmbar), chips de repertórios, funções, editar/excluir (gestor), compartilhar/revogar link público, confirmar presença | Igual, com duas exceções abaixo | ✅ |
| Card do evento: contagem "N confirmaram presença" | Só o estado próprio ("Presença confirmada") | ❌ pendente de backend: `/api/mobile/.../events` não retorna `acknowledgedCount` |
| Card do evento: chips de **vários** setlists (N:N `repertoireLinks`) | Chip do setlist principal (`setlistName`) | 🟡 parcial — API mobile expõe só o legado 1:1; o form já grava N:N |
| **Setlists (blocos estilo Notion)**: sidebar 200px + detalhe | Chips horizontais de setlists + detalhe (sidebar fixa não cabe em tela de celular — o web também está apertado aí) | 🟡 |
| Criar setlist (gestor), renomear (lápis, gestor), excluir (gestor) | Igual | ✅ |
| 10 tipos de bloco (Música, Seção, Fala, Interação, Jam, Oração, Leitura, VT, Pausa, Nota técnica) com ícones/cores | Igual (`lib/setlistBlocks.ts` espelhado) | ✅ |
| Adicionar bloco (qualquer membro): grid de tipos → música = busca acervo + Tom/BPM/Minutos; demais = título/roteiro/duração | Igual (modal `bloco-setlist`) | ✅ |
| Bloco Seção = divisor com linha | Igual | ✅ |
| Numeração corrida só das músicas; chips tom (azul)/bpm/duração; "↓ emenda" (segue) | Igual | ✅ |
| Ações do bloco no **hover** (subir/descer/editar/remover) | Sempre visíveis (touch não tem hover) | 🟡 melhoria necessária no app |
| Reordenar → `PUT …/songs {orderedIds}` | Igual (setas ↑↓) | ✅ |
| Rodapé "N músicas · duração ~Xh" | Igual | ✅ |
| **Referências**: adicionar link (qualquer membro) + nota 280c; thumb do YouTube; ícone Spotify/link; host · autor; excluir (autor ou gestor) | Igual (1 coluna, excluir sempre visível, link abre no navegador) | ✅ |
| **Membros**: lista somente leitura, avatar, nome/email, badge papel, dot verde de disponível | Igual | ✅ |

## 6. Formulário de evento

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Título*, Data*, Horário, Tipo (Show/Ensaio/Outro), Local, Aviso, Rider Técnico | Igual | ✅ |
| **Setlists do show** (multiselect de chips + hint do link público) | Igual (`repertoireIds[]` no POST/PATCH; edição semeada do GET) | ✅ |
| Criar/editar → `POST/PATCH /api/groups/{gid}/events` | Igual | ✅ |

## 7. Perfil

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Mobile mostra **só** bio + disponibilidade (3 estados com dot colorido) | Igual (ver/editar, chips, contador 280c, barra fixa de salvar com safe area) | ✅ |
| Campos ricos (funções/instrumentos/competências/rider/local) | Ocultos no app, como no web mobile | ✅ (por estratégia) |

## 8. Login

| DE (web mobile) | PARA (app) | Status |
|---|---|---|
| Card central, logo + Beta, botão Google outline com G colorido, rodapé de termos | Igual + "Agora não" (só faz sentido no app) | ✅ |
| `mobile-signin` agora rejeita 401 "Email not verified" | App exibe a mensagem de erro no Alert | ✅ |

## 9. Fora de escopo no mobile (estratégia do produto — MobileGate no web)

Editor, Admin, Suporte, Roadmap, Planos, Termos. Sem equivalente no app, por decisão.

## 10. Pendências consolidadas (exigem decisão ou mudança no apps/web)

1. **Tema claro** no app (web segue o tema do sistema; app é dark-only).
2. **Mapa de capacidades** — precisa de uma rota API no web (ex.: `GET /api/mobile/groups/{id}/capabilities`).
3. **Contagem de presenças** no card do evento — precisa de `acknowledgedCount` na rota mobile de eventos.
4. **Chips N:N de setlists** no card do evento — precisa de `repertoireLinks` na rota mobile de eventos.
5. **Versões da música** no viewer — precisa de `versions[]` no `/api/mobile/acervo/{id}`.

> Obs.: nada disso pode ser resolvido só no app — as rotas atuais não expõem esses dados, e o apps/web não foi alterado nesta tarefa (restrição combinada).
