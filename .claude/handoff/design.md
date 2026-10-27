# design — handoff

Atualizado: 2026-10-27

## Agora

Leva 3 aprovada e especificada. Nada em andamento.
Canvas leva 3: https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ (seção `#escolhidas` =
versão final; o resto são as alternativas). Leva 2:
https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8 · leva 1:
https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ. Specs em `docs/design/`.

## Feito recentemente

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

- Skills do projeto: `vio-design-system` e `vio-design-review` (`.claude/skills/`).
- Destaque discreto `#A6A9FF`; volume acima de 100% em `#F2D36B`.
- Animações ≤ 800 ms, desligadas em movimento reduzido.

## Pendente / bloqueios

- Copiloto: milestone das issues #158–#168; categorias futuras de Ajustes com o usuário.
- Confirmar com o copiloto: "Silenciar para mim" (#107).

## Próximo passo

Aguardar a próxima leva (landing, página de download ou categorias futuras de Ajustes).
