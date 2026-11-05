# 06 — Canvas, widgets e notas

> **Resumo:** a área de trabalho da sala é um canvas com espaços (slots) em grade ou em tira, mais janelas flutuantes. O layout é só do aparelho. Widgets "da sala" têm um único estado no servidor; os pessoais não saem do aparelho.
>
> **Arquivos-chave:** `src/client/canvas/model.ts`, `RoomCanvas.tsx`, `drag.ts`, `geometry.ts`, `slot-spans.ts`, `strip-input.ts`, `strip-wheel.ts`, `WidgetCatalog.tsx`, `widgets.tsx`, `ModuleWidget.tsx`, `CustomWidget.tsx`, `src/server/widgets.ts`, `src/server/notes.ts`, `src/shared/widgets.ts`, `src/shared/room-modules.ts`, `src/shared/dice.ts`, `src/shared/permissions.ts`, `src/shared/palettes.ts`, `src/shared/colors.ts`.
>
> **Docs:** `docs/CANVAS.md` (desatualizado em pontos, ver Achados), `docs/decisoes/001` e `004`. Os tópicos a seguir resumem o que está no código.
>
> **Limite desta leitura:** `WidgetFrame.tsx`, `GridPicker.tsx`, `GridTools.tsx`, `PeopleWidget`, `CamerasWidget`, `MyStreamWidget`, `ChatWidget`, `NotShown` e os trechos visuais de `ModuleWidget` foram lidos só por busca, não inteiros. Itens que dependem deles estão marcados "(não confirmado)".
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

1. **Estado do layout.** `src/client/canvas/model.ts` › `CanvasStore` guarda um `CanvasState` com `schemaVersion: 2` (~L86). Cada `change()` faz `structuredClone`, sobe `revision` e avisa os ouvintes (React usa `useSyncExternalStore`). O layout inicial (`newCanvas`) é `strip-left`, proporção 0,7 e 4 espaços vazios.
2. **Presets.** `grid-RxC` (linhas 1–3, colunas 1–4; `MAX_GRID` 3×4, ~L9) e `strip-left|right|top|bottom`. Nomes antigos são traduzidos por `legacyPresets` (~L35). `autoGrid(count)` (~L18) escolhe a menor grade que mostra tudo.
3. **Slots.** Cada slot tem `span` e `mergedIds`. `gridPlacement` (~L163) posiciona por linha e retorna `null` se os spans não ladrilham a grade; nesse caso `restoreCanvas` (~L811) refaz a grade. Na tira, os spans empilham na vertical, no máximo 3 unidades. `canRemoveSlot` (~L134) só vale na tira e exige que sobrem ao menos 4 unidades.
4. **Juntar e dividir.** `mergeSlots`/`splitSlot` usam `rectangularUnion` (`slot-spans.ts`). Juntar leva o widget coberto ao próximo espaço livre; sem espaço, ele vai a `hidden` ("Não exibidos"). Espaço vazio juntado recebe o widget coberto. Teste: `tests/grid-merge.test.ts`.
5. **Janelas flutuantes.** `Floating` tem `rect` proporcional, `minimized`, `parked` e `previousSlot`. `fitted` limita o tamanho entre 0,15 e 1 (padrão 0,34 × 0,4). `floatingBox` impõe mínimo de 180×120 (`geometry.ts`).
6. **Foco e foco único.** `focusId` destaca um widget no espaço principal. `single` é o "Foco único" da barra. `freeMovement` libera o arrastar sem encaixe (não confirmado o gatilho na interface).
7. **Persistência.** `restoreCanvas` lê `vio:canvas:v2` ou, se faltar, `vio:canvas:v1` (~L212). Ignora texto bruto acima de 150000 caracteres e recusa mais de 512 slots ou 128 widgets. `persistentCanvas` (~L686) remove widgets `transient` (telas e instâncias compartilhadas), ofertas, `single` e `focusId`. Tipos antigos são fundidos: people/call/mixer viram Pessoas; stream/viewers/connection/quick viram Minha transmissão. Os tipos `notes` e `time` são descartados e o slot fica vazio. A proporção é limitada a 0,4–0,8.
8. **Arrastar.** `RoomCanvas.tsx` usa `@dnd-kit/react` com `feedback: "none"` e `dropAnimation: null`, para não mover nem clonar o host de vídeo (invariante do CLAUDE.md). Ativação: mouse após 4 px, toque após 8 px. As falas de acessibilidade estão em pt-BR.
   - Soltar sobre um slot: `store.reorder`.
   - Soltar fora de qualquer slot: `store.detach` (flutua).
   - Shift (`shortcuts.ts` › `snap`) encaixa no slot.
   - Shift perto da borda (`edgeAt`, `EdgeBands`, `FocusGhost`) cria `strip-<lado>` com foco.
   - Na tira, arrastar ao longo dela reordena.
   - Teclado: espaço inicia, setas escolhem o próximo slot por `adjacentDropSlot` (`drag.ts` ~L23), espaço termina.
   - `dropSlotAt` (`drag.ts` ~L12) faz o hit test pelo ponteiro.
