# design — handoff

Atualizado: 2026-10-27

## Agora

Leva 3 aprovada e especificada (PR #169). **Tarefa do copiloto em aberto** (chat trocado
por passar de 200 mil tokens; fazer tudo numa PR só, docs):

1. Criar `.claude/skills/vio-design-delivery/SKILL.md` com o formato da leva 3 (canvas
   único com seções por issue, 2–3 alternativas em tamanhos reais, seção "Escolhidas"
   no topo após o aval, coleta das escolhas, specs + issues `frontend`) **mais** o que era
   editável nas levas 1/2. Comparar os Artifacts (leva 1 3M2c9eiZF8Pp26bjBhMjAZ, leva 2
   819UwyvwKn6c5WCU1X5Hv8, leva 3 3yJ4umERzwmY3vtWfxt8hJ; ler com Artifact `read`) e
   dizer exatamente o que trazer. Se usar capacidades do Artifact (estado salvo,
   comentários), carregar a skill `artifact-capabilities` antes e documentar. Citar a
   skill em `.claude/agents/design.md` ("sempre ao entregar uma leva").
2. Escrever `docs/design/ideias-futuras.md` (curto, em tópicos, marcando **decisão** ×
   **ideia**): categorias futuras de Ajustes (Conta, Privacidade, Amizades, Assinaturas,
   Cobranças, Áudio = Voz + Saída, Aparência, Acessibilidade, Sistema/Aplicativo, Idiomas,
   Apps conectados, Desenvolvedor, Sair), várias transmissões ao mesmo tempo (seletor 1/2),
   itens de #168. Alinhar com o plano de categorias que o copiloto comentou na #168 e
   apontar divergências (ex.: Vídeo separado de Áudio; Atalhos dentro de Aplicativo).
3. Atualizar este handoff e avisar o copiloto (session_017BgdMTJWm8fV5RRbxoNbU1) em ≤ 4 linhas.
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

- "Silenciar para mim" (#107): qualquer pessoa silencia para si; "para todos" só o dono
  (#122, implementado).

- Skills do projeto: `vio-design-system` e `vio-design-review` (`.claude/skills/`).
- Destaque discreto `#A6A9FF`; volume acima de 100% em `#F2D36B`.
- Animações ≤ 800 ms, desligadas em movimento reduzido.

## Pendente / bloqueios

- Copiloto: milestone das issues #158–#168.

## Próximo passo

Aguardar a próxima leva (landing, página de download ou categorias futuras de Ajustes).
