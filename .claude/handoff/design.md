# design — handoff

Atualizado: 2026-10-27 (leva 4)

## Agora

Leva 4 publicada (27 out): canvas **VIO · Leva 4** https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf,
aguardando escolhas por comentário nas pranchas (sessão assinada; comentários acordam o chat).

- #191 Compartilhar (prioridade): 191A app com miniaturas (Main.dc.html), 191B navegador.
- #195 Grade: 195A alça (recom.), 195B seleção, 195C mapa no painel; Foco: 195D miniaturas +
  fantasma, 195E arrastar à borda (sugestão D + E).
- #196 Catálogo: 196A seções sem abas (recom.), 196B abas + escolha no cartão, 196C filtros.
- #197 Landing 197A (recom.) / 197B; início do app 197C (recentes, sugestão) / 197D mínimo.

## Feito recentemente

- Skill `vio-design-delivery` (formato da leva 3 + edição das levas 1/2) e
  `docs/design/ideias-futuras.md` (categorias futuras de Ajustes, divergências com o plano da #168).
- Escolhas do usuário (27 out) viraram specs e issues `frontend`:
  - Cabeçalho − / × + Desfazer + "N não exibidos" — `cabecalho-widget.md`, #158 (+backend).
  - Widget Pessoas C, volume sempre à vista, menu só no botão direito — `widget-pessoas.md`, #159.
  - Minha transmissão A + silenciar, trocar, seletor 1/2 — `minha-transmissao.md`, #160 (+midia).
  - Tempo da sala no site, tempo da tela na tela — `tempos.md`, #161.
  - Câmeras C + B (destaque, uma na Tira, fixar; sem amassar) — `cameras.md`, #162 (+midia).
  - Ajustes em grupos com busca + Desativar áudio na doca — `ajustes.md` (reescrita), #163.
  - Avisos B no topo com barra de tempo — `notificacoes.md`, #164.
  - Adicionar widget A + B + C — `adicionar-widget.md`, #165.
  - Layout A sem Foco único + celular — `layout.md`, #166.
  - Volume: dourado, botão direito, vertical em tela cheia — `volume.md`, #167.
  - Itens novos de Ajustes, para depois — #168.
- `widgets-padrao.md` (nomes do menu) e `transmissoes.md` (etiqueta vira aviso no topo) ajustados.
- Prévia do Render inacessível pela rede do contêiner: olhar a sala com build local.

## Decisões

- "Silenciar para mim" (#107): qualquer pessoa silencia para si; "para todos" só o dono
  (#122, implementado).

- Skills do projeto: `vio-design-system`, `vio-design-review` e `vio-design-delivery`.
- Destaque discreto `#A6A9FF`; volume acima de 100% em `#F2D36B`.
- Animações ≤ 800 ms, desligadas em movimento reduzido.

## Pendente / bloqueios

- Copiloto: milestone das issues #158–#168.

## Próximo passo

Coletar escolhas da leva 4 e fechar (Escolhidas, specs, issues frontend), #191 primeiro.
Copiloto decide as divergências listadas em `ideias-futuras.md` (nome do grupo App, Atalhos).