9. **Geometria.** `useCanvasGeometry` usa `ResizeObserver` e `IntersectionObserver` (limiares 0, .05, .5, 1; visível se razão > 0,05). O recorte `inset()` ignora cortes menores que 2 px. Em tela cheia, o dock sobe (`--dock-lift`, `underDock` com margem de 14 px e ±230 px).
10. **Tira e rolagem.** `strip-wheel.ts`/`strip-input.ts`: a roda espera `WHEEL_IDLE_MS` 150 ms, anima por `STRIP_ANIMATION_MS` 300 ms (ease-out cúbico) e encaixa em paradas. Deslize de toque vale a partir de 8 px; o clique seguinte é suprimido por 350 ms. `visibleSlots` é 3 no desktop e calculado pela altura no modo compacto (`RoomCanvas.tsx` ~L1210).
11. **Compacto.** Largura < 680 (`RoomCanvas.tsx` ~L1145) vira uma coluna, linhas 16:9, sem posições de grade.
12. **Telas (screen).** Widget `screen:<publicationId>`, `transient`. A demanda de vídeo é `off|focus|small|fit`; altura = altura × min(DPR, 1,5), arredondada para cima a múltiplo de 120, entre 120 e 2160, com debounce de 220 ms; `small` se a altura < 330 (`widgets.tsx` › `ScreenWidget`). Chega ao servidor como ação `demand`.
13. **Ofertas.** Nova transmissão ou pedido de ver alguém gera uma `Offer` no slot. A pessoa escolhe flutuar, novo slot ou recusar (diálogo em `RoomCanvas.tsx`). Aviso de entrada/saída de pessoas dura 4000 ms; de nova transmissão, 6000 ms.
14. **Catálogo.** `WidgetCatalog.tsx` tem abas Assistir (stream, cameras), Conversar (chat, people), Decidir e jogar (poll, dice, random, custom), Tempo (timer, tasks) e Comunidade (vazia, "Em breve"). A busca (`catalog-search.ts`) ignora acento (`plain`, NFD) e exige que toda palavra case, também na descrição.
15. **Criar: "Para mim" ou "Para a sala".** Só poll, dice, random, tasks, timer e custom (`roomKind`, `WidgetCatalog.tsx` ~L53) podem ser da sala, e só se `canRoom`. Chat é só da sala (`roomOnly`, ~L56) e exige `chatAllowed && canRoom`. Escolha feita na criação, sem "compartilhar depois" (ADR 001).
16. **Instância da sala no cliente.** `{type: contentKind, config:{sharedId}, transient: true}` (`room-content.ts` › `roomContentKind`). O estado real vem de `widget-updated`. Teste: `tests/room-content.test.ts`.
17. **Fechar.** "−" esconde só para mim (guarda o id em `vio:widgets:closed`). "×" encerra para todos: `widget-delete` e desfazer por 8000 ms (`closedWidgetHold`, `widget-restore`). Dono, criador da sala ou admin com `adminClose` podem encerrar (`rooms.ts` › `mayClose` ~L1010).
18. **Servidor: ações de widget** (`rooms.ts` ~L908–1030). Todas passam por `useWidget`/`require` e por zod `.strict()`:
    - `widget-create`: recusa `kind: "notes"` e conteúdo só de texto ("Notas foram substituídas pelo Chat."). Chat exige `manages`. Exige `adminCreate`/`guestCreate`.
    - `widget-structure`: exige `guestEdit` e `revision`; senão `WIDGET_CONFLICT`.
    - `widget-operate`: `guestControl` para timer, `guestEdit` para o resto.
    - `module-interact`: reset, task, session e poll-control exigem `guestControl`.
    - `chat-send`: exige `guestChat`.
    - `widget-permission`: só quem gerencia a sala; pode liberar por pessoa (`guestEditors`) ou para todos (`allGuestsEdit`).
