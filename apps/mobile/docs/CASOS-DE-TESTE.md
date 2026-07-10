# Casos de teste — App Musilista (paridade com web mobile)

Data: 09/07/2026 · Build: release apontando para produção (musilista.vercel.app).
Para comparar: abra o web no navegador do celular lado a lado com o app.

Convenção: cada caso tem pré-condição, passos e resultado esperado. Marque ✅/❌.

## CT-01 · Layout — tab bar vs botões do Android
1. Abra o app em qualquer aba.
2. Observe o rodapé.
- **Esperado:** a tab bar (Cifras/Grupos/Perfil) fica inteira acima da barra de navegação do Android; nenhum botão fica encoberto. O mesmo vale para a barra "Salvar" na edição do perfil e para os botões no fim dos formulários.

## CT-02 · Busca por texto (anônimo)
1. Sem login, aba Cifras.
2. Digite "amor".
- **Esperado:** título "Qual cifra você quer tocar hoje?"; resultados em **lista de 1 coluna** (como no web mobile), cada linha com capa/foto/inicial + título + artista; seção "Artistas" abaixo quando houver.

## CT-03 · Índice A–Z por artista
1. Campo de busca vazio, toque na letra "A".
2. Toque em um artista.
3. Toque em "← Artistas".
- **Esperado:** letra mostra **artistas** (com foto e "N músicas"), não músicas; tocar no artista lista as músicas dele; o back volta à lista de artistas. Igual ao web.