19. **Quem pode agir.** `canUseWidget` (`permissions.ts`): permissão da sala para o papel, ou `allGuestsEdit`, ou estar em `guestEditors`. O criador sempre pode; admin pode tudo que não começa com `admin`, que depende da chave.
20. **Difusão.** `emitWidget` manda `widget-updated` à sala. Para enquete, manda um por pessoa com `viewModuleState`, que esconde os votos dos outros enquanto aberta. Chat usa o evento `chat-message`.
21. **Cronômetro.** O servidor guarda `startedAt`; cada cliente calcula o tempo (`timerElapsed`). Alarme: `timerAlarmMs` 60000. Desligar o alarme e silenciar valem para todos. Teste: `tests/widget-timer.test.ts`.
22. **Dados.** `rollDice` (`shared/dice.ts`) não usa `eval` (analisador próprio) e sorteia com `crypto.randomInt`. Resultado e autor entram no histórico do widget.
23. **Notas.** O widget "Notas" foi aposentado. Sobram `RoomNotes` (cópias de nota enviadas, imutáveis) e o bloco `text` de widgets `custom`. Cópia repetida do mesmo id é deduplicada; mudar o conteúdo com o mesmo id dá `NOTE_CONFLICT`.
24. **Caminhos de erro.** `RATE_LIMIT` (balde por `socket.data.id + ":" + ação`), `WIDGET_LIMIT`, `WIDGET_CONFLICT`, `NOTE_LIMIT`, `NOTE_CONFLICT`, `FORBIDDEN`, `NOT_FOUND`. Cada um com mensagem em português.

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Grade máxima | 3 linhas × 4 colunas | `model.ts` › `MAX_GRID` (~L9) |
| Slots / widgets ao restaurar | ≤ 512 / ≤ 128 | `model.ts` › `restoreCanvas` |
| Texto salvo máximo | 150000 caracteres | `model.ts` ~L212 |
| Proporção tira/foco | 0,4–0,8 (passo 0,05 no controle) | `model.ts`, `RoomCanvas.tsx` |
| Janela flutuante mínima | 180×120 | `geometry.ts` › `floatingBox` |
| Registro: mínimo / preferido | 140×100 / 340×280 | `widgets.tsx` › `widgetRegistry` |
| Arrastar (mouse / toque) | 4 px / 8 px | `RoomCanvas.tsx` |
| Roda / animação da tira | 150 ms / 300 ms | `strip-wheel.ts`, `strip-input.ts` |
| Supressão de clique após deslize | 350 ms | `strip-input.ts` |
| Demanda de tela | altura 120–2160, passo 120, debounce 220 ms | `widgets.tsx` |
| Widgets por sala / por criador | 32 / 6 | `server/widgets.ts` ~L74 |
| Chats por sala | 4 | `shared/widgets.ts` › `chatBudget.widgets` |
| Chat: mensagens / caracteres | 100 / 32000 | `chatBudget` |
| Histórico de módulo | 20 resultados / 8000 caracteres | `historyBudget` |
| Widgets encerrados guardados | 32 | `server/widgets.ts` ~L145 |
| Desfazer encerramento | 8000 ms | `closedWidgetHold` (~L164) |
| Blocos por widget | ≤ 6 | `widgetContent` (~L66) |
| Placar | inteiro ±999999 | `widgetBlock` (score) |
| Texto de bloco / nota | ≤ 2000 | `widgetBlock`, `noteCopyInput` |
| Rótulo | 1–64 | `label` (~L13) |
| Timer: duração / decorrido / voltas | 0–86400 s / ≤ 604800 s / ≤ 20 | `widgetBlock`, `timerLapLimit` |
| Alarme do timer | 60000 ms | `timerAlarmMs` |
| Cópias de nota | 12 por pessoa, 60 por sala | `server/notes.ts` ~L29 |
| Enquete | pergunta ≤ 120, 2–12 opções, prazo 0–86400 s, ≤ 5000 votos | `room-modules.ts` |
| Dados | expressão ≤ 200; 1–20 repetições; ≤ 100 dados; faces 1–1.000.000; orçamento 500 resultados; profundidade 24 | `room-modules.ts`, `dice.ts` |
| Sorteio | 2–50 opções, peso 1–1000 | `room-modules.ts` |
| Tarefas | 1–30 itens, responsável ≤ 64, duração ≤ 86400 s | `room-modules.ts` |
| Aceleração roll/draw | 300 ms por pessoa e widget (`RATE_LIMIT`) | `server/widgets.ts` (~L242–250, chave `module:<pessoa>:<widget>`) |
| Dedup de operações | até 4096 chaves `pessoa:widget:operationId`, sai a mais antiga | `server/widgets.ts` (~L239–281, ~L299–306) |
| Taxas por minuto (balde) | chat-send 45; module-interact 240 (rajada 60); widget-create 20; widget-structure 120 (rajada 40); widget-operate 300 (rajada 60); widget-permission 30; widget-delete 30; widget-restore 30 | `rooms.ts` ~L525–551; `security.ts` › `Limits.take` (janela 60000 ms) |
| Ids de widgets fechados no aparelho | 100 | `closed-widgets.ts` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| `CanvasStore` + `useSyncExternalStore` | Layout imutável com notificação | `model.ts` |
| `@dnd-kit/react` com `feedback:"none"` | Arrastar sem mover o host de vídeo | `RoomCanvas.tsx` |
| `ResizeObserver`/`IntersectionObserver` | Medir e recortar o que aparece | `geometry.ts` |
| `rectangularUnion` | Validar junção retangular de células | `slot-spans.ts` |
| Registro de widgets (`widgetRegistry`) | Metadados: tamanho, flutuar, `autoHide` (só Pessoas) | `widgets.tsx` |
| `camera-layout.ts` | Modo coluna/linha/tira das câmeras; `SPEAKER_HOLD_MS` 1500; lateral 3 itens (4 em linha sem tela estreita) | `camera-layout.ts` |
| zod `.strict()` + `widgetSchemas` | Validar toda carga de widget | `shared/widgets.ts` |
| `revision` + `WIDGET_CONFLICT` | Controle otimista de edição concorrente | `server/widgets.ts` |
| `operationId` | Deduplicar toques repetidos | `server/widgets.ts` |
| `viewModuleState` | Esconder votos alheios | `room-modules.ts` |
| `moduleResets`/`moduleTitles`/`defaultModule` | Reiniciar estado e nomear módulos | `room-modules.ts` |
| Paletas (`palettes.ts`) | Cores da roleta e da enquete: indigo, sunset, forest, candy e "random" harmônica | `shared/palettes.ts` |
| `colors.ts` | Normalizar hex, contraste, tinta legível, HSV | `shared/colors.ts` |
| `RoomNotes` | Cópias imutáveis de nota por pessoa | `server/notes.ts` |