## CT-04 · Viewer de cifra — controles
1. Abra uma música com tom definido (ex.: tom G).
2. Toque em Tom "−" duas vezes.
3. Toque em Fonte "A+" três vezes.
4. Ative o metrônomo e mude o BPM.
5. Ative o autoscroll e mova o slider.
- **Esperado:** (2) acordes e chip "Tom" transpõem juntos; tons bemóis exibem Bb/Eb (não A#/D#). (3) fonte cresce até 22. (4) dot pulsa no ritmo, BPM 40–240 em passos de 5. (5) rolagem automática com velocidade ajustável; pause funciona.

## CT-05 · Viewer — chips e favoritar
1. Abra uma música com capo/afinação no acervo.
2. Sem login, toque em "Favoritar".
3. Faça login e favorite.
- **Esperado:** chips Tom/Capo/Afinação iguais ao web; sem sessão vai para o login; com sessão o pill fica ativo ("Favorita") e a música aparece em Favoritas na aba Cifras.

## CT-06 · Favoritas e recentes (logado)
1. Logado, abra 2 músicas; favorite 1 delas.
2. Volte à aba Cifras com o campo vazio.
- **Esperado:** "Favoritas" lista a favoritada; "Vistas recentemente" lista a outra (**sem** repetir a favoritada — mesma regra do web).

## CT-07 · Grupo — página sem abas + navegação âncora
1. Logado, abra um grupo.
- **Esperado:** página única com: "← Grupos", avatar + **nome grande**, descrição, "N membros", código de convite; barra **Agenda · Setlists · Referências · Membros** que fica fixa no topo ao rolar; tocar em cada item rola até a seção. Não há mais abas.

## CT-08 · Grupo — editar identidade (dono/admin)
1. Como dono/admin, toque no lápis ao lado do nome.
2. Altere nome e descrição, salve.
3. Repita logado como membro comum.
- **Esperado:** (2) modal salva e a página reflete. (3) membro **não vê** o lápis.

## CT-09 · Grupo — copiar código de convite
1. Toque no código (verde, mono).
- **Esperado:** vira "copiado ✓" por ~1,5s; o código está na área de transferência.

## CT-10 · Setlists — criar/renomear/excluir (gestor)
1. Como dono/admin: "+ Novo Setlist" → "Show Teste" → Criar.
2. Toque no lápis ao lado do nome → renomeie.
3. "Excluir" → confirme.
4. Repita como membro comum.
- **Esperado:** (1–3) funcionam; (4) membro **não vê** "+ Novo Setlist", lápis nem "Excluir" — mas vê os setlists.

## CT-11 · Setlist — bloco de música
1. Em um setlist, "+ Bloco" → "Música".
2. Busque e selecione uma música; preencha Tom "G", BPM "120", Minutos "4".
3. Adicionar.
- **Esperado:** grid com os 10 tipos de bloco (Música, Seção, Fala/Recado, Interação, Jam/Improviso, Oração/Ministração, Leitura, VT/Playback, Pausa, Nota técnica); a música entra numerada, com chips G (azul), "120 bpm" e "4 min"; rodapé atualiza "N músicas · duração ~…".

## CT-12 · Setlist — blocos não musicais
1. "+ Bloco" → "Seção" → nome "Abertura".
2. "+ Bloco" → "Fala / Recado" → título + roteiro + 2 minutos.
- **Esperado:** Seção vira divisor (label + linha); Fala vira card com ícone de microfone, preview do texto e duração. Igual ao web.

## CT-13 · Setlist — reordenar/editar/remover (qualquer membro)
1. Logado como **membro comum**, num setlist com 3+ blocos: use ↑/↓ num bloco.
2. Toque no lápis de um bloco de música, mude o Tom, salve.
3. Toque no ✕ de um bloco, confirme.
- **Esperado:** tudo funciona para membro comum (no web os blocos são geríveis por qualquer membro); as ações são **sempre visíveis** (no web só aparecem no hover); a ordem persiste após puxar para atualizar.

## CT-14 · Referências da banda
1. Em "Referências da banda", "+ Adicionar referência".
2. Cole um link do YouTube + nota; adicione.
3. Toque no card.
4. Tente excluir uma referência sua; depois (como membro) uma de outra pessoa.
- **Esperado:** (2) card com thumbnail do vídeo, título, nota e "youtube.com · Seu Nome". (3) abre no navegador/app do YouTube. (4) o ✕ aparece só nas suas (membro) ou em todas (dono/admin).

## CT-15 · Evento — criar com setlists vinculados
1. Como gestor: Agenda → "+ Evento".
2. Preencha Título, Data, Horário, Tipo Show, Local, Aviso, Rider.
3. Em "Setlists do show", selecione 1+ setlists.
4. Crie.
- **Esperado:** form igual ao web (incl. multiselect de setlists com hint "O roteiro completo aparece no link público da agenda"); card criado mostra badge Show, data com hora, local com pin, aviso em caixa âmbar e o chip do repertório.

## CT-16 · Evento — editar/excluir (gestor) e presença (todos)
1. Como gestor: lápis no card → mude o horário e os setlists → salve.
2. ✕ no card → confirme exclusão de um evento de teste.
3. Como membro: "Confirmar presença" em um evento.
- **Esperado:** (1) edição semeia todos os campos, incl. setlists marcados. (2) some da agenda. (3) vira "✓ Presença confirmada"; membro não vê lápis/✕/compartilhar.

## CT-17 · Evento — link público
1. Como gestor: "Gerar link público" → compartilhe consigo mesmo.
2. Abra o link no navegador.
3. "Revogar" → abra o link de novo.
- **Esperado:** (2) página pública da agenda com o roteiro do(s) setlist(s). (3) após revogar, o link deixa de funcionar.

## CT-18 · Perfil — 3 estados + bio
1. Perfil → "Editar perfil".
2. Selecione "Ocupado"; escreva uma bio de ~270 caracteres; salve.
3. Compare com o web mobile.
- **Esperado:** 3 chips (Disponível=verde, Ocupado=âmbar, Inativo=cinza); contador fica vermelho perto de 280; barra "Salvar" fixa acima dos botões do Android; a visualização mostra dot+label coloridos; web mobile mostra o mesmo (e apenas bio+disponibilidade, como o app).

## CT-19 · Gates de login
1. Deslogado: abra Grupos e Perfil; tente favoritar.
- **Esperado:** telas de "Entre para…" com botão Entrar; busca e leitura de cifra seguem livres (paridade com o web público).

## CT-20 · Regressão visual geral
1. Percorra: login, Cifras, cifra aberta, Grupos, grupo, modais.
- **Esperado:** dark "Console" consistente (fundo #0f1214, lime #a1e645, mono nos códigos/acordes), ícones de linha retos, sem emoji na UI, nada encoberto pelas barras do sistema.

---

## Divergências conhecidas (não são falha de teste)

| Item | Situação |
|---|---|
| Tema claro | Web segue o tema do sistema; app é dark-only (pendência declarada) |
| Mapa de capacidades do grupo | Só no web (sem rota de API para o app) |
| "N confirmaram presença" | App mostra só o próprio estado (API mobile não retorna contagem) |
| Vários setlists no card do evento | App mostra 1 chip (API mobile retorna só o principal); o vínculo N:N é gravado corretamente |
| Versões da música no viewer | Só no web (API mobile não retorna versões) |
| Imprimir cifra | Recurso de desktop, fora do escopo mobile |