## Catálogo de widgets

| Widget | Escopo | Estado e onde vive | Quem age | Limites |
| --- | --- | --- | --- | --- |
| Pessoas (people) | Pessoal | Derivado do snapshot da sala; layout no aparelho | Cada pessoa para si; moderação por regras da sala (não confirmado o menu) | `autoHide` |
| Câmeras (cameras) | Pessoal | Streams P2P; layout em `camera-layout.ts` | Cada pessoa | Ver `camera-layout.ts` |
| Minha transmissão (stream) | Pessoal | Estado de captura local | Dono | Ver docs de mídia |
| Tela (screen) | Pessoal, transitório | Uma publicação | Quem assiste | Demanda 120–2160 |
| Chat | Da sala | `messages` no servidor | `guestChat` ou admin/criador | 4 por sala, 100 msgs, 32000 chars, 700 ms entre mensagens por autor |
| Enquete (poll) | Da sala ou pessoal | `moduleState` no servidor | Votar: qualquer um; controlar: `guestControl` | 12 opções, 5000 votos |
| Dados (dice) | Da sala ou pessoal | Histórico no servidor | Rolar: qualquer um | 20 resultados no histórico |
| Sorteio (random) | Da sala ou pessoal | `moduleState` | Sortear: qualquer um; editar: `guestEdit` | 50 opções |
| Tarefas (tasks) | Da sala ou pessoal | `moduleState` | `guestControl`/`guestEdit` | 30 itens |
| Timer | Da sala ou pessoal | `startedAt` no servidor | `guestControl` | Ver Números |
| Placar/custom | Da sala ou pessoal | Blocos score/text/timer | `guestEdit` | 6 blocos |
| Notas | **Aposentado** | Só `RoomNotes` e bloco `text` | Remetente | 12/60 cópias |
| Canvas | **Só registro** ("Em breve") | Nenhum | Ninguém | `createWidget` lança erro |

## Salvo só no aparelho (localStorage)

| Chave | Conteúdo | Onde |
| --- | --- | --- |
| `vio:canvas:v2` (lê também `v1`) | Layout, posições, flutuantes | `model.ts` ~L212–232 |
| `vio:widgets:closed` | Ids fechados com "−" (100) | `closed-widgets.ts` |
| `vio:catalog-tab` | Última aba do catálogo | `WidgetCatalog.tsx` |
| `vio:poll-chart` | Estilo do gráfico da enquete | `PollFace.tsx` |
| `vio:raffle-wheel` | Roda visível ou não | `RaffleFace.tsx` |
| `vio:preferences`, `vio:room-credentials` | Preferências e credenciais; fora desta pasta (não detalhado aqui) | grep em `client/canvas` e `client/room` |

## Checklist de widget novo

1. Esquema zod `.strict()` com tamanhos limitados em `shared/widgets.ts` (`widgetSchemas`); se for
   módulo, também em `shared/room-modules.ts`.
2. Servidor: lógica em `server/widgets.ts`; ações e taxas em `rooms.ts` (`rates` em `bind`
   ~L518–551, ações ~L908–1030); dono e permissão conferidos por `canUseWidget`
   (`shared/permissions.ts`).
3. Cliente: entrada no `widgetRegistry` (`canvas/widgets.tsx`), com componente próprio ou
   `ModuleWidget`; aba e `roomKind` em `WidgetCatalog.tsx`; `roomContentKind` em
   `canvas/room-content.ts`.
4. Invariantes: um só estado para a sala; toda ação passa pelo servidor; estado só local apenas
   em widget pessoal ou preferência (volume, posição).
5. Testes: `tests/room-content.test.ts` e `tests/widget-timer.test.ts` servem de modelo.
6. Esta ficha: uma linha no **Catálogo de widgets** e os limites em **Números**.

## Mercado (pesquisa nov 2026)

Comparado: sincronização de widgets, arrastar e acessibilidade do canvas contra o tldraw sync,
CRDTs, React 19 e dnd-kit.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Servidor com autoridade + mudança otimista + rebase (tldraw sync) | A ação aparece na hora para quem fez; o servidor ordena e resolve conflitos | parcial: servidor com autoridade, `revision`, `WIDGET_CONFLICT` e `operationId` (janela de 4096), sem otimismo nem rebase | código nosso | depois |
| CRDT (Yjs, Automerge) | Edição simultânea que converge sem um servidor decidir | não | dependência nova | não vale: o widget compartilhado é um estado só, decidido no servidor |
| `useOptimistic` (React 19) | Mostrar a ação antes da resposta e desfazer se o servidor recusar | não | código nosso | depois, junto com o rebase |
| Pointer Events + dnd-kit | Arrastar com mouse, toque e caneta | sim (`@dnd-kit/react` 0.5.0) | — | manter |
| Arrastar pelo teclado (`adjacentDropSlot`) | Mover widget sem mouse | sim | — | manter; testar com leitor de tela real |

**Fontes:** https://tldraw.dev/reference/sync-core/TLSyncClient ·
https://grida.co/docs/wg/research/crdt/tldraw · https://dndkit.com/guides/accessibility

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 06.1 | `docs/CANVAS.md` descreve Notas individuais com Salvar e revisão; o widget foi aposentado (o Chat o substituiu) e o servidor recusa criar notas. | doc desatualizado | alta | `docs/CANVAS.md` (~L152–154); `rooms.ts` (~L951) |
| 06.2 | `CANVAS.md` diz que o compartilhamento se escolhe depois de criar; a decisão 001 e o código decidem na criação ("Para mim" ou "Para a sala"). | doc desatualizado | alta | `docs/CANVAS.md` (~L32, ~L91); `canvas/WidgetCatalog.tsx` (~L119) |
| 06.3 | `CANVAS.md` cita `schemaVersion: 1` e a chave `vio:canvas:v1`; o código usa 2 e `vio:canvas:v2`, e ainda lê a v1. | doc desatualizado | alta | `docs/CANVAS.md` (~L59–61); `canvas/model.ts` (~L86, ~L212) |
| 06.4 | Faixa: o doc diz 2 itens abaixo de 680 px e 1 abaixo de 380 px; o código usa 3 no computador e, no modo compacto, um cálculo pela altura, sem o corte de 380 px. | doc desatualizado | média | `docs/CANVAS.md` (~L13); `canvas/RoomCanvas.tsx` (~L1210) |
| 06.5 | O doc não cita o teto de 4 chats por sala. | doc desatualizado | alta | `shared/widgets.ts` › `chatBudget` |
| 06.6 | A entrada `canvas` do registro é morta: diz "Em breve", fica fora das abas do catálogo e `createWidget` a recusa. | código morto | alta | `canvas/widgets.tsx` (~L242, ~L282) |
| 06.7 | Restos de `"notes"` no cliente depois da aposentadoria das Notas. | código morto | média | `canvas/widgets.tsx` › `createWidget`, `titleOf`; `canvas/room-content.ts` › `createContent("notes")` |
| 06.8 | Tipos aposentados (`notes`, `time`) somem em silêncio ao restaurar o canvas salvo e deixam a vaga vazia, sem aviso. | risco | média | `canvas/model.ts` › `restoreCanvas` (~L745) |
| 06.9 | O efeito que registra `engine.widgetClosed` não tem lista de dependências: registra e desfaz a cada render. Custo pequeno. | desempenho | média | `canvas/RoomCanvas.tsx` (~L525–573) |

Limites conferidos no servidor: 300 ms entre `roll` e `draw` da mesma pessoa no mesmo widget
(`server/widgets.ts` ~L246) e janela de 4096 `operationId` para descartar repetição (~L280,
~L305).

## Perguntas em aberto

- O que acontece com os widgets da sala quando quem os criou sai? `forget()` só limpa editores;
  falta ler `forget` e `leave` em `rooms.ts`.
- Qual é o gatilho de `freeMovement` na interface?
- Quais são as regras exatas de ação em `PeopleWidget`, `CamerasWidget` e `MyStreamWidget`?
- A decisão 004 foi conferida com o código só em parte.
